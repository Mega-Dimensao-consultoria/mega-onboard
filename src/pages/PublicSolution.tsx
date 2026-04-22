import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BrandHeader } from "@/components/BrandHeader";
import { useBrand } from "@/hooks/useBrand";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { fmtDateTime } from "@/lib/format";

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
  const { brand } = useBrand();
  const { user } = useAuth();
  const [lead, setLead] = useState<LeadPublic | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, contact_name, solution_type, technical_solution, technical_solution_updated_at, created_at, status")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        setError("Solução não disponível.");
      } else {
        setLead(data as LeadPublic);
        // já existe contrato vinculado?
        const { data: c } = await supabase.from("contracts").select("id").eq("lead_id", id).maybeSingle();
        setAccepted(!!c);
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => { document.title = "Solução Técnica · Briefing"; }, []);

  const safeHtml = useMemo(
    () =>
      DOMPurify.sanitize(lead?.technical_solution || "", {
        FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
        FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "formaction"],
      }),
    [lead?.technical_solution],
  );

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;
  }
  if (error || !lead) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-3xl mb-2">Solução não disponível</h1>
          <p className="text-muted-foreground">{error || "Conteúdo não encontrado."}</p>
        </div>
      </div>
    );
  }

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
            Atualizado em {fmtDateTime(lead.technical_solution_updated_at)}
          </p>
        )}

        <article
          className="prose prose-sm sm:prose max-w-none mt-8 bg-card border border-border/60 rounded-2xl p-6 sm:p-8
            prose-headings:font-display prose-headings:text-foreground
            prose-p:text-foreground prose-strong:text-foreground prose-a:text-primary
            prose-li:text-foreground"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />

        <div className="mt-8 rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-elegant">
          {accepted ? (
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-8 w-8 text-primary shrink-0" />
              <div>
                <h2 className="font-display text-xl">Proposta já aceita</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Esta proposta já foi formalizada. {user ? "Acesse sua área para acompanhar." : "Entre na sua conta para acompanhar contratos e faturas."}
                </p>
                <div className="mt-4">
                  <Button asChild>
                    <Link to={user ? "/cliente" : "/auth"}>Ir para área do cliente <ArrowRight className="h-4 w-4 ml-2" /></Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl">Pronto para começar?</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Aceite a proposta para criar sua conta e começar a acompanhar contratos, faturas e projetos pela área do cliente.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to={`/solucao/${lead.id}/aceite`}>Aceitar proposta <ArrowRight className="h-4 w-4 ml-2" /></Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
