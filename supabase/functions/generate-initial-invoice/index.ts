// generate-initial-invoice
// Cria a primeira fatura imediatamente após o aceite de proposta.
// Usa service role para contornar RLS (cliente recém-cadastrado não tem role 'consultor').
// Idempotente: se já existir fatura para o contrato com period_start = hoje, retorna a existente.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Valida JWT do usuário chamador
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { contract_id } = await req.json();
    if (!contract_id || typeof contract_id !== "string") {
      return new Response(JSON.stringify({ error: "contract_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(url, serviceKey);

    // Busca contrato e valida ownership
    const { data: contract, error: cErr } = await admin
      .from("contracts")
      .select("id, client_id, status")
      .eq("id", contract_id)
      .maybeSingle();
    if (cErr || !contract) {
      return new Response(JSON.stringify({ error: "contract not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (contract.client_id !== userId) {
      // Apenas o próprio cliente do contrato pode disparar
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);

    // Idempotência
    const { data: existing } = await admin
      .from("invoices")
      .select("id")
      .eq("contract_id", contract_id)
      .eq("period_start", todayIso)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: true, invoice_id: existing.id, reused: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca itens do contrato
    const { data: items, error: iErr } = await admin
      .from("contract_items")
      .select("id, product_id, custom_name, custom_price_cents, billing_cycle, quantity, products(name, price_cents)")
      .eq("contract_id", contract_id)
      .eq("active", true);
    if (iErr) throw iErr;
    if (!items?.length) {
      return new Response(JSON.stringify({ error: "no items" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subtotal = 0;
    const invoiceItemRows: Array<{ description: string; amount_cents: number; quantity: number; contract_item_id: string }> = [];
    for (const ci of items) {
      const product = ci.products as { name?: string; price_cents?: number } | null;
      const price = ci.custom_price_cents ?? product?.price_cents ?? 0;
      const desc = ci.custom_name ?? product?.name ?? "Item";
      const qty = ci.quantity ?? 1;
      const amount = price * qty;
      subtotal += amount;
      invoiceItemRows.push({ description: desc, amount_cents: amount, quantity: qty, contract_item_id: ci.id });
    }
    if (subtotal <= 0) {
      return new Response(JSON.stringify({ error: "subtotal zero" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const periodEnd = new Date(today); periodEnd.setMonth(periodEnd.getMonth() + 1);
    const due = new Date(today); due.setDate(due.getDate() + 3);

    const { data: inv, error: invErr } = await admin.from("invoices").insert({
      client_id: contract.client_id,
      contract_id,
      status: "open",
      subtotal_cents: subtotal,
      total_cents: subtotal,
      due_date: due.toISOString().slice(0, 10),
      period_start: todayIso,
      period_end: periodEnd.toISOString().slice(0, 10),
      notes: "Fatura inicial gerada na contratação",
    }).select("id").single();
    if (invErr) throw invErr;

    await admin.from("invoice_items").insert(
      invoiceItemRows.map((r) => ({ ...r, invoice_id: inv.id }))
    );

    // Avança next_billing_at de cada item para o próximo ciclo
    for (const ci of items) {
      const cycle = ci.billing_cycle;
      const base = new Date(today);
      if (cycle === "monthly") base.setMonth(base.getMonth() + 1);
      else if (cycle === "quarterly") base.setMonth(base.getMonth() + 3);
      else if (cycle === "yearly") base.setFullYear(base.getFullYear() + 1);
      else if (cycle === "one_time") {
        await admin.from("contract_items").update({ active: false }).eq("id", ci.id);
        continue;
      }
      await admin.from("contract_items")
        .update({ next_billing_at: base.toISOString().slice(0, 10) })
        .eq("id", ci.id);
    }

    return new Response(JSON.stringify({ ok: true, invoice_id: inv.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-initial-invoice error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
