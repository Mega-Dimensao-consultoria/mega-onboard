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

    const isAuthorized = roleRow?.role === "consultor" || adminRow;

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;
    const cpanelUser = body?.cpanel_user as string;
    
    if (!cpanelUser && action !== "get_server_status") {
      return json({ error: "cpanel_user required" }, 400);
    }

    // Security check: if not authorized, user can only access their own cpanel data
    if (!isAuthorized && action !== "get_server_status") {
       const { data: profile } = await admin.from("profiles").select("cpanel_username").eq("id", actorId).maybeSingle();
       if (profile?.cpanel_username !== cpanelUser) {
         return json({ error: "Forbidden" }, 403);
       }
       
       // Restricted actions for clients
       const allowedForClients = ["get_login_link", "get_stats", "list_emails", "add_email", "delete_email", "change_email_password", "get_ssl_status"];
       if (!allowedForClients.includes(action)) {
         return json({ error: "Action not allowed for clients" }, 403);
       }
    }

    const { data: brand } = await admin.from("brand_settings").select("whm_config").maybeSingle();
    const whm = brand?.whm_config as any;

    if (!whm || !whm.host || !whm.api_token || !whm.user) {
      return json({ error: "WHM not configured" }, 400);
    }

    const baseUrl = `https://${whm.host}:${whm.port || 2087}/json-api`;
    const authString = `whm ${whm.user}:${whm.api_token}`;

    const whmCall = async (functionName: string, params: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      const response = await fetch(`${baseUrl}/${functionName}?${qs}`, {
        headers: { "Authorization": authString }
      });
      return await response.json();
    };

    // Proxy for cPanel UAPI calls via WHM
    const cpanelCall = async (module: string, func: string, params: Record<string, string> = {}) => {
      const response = await fetch(`${baseUrl}/cpanel?cpanel_jsonapi_user=${cpanelUser}&cpanel_jsonapi_module=${module}&cpanel_jsonapi_func=${func}&cpanel_jsonapi_apiversion=3&${new URLSearchParams(params).toString()}`, {
        headers: { "Authorization": authString }
      });
      return await response.json();
    };

    let result: any = null;

    switch (action) {
      case "suspend":
        result = await whmCall("suspendacct", { user: cpanelUser, reason: "Suspended by Prospekta" });
        break;
      case "unsuspend":
        result = await whmCall("unsuspendacct", { user: cpanelUser });
        break;
      case "terminate":
        result = await whmCall("removeacct", { username: cpanelUser });
        break;
      case "change_password":
        result = await whmCall("passwd", { user: cpanelUser, pass: body.password });
        break;
      case "get_login_link":
        result = await whmCall("create_temp_user_session", { user: cpanelUser, app: "cpaneld" });
        break;
      case "get_stats": {
        // Disk usage via WHM
        const summary = await whmCall("accountsummary", { user: cpanelUser });
        // Bandwidth usage via WHM
        const bw = await whmCall("showbw", { search: cpanelUser, searchtype: "user" });
        result = { summary, bandwidth: bw };
        break;
      }
      case "list_emails":
        result = await cpanelCall("Email", "list_pops");
        break;
      case "add_email":
        result = await cpanelCall("Email", "add_pop", {
          email: body.email_user,
          password: body.email_password,
          quota: body.quota || "0", // 0 is unlimited
          domain: body.domain
        });
        break;
      case "delete_email":
        result = await cpanelCall("Email", "del_pop", {
          email: body.email_user,
          domain: body.domain
        });
        break;
      case "change_email_password":
        result = await cpanelCall("Email", "passwd_pop", {
          email: body.email_user,
          password: body.email_password,
          domain: body.domain
        });
        break;
      case "get_ssl_status":
        result = await cpanelCall("SSL", "get_ssl_status");
        break;
      case "create_account": {
        if (!isAuthorized) return json({ error: "Unauthorized" }, 403);
        result = await whmCall("createacct", {
          username: cpanelUser,
          domain: body.domain,
          plan: body.plan, // WHM Package name
          contactemail: body.contact_email,
          password: body.password || Math.random().toString(36).slice(-10) + "A1!"
        });
        break;
      }
      case "get_server_status": {
        if (!isAuthorized) return json({ error: "Unauthorized" }, 403);
        const load = await whmCall("get_server_load", {});
        const info = await whmCall("get_server_information", {});
        result = { load, info };
        break;
      }
      default:
        return json({ error: "Invalid action" }, 400);
    }

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