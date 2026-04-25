// trigger-generate-invoices
// Permite que um consultor dispare manualmente o ciclo de geração de faturas
// (mesma lógica do cron generate-invoices), caso o cron falhe ou para forçar uma execução.
// Valida JWT e role 'consultor' antes de invocar a function protegida com CRON_SECRET.

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
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Valida usuário
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Valida role consultor via service role (não confia em RLS aqui)
    const admin = createClient(url, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "consultor")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tenta resolver o secret a partir do env; se vazio, usa o do vault
    let secret = cronSecret;
    if (!secret) {
      const { data: vaultRow } = await admin
        .schema("vault" as any)
        .from("decrypted_secrets")
        .select("decrypted_secret")
        .eq("name", "invoice_cron_secret")
        .maybeSingle();
      secret = ((vaultRow as any)?.decrypted_secret as string | undefined) ?? "";
    }
    if (!secret) {
      return new Response(JSON.stringify({ error: "cron secret not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Invoca generate-invoices via HTTP direto, repassando o x-cron-secret
    const fnUrl = `${url}/functions/v1/generate-invoices`;
    const res = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "x-cron-secret": secret,
      },
      body: JSON.stringify({ triggered_by: userData.user.id, manual: true }),
    });
    const body = await res.text();
    let parsed: unknown;
    try { parsed = JSON.parse(body); } catch { parsed = { raw: body }; }

    // Audit log
    await admin.from("audit_log").insert([{
      actor_user_id: userData.user.id,
      action: "manual_generate_invoices",
      target_type: "system",
      metadata: { status: res.status, result: parsed },
    }]);

    return new Response(JSON.stringify({ ok: res.ok, status: res.status, result: parsed }), {
      status: res.ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("trigger-generate-invoices error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
