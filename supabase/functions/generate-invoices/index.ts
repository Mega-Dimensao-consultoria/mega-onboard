// generate-invoices: edge function chamada por pg_cron diariamente.
// - Gera faturas mensais para contract_items ativos cujo next_billing_at <= hoje
// - Marca faturas vencidas (overdue) e dispara lembretes (3d antes / dia D / em atraso)
// - Envia email "invoice-created" para cada nova fatura
//
// Auth: verify_jwt = false. Protegida via secret CRON_SECRET no header x-cron-secret
// (configurada via Vault no pg_cron) — chamadas externas são rejeitadas.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function fmtMoney(cents: number) {
  return ((cents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("pt-BR");
}
function addCycle(d: Date, cycle: string): Date {
  const r = new Date(d);
  if (cycle === "monthly") r.setMonth(r.getMonth() + 1);
  else if (cycle === "quarterly") r.setMonth(r.getMonth() + 3);
  else if (cycle === "yearly") r.setFullYear(r.getFullYear() + 1);
  return r;
}
function diffDays(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, key);

  // Auth: aceitamos tanto CRON_SECRET (env) quanto o segredo do vault
  // 'invoice_cron_secret'. Isso garante que o pg_cron — que lê do vault —
  // funcione mesmo se o env CRON_SECRET não estiver sincronizado.
  const provided = req.headers.get("x-cron-secret") ?? "";
  const envSecret = Deno.env.get("CRON_SECRET") ?? "";
  let authorized = envSecret.length > 0 && provided === envSecret;
  if (!authorized && provided.length > 0) {
    const { data: vaultRow } = await supabase
      .schema("vault" as any)
      .from("decrypted_secrets")
      .select("decrypted_secret")
      .eq("name", "invoice_cron_secret")
      .maybeSingle();
    const vaultSecret = (vaultRow as any)?.decrypted_secret as string | undefined;
    if (vaultSecret && provided === vaultSecret) authorized = true;
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // "Hoje" sempre no fuso de Brasília (America/Sao_Paulo, GMT-3 sem horário de verão)
  const brtNow = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const today = new Date(Date.UTC(brtNow.getUTCFullYear(), brtNow.getUTCMonth(), brtNow.getUTCDate()));
  const todayIso = today.toISOString().slice(0, 10);

  const summary = { generated: 0, overdueMarked: 0, remindersSent: 0, errors: [] as string[] };

  // ============= 1. Gerar faturas para itens vencidos =============
  const { data: items, error: itemsErr } = await supabase
    .from("contract_items")
    .select("*, contracts!inner(id, client_id, status), products(name, price_cents)")
    .eq("active", true)
    .lte("next_billing_at", todayIso);

  if (itemsErr) summary.errors.push(`items: ${itemsErr.message}`);

  // Agrupar por contrato
  const byContract = new Map<string, any[]>();
  for (const it of items ?? []) {
    if (it.contracts?.status !== "active") continue;
    if (!byContract.has(it.contract_id)) byContract.set(it.contract_id, []);
    byContract.get(it.contract_id)!.push(it);
  }

  for (const [contractId, group] of byContract) {
    try {
      const clientId = group[0].contracts.client_id;
      const periodStart = todayIso;
      const periodEnd = new Date(today); periodEnd.setMonth(periodEnd.getMonth() + 1);
      const due = new Date(today); due.setDate(due.getDate() + 7);
      const dueIso = due.toISOString().slice(0, 10);

      // Idempotência: existe fatura "open" para este contrato com period_start = hoje?
      const { data: existing } = await supabase
        .from("invoices")
        .select("id")
        .eq("contract_id", contractId)
        .eq("period_start", periodStart)
        .maybeSingle();
      if (existing) continue;

      // Calcular total
      let subtotal = 0;
      const itemRows: any[] = [];
      for (const it of group) {
        const price = it.custom_price_cents ?? it.products?.price_cents ?? 0;
        const desc = it.custom_name ?? it.products?.name ?? "Item";
        const amount = price * (it.quantity ?? 1);
        subtotal += amount;
        itemRows.push({ description: desc, amount_cents: amount, quantity: it.quantity ?? 1, contract_item_id: it.id });
      }

      const { data: inv, error: invErr } = await supabase
        .from("invoices")
        .insert({
          client_id: clientId,
          contract_id: contractId,
          status: "open",
          subtotal_cents: subtotal,
          total_cents: subtotal,
          due_date: dueIso,
          period_start: periodStart,
          period_end: periodEnd.toISOString().slice(0, 10),
        })
        .select("id")
        .single();
      if (invErr) throw invErr;

      // Itens
      await supabase.from("invoice_items").insert(
        itemRows.map((r) => ({ ...r, invoice_id: inv.id }))
      );

      // Avança next_billing_at de cada item
      for (const it of group) {
        const next = addCycle(new Date(it.next_billing_at ?? today), it.billing_cycle);
        await supabase.from("contract_items").update({ next_billing_at: next.toISOString().slice(0, 10) }).eq("id", it.id);
      }

      summary.generated++;

      // Buscar email do cliente
      const { data: prof } = await supabase.from("profiles").select("email, full_name").eq("id", clientId).maybeSingle();
      if (prof?.email) {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "invoice-created",
            recipientEmail: prof.email,
            idempotencyKey: `invoice-created-${inv.id}`,
            templateData: {
              name: prof.full_name,
              amount: fmtMoney(subtotal),
              dueDate: fmtDate(due),
              period: `${fmtDate(today)} a ${fmtDate(periodEnd)}`,
              invoiceUrl: `https://prospekta.megadimensao.com.br/cliente/faturas/${inv.id}`,
            },
          },
        });
      }
    } catch (e) {
      summary.errors.push(`contract ${contractId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ============= 2. Marcar overdue + enviar lembretes =============
  const { data: openInvoices } = await supabase
    .from("invoices")
    .select("id, client_id, total_cents, due_date, status")
    .in("status", ["open", "overdue"]);

  for (const inv of openInvoices ?? []) {
    try {
      const due = new Date(inv.due_date);
      due.setHours(0, 0, 0, 0);
      const days = diffDays(due, today); // positivo = futuro, negativo = atraso

      // Marcar overdue
      if (days < 0 && inv.status !== "overdue") {
        await supabase.from("invoices").update({ status: "overdue" }).eq("id", inv.id);
        summary.overdueMarked++;
      }

      // Enviar lembrete em D-3, D, D+1, D+7 (idempotente via key)
      const triggerDays = [3, 0, -1, -7];
      if (!triggerDays.includes(days)) continue;

      const { data: prof } = await supabase.from("profiles").select("email, full_name").eq("id", inv.client_id).maybeSingle();
      if (!prof?.email) continue;

      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "invoice-reminder",
          recipientEmail: prof.email,
          idempotencyKey: `invoice-reminder-${inv.id}-d${days}`,
          templateData: {
            name: prof.full_name,
            amount: fmtMoney(inv.total_cents),
            dueDate: fmtDate(due),
            daysUntilDue: Math.max(days, 0),
            overdue: days < 0,
            invoiceUrl: `https://prospekta.megadimensao.com.br/cliente/faturas/${inv.id}`,
          },
        },
      });
      summary.remindersSent++;
    } catch (e) {
      summary.errors.push(`reminder ${inv.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return new Response(JSON.stringify({ ok: true, ...summary, ranAt: new Date().toISOString() }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
