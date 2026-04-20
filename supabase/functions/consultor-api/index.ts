import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-consultor-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CONSULTANT_PASSWORD = Deno.env.get("CONSULTANT_PASSWORD") || "";
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// --- HMAC token helpers (sign timestamp; password never embedded) ---
async function hmacKey(): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(CONSULTANT_PASSWORD),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function b64url(bytes: ArrayBuffer): string {
  const b = btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function makeToken(): Promise<string> {
  const ts = Date.now().toString();
  const key = await hmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ts));
  return `${ts}.${b64url(sig)}`;
}

async function verifyToken(token: string | null): Promise<boolean> {
  if (!token || !CONSULTANT_PASSWORD) return false;
  try {
    const [tsStr, sig] = token.split(".");
    if (!tsStr || !sig) return false;
    const ts = parseInt(tsStr, 10);
    if (!Number.isFinite(ts)) return false;
    if (Date.now() - ts > TOKEN_TTL_MS) return false;
    const key = await hmacKey();
    const expected = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(tsStr));
    return b64url(expected) === sig;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const url = new URL(req.url);
  const action = url.pathname.split("/").filter(Boolean).pop();

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // upload-logo uses multipart, handle separately
    const isMultipart = (req.headers.get("content-type") || "").includes("multipart/form-data");
    const body: Record<string, unknown> = !isMultipart && req.method === "POST"
      ? await req.json().catch(() => ({}))
      : {};

    if (action === "login") {
      const pw = String(body.password ?? "");
      if (!CONSULTANT_PASSWORD) return json({ error: "Senha não configurada" }, 500);
      if (pw !== CONSULTANT_PASSWORD) return json({ error: "Senha incorreta" }, 401);
      return json({ token: await makeToken() });
    }

    // Public action: read-only technical solution by lead id (for client link)
    if (action === "public-solution") {
      const id = String(body.id ?? "");
      if (!id) return json({ error: "id ausente" }, 400);
      const { data: lead } = await supabase
        .from("leads")
        .select("id, contact_name, solution_type, technical_solution, technical_solution_updated_at, created_at")
        .eq("id", id)
        .maybeSingle();
      if (!lead || !lead.technical_solution) return json({ error: "Solução não disponível" }, 404);
      const { data: brand } = await supabase.from("brand_settings").select("*").limit(1).maybeSingle();
      return json({ lead, brand });
    }

    // All other actions require token
    const token = req.headers.get("x-consultor-token");
    if (!(await verifyToken(token))) return json({ error: "Não autorizado" }, 401);

    if (action === "verify") return json({ ok: true });

    if (action === "upload-logo") {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return json({ error: "Arquivo ausente" }, 400);
      if (file.size > 5 * 1024 * 1024) return json({ error: "Arquivo muito grande (máx 5MB)" }, 400);
      if (!file.type.startsWith("image/")) return json({ error: "Apenas imagens" }, 400);
      const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("brand-assets")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) {
        console.error("upload error", upErr);
        return json({ error: "Falha no upload" }, 500);
      }
      const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
      return json({ url: data.publicUrl });
    }

    if (action === "upload-briefing-pdf") {
      const form = await req.formData();
      const file = form.get("file");
      const leadId = String(form.get("lead_id") ?? "");
      if (!(file instanceof File)) return json({ error: "Arquivo ausente" }, 400);
      if (!leadId) return json({ error: "lead_id ausente" }, 400);
      if (file.size > 10 * 1024 * 1024) return json({ error: "PDF muito grande (máx 10MB)" }, 400);
      const path = `${leadId}/BRD-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("briefings")
        .upload(path, file, { upsert: true, contentType: "application/pdf" });
      if (upErr) {
        console.error("upload pdf error", upErr);
        return json({ error: "Falha no upload do PDF" }, 500);
      }
      const { data } = supabase.storage.from("briefings").getPublicUrl(path);
      return json({ url: data.publicUrl });
    }

    if (action === "update-solution") {
      const id = String(body.id ?? "");
      const html = typeof body.technical_solution === "string" ? body.technical_solution : "";
      if (!id) return json({ error: "id ausente" }, 400);
      const { error } = await supabase.from("leads").update({
        technical_solution: html,
        technical_solution_updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
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

    if (action === "delete-lead") {
      const id = String(body.id ?? "");
      if (!id) return json({ error: "id ausente" }, 400);
      // Remove arquivos do briefing no storage (pasta com o id do lead)
      try {
        const { data: files } = await supabase.storage.from("briefings").list(id);
        if (files && files.length > 0) {
          await supabase.storage.from("briefings").remove(files.map((f) => `${id}/${f.name}`));
        }
      } catch (e) {
        console.error("erro ao limpar storage do lead", e);
      }
      const { error: ansErr } = await supabase.from("lead_answers").delete().eq("lead_id", id);
      if (ansErr) throw ansErr;
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      return json({ ok: true });
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
      const q = body.question as Record<string, unknown> & { id?: string };
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

    if (action === "reorder-questions") {
      const items = (body.items as { id: string; step: number; order_index: number }[]) || [];
      for (const it of items) {
        const { error } = await supabase.from("form_questions")
          .update({ step: it.step, order_index: it.order_index, updated_at: new Date().toISOString() })
          .eq("id", it.id);
        if (error) throw error;
      }
      return json({ ok: true });
    }

    if (action === "save-brand") {
      const b = body.brand as Record<string, unknown>;
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
    console.error("consultor-api error:", e);
    return json({ error: "Erro interno" }, 500);
  }
});
