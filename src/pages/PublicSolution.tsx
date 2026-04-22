import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BrandHeader } from "@/components/BrandHeader";
import { useBrand } from "@/hooks/useBrand";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Package } from "lucide-react";
import { fmtDateTime, fmtMoney, cycleLabel } from "@/lib/format";

type LeadPublic = {
  id: string;
  contact_name: string | null;
  solution_type: string | null;
  technical_solution: string | null;
  technical_solution_updated_at: string | null;
  created_at: string;
};

type ProposedItem = {
  id: string;
  product_id: string | null;
  custom_name: string | null;
  custom_price_cents: number | null;
  billing_cycle: string;
  quantity: number;
  products?: { name: string; price_cents: number } | null;
};

export default function PublicSolution() {
  const { id } = useParams();
  const { brand } = useBrand();
  const { user } = useAuth();
  const [lead, setLead] = useState<LeadPublic | null>(null);
  const [items, setItems] = useState<ProposedItem[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_public_proposal", { _lead_id: id });
      const rows = (data as Array<Record<string, unknown>> | null) || [];
      if (error || rows.length === 0) {
        setError("Solução não disponível.");
      } else {
        const first = rows[0];
        setLead({
          id: first.lead_id as string,
          contact_name: (first.contact_name as string | null) ?? null,
          solution_type: (first.solution_type as string | null) ?? null,
          technical_solution: (first.technical_solution as string | null) ?? null,
          technical_solution_updated_at: (first.technical_solution_updated_at as string | null) ?? null,
          created_at: first.lead_created_at as string,
        });
        setAccepted(!!first.accepted);
        const its: ProposedItem[] = rows
          .filter((r) => r.item_id)
          .map((r) => ({
            id: r.item_id as string,
            product_id: (r.product_id as string | null) ?? null,
            custom_name: (r.custom_name as string | null) ?? null,
            custom_price_cents: (r.custom_price_cents as number | null) ?? null,
            billing_cycle: r.billing_cycle as string,
            quantity: r.quantity as number,
            products: r.product_name
              ? { name: r.product_name as string, price_cents: r.product_price_cents as number }
              : null,
          }));
        setItems(its);
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

        {items.length > 0 && (() => {
          const lines = items.map((it) => {
            const name = it.product_id ? (it.products?.name || "Item") : (it.custom_name || "Item");
            const price = it.product_id ? (it.products?.price_cents || 0) : (it.custom_price_cents || 0);
            return { name, price, cycle: it.billing_cycle, quantity: it.quantity, total: price * it.quantity };
          });
          const total = lines.reduce((s, l) => s + l.total, 0);
          return (
            <div className="mt-8 rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-primary" />
                <h2 className="font-display text-2xl">Investimento</h2>
              </div>
              <div className="space-y-3">
                {lines.map((l, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-border/40 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{l.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {fmtMoney(l.price)} · {cycleLabel[l.cycle] || l.cycle}
                        {l.quantity > 1 && ` · ${l.quantity}x`}
                      </div>
                    </div>
                    <div className="font-semibold tabular-nums">{fmtMoney(l.total)}</div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3 border-t-2 border-primary/20">
                  <span className="text-sm uppercase tracking-wider text-muted-foreground">Total</span>
                  <span className="font-display text-3xl text-primary">{fmtMoney(total)}</span>
                </div>
              </div>
            </div>
          );
        })()}

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
