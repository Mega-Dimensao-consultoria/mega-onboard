import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function paypalBase() {
  const env = (Deno.env.get("PAYPAL_ENV") || "sandbox").toLowerCase();
  return env === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken() {
  const id = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("PayPal credentials not configured");
  const auth = btoa(`${id}:${secret}`);
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PayPal auth failed [${res.status}]: ${t}`);
  }
  const j = await res.json();
  return j.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const supaAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supaUrl, supaAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: uerr } = await supabase.auth.getUser();
    if (uerr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const invoiceId = String(body.invoice_id || "");
    const returnUrl = String(body.return_url || "");
    const cancelUrl = String(body.cancel_url || returnUrl);
    if (!invoiceId || !returnUrl) {
      return new Response(JSON.stringify({ error: "invoice_id and return_url are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch invoice (RLS guarantees ownership)
    const { data: inv, error: ierr } = await supabase
      .from("invoices")
      .select("id, total_cents, status, client_id")
      .eq("id", invoiceId)
      .maybeSingle();
    if (ierr || !inv) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (inv.status === "paid") {
      return new Response(JSON.stringify({ error: "Invoice already paid" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount = ((inv.total_cents || 0) / 100).toFixed(2);
    const currency = "BRL";

    const accessToken = await getAccessToken();
    const orderRes = await fetch(`${paypalBase()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: inv.id,
            description: `Fatura ${inv.id.slice(0, 8).toUpperCase()}`,
            custom_id: inv.id,
            amount: { currency_code: currency, value: amount },
          },
        ],
        application_context: {
          brand_name: "Pagamento de Fatura",
          user_action: "PAY_NOW",
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      }),
    });
    const order = await orderRes.json();
    if (!orderRes.ok) {
      console.error("PayPal create order failed", order);
      return new Response(JSON.stringify({ error: "PayPal create order failed", details: order }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const approveLink = (order.links || []).find((l: { rel: string; href: string }) => l.rel === "approve")?.href;

    // Persist intent (use service role to bypass RLS for INSERT)
    const adminClient = createClient(supaUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await adminClient.from("payment_intents").insert({
      invoice_id: inv.id,
      provider: "paypal",
      provider_ref: order.id,
      status: "pending",
      raw_payload: order,
    });

    return new Response(JSON.stringify({ order_id: order.id, approve_url: approveLink }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("paypal-create-order error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
