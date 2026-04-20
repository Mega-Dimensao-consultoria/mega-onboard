import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-consultor-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CONSULTANT_PASSWORD = Deno.env.get("CONSULTANT_PASSWORD") || "";

function makeToken(): string {
  // Simple HMAC-style token: sign timestamp with password
  const ts = Date.now().toString();
  const payload = btoa(`${ts}:${CONSULTANT_PASSWORD}`);
  return payload;
}

function verifyToken(token: string | null): boolean {
  if (!token || !CONSULTANT_PASSWORD) return false;
  try {
    const decoded = atob(token);
    const [tsStr, pwd] = decoded.split(":");
    if (pwd !== CONSULTANT_PASSWORD) return false;
    const ts = parseInt(tsStr, 10);
    // 7 day expiry
    if (Date.now() - ts > 7 * 24 * 60 * 60 * 1000) return false;
    return true;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const url = new URL(req.url);
  // last path segment is the action
  const action = url.pathname.split("/").filter(Boolean).pop();

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    if (action === "login") {
      const pw = String(body.password ?? "");
      if (!CONSULTANT_PASSWORD) return json({ error: "Senha não configurada" }, 500);
      if (pw !== CONSULTANT_PASSWORD) return json({ error: "Senha incorreta" }, 401);
      return json({ token: makeToken() });
    }

    // All other actions require token
    const token = req.headers.get("x-consultor-token");
    if (!verifyToken(token)) return json({ error: "Não autorizado" }, 401);

    if (action === "verify") {
      return json({ ok: true });
    }

    if (action === "leads") {
      const { data: leads, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ leads });
    }

    if (action === "lead-detail") {
      const id = String(body.id ?? "");
      const { data: lead } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
      const { data: answers } = await supabase
        .from("lead_answers")
        .select("*")
        .eq("lead_id", id);
      return json({ lead, answers });
    }

    if (action === "save-question") {
      const q = body.question;
      if (q.id) {
        const { error } = await supabase.from("form_questions").update({
          step: q.step, step_title: q.step_title, order_index: q.order_index,
          label: q.label, field_type: q.field_type, options: q.options,
          mask: q.mask, required: q.required,
          depends_on: q.depends_on || null, depends_value: q.depends_value || null,
          updated_at: new Date().toISOString(),
        }).eq("id", q.id);
        if (error) throw error;
        return json({ ok: true });
      } else {
        const { data, error } = await supabase.from("form_questions").insert({
          step: q.step, step_title: q.step_title, order_index: q.order_index,
          label: q.label, field_type: q.field_type, options: q.options || [],
          mask: q.mask, required: q.required ?? true,
          depends_on: q.depends_on || null, depends_value: q.depends_value || null,
        }).select().single();
        if (error) throw error;
        return json({ question: data });
      }
    }

    if (action === "delete-question") {
      const { error } = await supabase.from("form_questions").delete().eq("id", body.id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "save-brand") {
      const b = body.brand;
      const { data: existing } = await supabase.from("brand_settings").select("id").limit(1).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("brand_settings").update({
          cnpj: b.cnpj, razao_social: b.razao_social, nome_fantasia: b.nome_fantasia,
          endereco: b.endereco, telefone: b.telefone, email: b.email,
          primary_color: b.primary_color, logo_url: b.logo_url,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("brand_settings").insert(b);
        if (error) throw error;
      }
      return json({ ok: true });
    }

    return json({ error: "Ação desconhecida" }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Erro" }, 500);
  }
});
