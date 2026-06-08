import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({}));
    const invoiceId = body?.invoice_id as string;
    
    if (!invoiceId) return json({ error: "invoice_id required" }, 400);

    // Get invoice details with contract items and products
    const { data: inv, error: invErr } = await admin
      .from("invoices")
      .select("*, profiles(*), contracts(id, contract_items(*, products(*)))")
      .eq("id", invoiceId)
      .maybeSingle();

    if (invErr || !inv) throw new Error("Invoice not found");

    const brand = await admin.from("brand_settings").select("*").maybeSingle();
    const brandData = brand.data;

    // 1. Auto-unsuspend if it was overdue
    if (inv.profiles.cpanel_username && brandData?.whm_auto_suspend) {
       await admin.functions.invoke("whm-integration", {
         body: { action: "unsuspend", cpanel_user: inv.profiles.cpanel_username }
       }).catch(e => console.error("Unsuspend failed", e));
    }

    // 2. Auto-provisioning
    if (brandData?.whm_auto_provision) {
      const items = inv.contracts.contract_items || [];
      const provisionItem = items.find((it: any) => it.products?.whm_package);
      
      if (provisionItem) {
        const pkg = provisionItem.products.whm_package;
        const profile = inv.profiles;
        
        // Only provision if cpanel_username is NOT set yet OR user insists
        if (!profile.cpanel_username) {
          // Generate username: first 8 chars of name or email
          let username = (profile.nome_fantasia || profile.full_name || "user").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
          if (username.length < 3) username += "host";
          
          // Check if username already exists in profiles to avoid collisions
          const { data: exists } = await admin.from("profiles").select("id").eq("cpanel_username", username).maybeSingle();
          if (exists) username += Math.floor(Math.random() * 10);

          // Update profile with the new username
          await admin.from("profiles").update({ cpanel_username: username }).eq("id", profile.id);
          
          // Call WHM to create account
          const res = await admin.functions.invoke("whm-integration", {
            body: {
              action: "create_account",
              cpanel_user: username,
              domain: profile.cpanel_domain || `${username}.prospekta.app`, // Fallback domain
              plan: pkg,
              contact_email: profile.email
            }
          });
          
          console.log("Provisioning result", res);
        }
      }
    }

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