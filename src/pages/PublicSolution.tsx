import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import { BrandHeader } from "@/components/BrandHeader";
import type { Brand } from "@/hooks/useBrand";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/consultor-api`;

type LeadPublic = {
  id: string;
  contact_name: string | null;
  solution_type: string | null;
  technical_solution: string | null;
  technical_solution_updated_at: string | null;
  created_at: string;
};

export default function PublicSolution() {
  const { id } = useParams();
  const [data, setData] = useState<{ lead: LeadPublic; brand: Brand | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`${FN_URL}/public-solution`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ id }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Erro");
        return j;
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (data?.brand?.primary_color) {
      document.documentElement.style.setProperty("--primary", data.brand.primary_color);
    }
    document.title = "Solução Técnica · Briefing";
  }, [data]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;
  }
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-3xl mb-2">Solução não disponível</h1>
          <p className="text-muted-foreground">{error || "Conteúdo não encontrado."}</p>
        </div>
      </div>
    );
  }

  const { lead, brand } = data;
  const safeHtml = useMemo(
    () =>
      DOMPurify.sanitize(lead.technical_solution || "", {
        FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
        FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "formaction"],
      }),
    [lead.technical_solution],
  );
  return (
    <div className="min-h-screen flex flex-col bg-secondary/20">
      <BrandHeader />
      <main className="flex-1 container max-w-3xl py-10">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          {brand?.nome_fantasia || "Mega Dimensão"} · Briefing
        </div>
        <h1 className="font-display text-4xl mt-1">Solução Técnica Apresentada</h1>
        <p className="text-muted-foreground mt-2">
          Para {lead.contact_name || "—"}
          {lead.solution_type ? ` · ${lead.solution_type}` : ""}
        </p>
        {lead.technical_solution_updated_at && (
          <p className="text-xs text-muted-foreground mt-1">
            Atualizado em {new Date(lead.technical_solution_updated_at).toLocaleString("pt-BR")}
          </p>
        )}

        <article
          className="prose prose-sm sm:prose max-w-none mt-8 bg-card border border-border/60 rounded-2xl p-6 sm:p-8
            prose-headings:font-display prose-headings:text-foreground
            prose-p:text-foreground prose-strong:text-foreground prose-a:text-primary
            prose-li:text-foreground"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      </main>
    </div>
  );
}
