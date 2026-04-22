// Edge function pública: retorna o IP do cliente (extraído do header).
// Usada no aceite de proposta para registrar o IP no contrato.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const xff = req.headers.get("x-forwarded-for") || "";
  const real = req.headers.get("x-real-ip") || "";
  const cfip = req.headers.get("cf-connecting-ip") || "";
  const ip = (cfip || xff.split(",")[0] || real || "").trim() || null;
  return new Response(JSON.stringify({ ip }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
