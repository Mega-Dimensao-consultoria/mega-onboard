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
    
    // Check if user is consultor or admin
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", actorId).maybeSingle();
    
    const { data: adminRow } = await admin
      .from("admins").select("user_id").eq("user_id", actorId).maybeSingle();

    if (roleRow?.role !== "consultor" && !adminRow) {
      return json({ error: "Forbidden" }, 403);
    }

    const { data: brand } = await admin.from("brand_settings").select("whm_config").maybeSingle();
    const whm = brand?.whm_config as any;

    if (!whm || !whm.host || !whm.api_token || !whm.user) {
      return json({ error: "WHM not configured" }, 400);
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as "suspend" | "unsuspend" | "terminate" | "change_password";
    const cpanelUser = body?.cpanel_user as string;
    
    if (!cpanelUser) return json({ error: "cpanel_user required" }, 400);

    const baseUrl = `https://${whm.host}:${whm.port || 2087}/json-api`;
    const headers = {
      "Authorization": `whm ${whm.user}:${whm.api_token}`,
    };

    let endpoint = "";
    const params = new URLSearchParams();
    params.append("user", cpanelUser);

    if (action === "suspend") {
      endpoint = "suspendacct";
      params.append("reason", "Suspended by Prospekta");
    } else if (action === "unsuspend") {
      endpoint = "unsuspendacct";
    } else if (action === "terminate") {
      endpoint = "removeacct";
      params.append("username", cpanelUser);
    } else if (action === "change_password") {
      endpoint = "passwd";
      if (!body.password) return json({ error: "password required" }, 400);
      params.append("pass", body.password);
    } else {
      return json({ error: "Invalid action" }, 400);
    }

    const response = await fetch(`${baseUrl}/${endpoint}?${params.toString()}`, { headers });
    const result = await response.json();

    return json({ ok: true, result });
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