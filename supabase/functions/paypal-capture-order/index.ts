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
  if (!res.ok) throw new Error(`PayPal auth failed [${res.status}]`);
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
    const orderId = String(body.order_id || "");
    const invoiceId = String(body.invoice_id || "");
    if (!orderId || !invoiceId) {
      return new Response(JSON.stringify({ error: "order_id and invoice_id are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership via RLS
    const { data: inv } = await supabase
      .from("invoices")
      .select("id, total_cents, status, client_id")
      .eq("id", invoiceId)
      .maybeSingle();
    if (!inv) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (inv.status === "paid") {
      return new Response(JSON.stringify({ ok: true, already_paid: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken();
    const capRes = await fetch(`${paypalBase()}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    const cap = await capRes.json();
    if (!capRes.ok) {
      // If already captured, PayPal returns 422 ORDER_ALREADY_CAPTURED — treat as success
      const alreadyCaptured = (cap?.details || []).some((d: { issue?: string }) => d.issue === "ORDER_ALREADY_CAPTURED");
      if (!alreadyCaptured) {
        console.error("PayPal capture failed", cap);
        return new Response(JSON.stringify({ error: "PayPal capture failed", details: cap }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const status = cap?.status || "COMPLETED";
    const isCompleted = status === "COMPLETED" || (cap?.purchase_units?.[0]?.payments?.captures?.[0]?.status === "COMPLETED");

    const adminClient = createClient(supaUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (isCompleted) {
      await adminClient.from("invoices").update({
        status: "paid",
        payment_method: "paypal",
        paid_at: new Date().toISOString(),
        notes: `Pago via PayPal (order ${orderId})`,
      }).eq("id", inv.id);

      await adminClient.from("payment_intents")
        .update({ status: "paid", raw_payload: cap })
        .eq("provider_ref", orderId);
    } else {
      await adminClient.from("payment_intents")
        .update({ status: status.toLowerCase(), raw_payload: cap })
        .eq("provider_ref", orderId);
    }

    return new Response(JSON.stringify({ ok: true, status, completed: isCompleted }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("paypal-capture-order error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
