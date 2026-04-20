import { useEffect, useState } from "react";
import { consultor } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { generateBRD } from "@/lib/pdf";
import type { Brand } from "@/hooks/useBrand";
import { FileText, Inbox } from "lucide-react";

type Lead = {
  id: string; contact_name: string | null; contact_email: string | null;
  contact_whatsapp: string | null; solution_type: string | null; status: string;
  created_at: string;
};
type Answer = { id: string; question_label: string; answer: string | null };

export function LeadsPanel({ brand }: { brand: Brand | null }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Lead | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);

  useEffect(() => {
    consultor.call("leads").then((d) => { setLeads(d.leads || []); setLoading(false); });
  }, []);

  const openLead = async (l: Lead) => {
    setActive(l);
    const d = await consultor.call("lead-detail", { id: l.id });
    setAnswers(d.answers || []);
  };

  if (loading) return <div className="text-muted-foreground">Carregando leads...</div>;

  if (leads.length === 0) {
    return (
      <div className="text-center py-20 bg-card rounded-2xl border border-border/60">
        <Inbox className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Nenhum lead recebido ainda.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Contato</th>
              <th className="text-left px-5 py-3 font-medium">Solução</th>
              <th className="text-left px-5 py-3 font-medium">E-mail</th>
              <th className="text-left px-5 py-3 font-medium">WhatsApp</th>
              <th className="text-left px-5 py-3 font-medium">Recebido</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-t border-border/50 hover:bg-secondary/30 transition">
                <td className="px-5 py-3 font-medium">{l.contact_name || "—"}</td>
                <td className="px-5 py-3">{l.solution_type ? <Badge variant="secondary">{l.solution_type}</Badge> : "—"}</td>
                <td className="px-5 py-3 text-muted-foreground">{l.contact_email || "—"}</td>
                <td className="px-5 py-3 text-muted-foreground">{l.contact_whatsapp || "—"}</td>
                <td className="px-5 py-3 text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                <td className="px-5 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => openLead(l)}>Ver</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">{active?.contact_name || "Lead"}</SheetTitle>
          </SheetHeader>
          {active && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="E-mail" value={active.contact_email} />
                <Info label="WhatsApp" value={active.contact_whatsapp} />
                <Info label="Solução" value={active.solution_type} />
                <Info label="Recebido" value={new Date(active.created_at).toLocaleString("pt-BR")} />
              </div>

              <Button onClick={() => generateBRD(brand, active, answers)} className="w-full">
                <FileText className="h-4 w-4 mr-2" /> Gerar BRD em PDF
              </Button>

              <div>
                <h3 className="font-display text-lg mb-3">Respostas</h3>
                <div className="space-y-3">
                  {answers.map((a) => (
                    <div key={a.id} className="rounded-lg border border-border/60 p-4">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{a.question_label}</div>
                      <div className="text-sm">{a.answer || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value || "—"}</div>
    </div>
  );
}
