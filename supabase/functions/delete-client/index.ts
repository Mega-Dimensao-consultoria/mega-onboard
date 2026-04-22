// Edge function: exclusão master de cliente.
// Apenas usuários com role "consultor" podem invocar.
// Remove dados relacionados (contratos, faturas, itens, papéis, perfil) e o usuário do auth.
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

    // Identifica o chamador
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Invalid token" }, 401);
    const actorId = userData.user.id;

    // Verifica papel consultor
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", actorId).eq("role", "consultor").maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const clientId = body?.client_id as string | undefined;
    if (!clientId) return json({ error: "client_id required" }, 400);
    if (clientId === actorId) return json({ error: "Não é possível excluir você mesmo" }, 400);

    // Busca contratos do cliente
    const { data: contracts } = await admin.from("contracts").select("id").eq("client_id", clientId);
    const contractIds = (contracts || []).map((c) => c.id);

    // Busca faturas do cliente
    const { data: invoices } = await admin.from("invoices").select("id").eq("client_id", clientId);
    const invoiceIds = (invoices || []).map((i) => i.id);

    // Apaga em cascata (ordem importa)
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

    // Audit
    await admin.from("audit_log").insert([{
      actor_user_id: actorId,
      action: "client_deleted",
      target_type: "client",
      target_id: clientId,
      metadata: { contracts: contractIds.length, invoices: invoiceIds.length },
    }]);

    // Remove do auth (best-effort)
    const { error: delErr } = await admin.auth.admin.deleteUser(clientId);
    if (delErr) console.warn("auth.deleteUser error", delErr.message);

    return json({ ok: true });
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
