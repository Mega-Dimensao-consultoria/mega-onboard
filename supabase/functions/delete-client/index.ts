// Edge function: exclusão master de cliente.
// Apenas usuários com role "consultor" podem invocar.
// Remove dados relacionados (contratos, faturas, itens, papéis, perfil) e o usuário do auth.
// Antes de excluir, captura email/nome do cliente para envio de notificação.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Invalid token" }, 401);
    const actorId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", actorId).eq("role", "consultor").maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const clientId = body?.client_id as string | undefined;
    if (!clientId) return json({ error: "client_id required" }, 400);
    if (clientId === actorId) return json({ error: "Não é possível excluir você mesmo" }, 400);

    // Captura dados do cliente ANTES de excluir, para o email
    const { data: profile } = await admin
      .from("profiles").select("email, full_name, nome_fantasia").eq("id", clientId).maybeSingle();
    const clientEmail = profile?.email || null;
    const clientName = profile?.nome_fantasia || profile?.full_name || null;

    const { data: contracts } = await admin.from("contracts").select("id").eq("client_id", clientId);
    const contractIds = (contracts || []).map((c) => c.id);

    const { data: invoices } = await admin.from("invoices").select("id").eq("client_id", clientId);
    const invoiceIds = (invoices || []).map((i) => i.id);

    if (invoiceIds.length) {
      await admin.from("payment_intents").delete().in("invoice_id", invoiceIds);
      await admin.from("invoice_items").delete().in("invoice_id", invoiceIds);
    }
    await admin.from("invoices").delete().eq("client_id", clientId);

    if (contractIds.length) {
      await admin.from("contract_items").delete().in("contract_id", contractIds);
    }
    await admin.from("contracts").delete().eq("client_id", clientId);

    await admin.from("user_roles").delete().eq("user_id", clientId);
    await admin.from("profiles").delete().eq("id", clientId);

    await admin.from("audit_log").insert([{
      actor_user_id: actorId,
      action: "client_deleted",
      target_type: "client",
      target_id: clientId,
      metadata: {
        contracts: contractIds.length,
        invoices: invoiceIds.length,
        email: clientEmail,
        name: clientName,
      },
    }]);

    const { error: delErr } = await admin.auth.admin.deleteUser(clientId);
    if (delErr) console.warn("auth.deleteUser error", delErr.message);

    // Envia email de notificação ao cliente (best-effort)
    if (clientEmail) {
      try {
        await admin.functions.invoke("send-transactional-email", {
          body: {
            templateName: "client-deleted",
            recipientEmail: clientEmail,
            idempotencyKey: `client-deleted-${clientId}`,
            templateData: {
              name: clientName,
              contractsCount: contractIds.length,
              invoicesCount: invoiceIds.length,
            },
          },
        });
      } catch (e) {
        console.warn("send-transactional-email error", e);
      }
    }

    return json({
      ok: true,
      deleted: { contracts: contractIds.length, invoices: invoiceIds.length },
      emailSentTo: clientEmail,
    });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
