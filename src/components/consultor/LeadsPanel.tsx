import { useEffect, useState } from "react";
import { consultor } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { generateBRD } from "@/lib/pdf";
import type { Brand } from "@/hooks/useBrand";
import { RichTextEditor } from "@/components/RichTextEditor";
import { FileText, Inbox, Save, Download, MessageCircle, Eye, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Lead = {
  id: string; contact_name: string | null; contact_email: string | null;
  contact_whatsapp: string | null; solution_type: string | null; status: string;
  created_at: string;
  technical_solution?: string | null;
  technical_solution_updated_at?: string | null;
};
type Answer = { id: string; question_label: string; answer: string | null };

function onlyDigits(s: string | null | undefined) {
  return (s || "").replace(/\D/g, "");
}

function waLink(phone: string | null | undefined, message: string) {
  const num = onlyDigits(phone);
  const withCountry = num.length <= 11 ? `55${num}` : num;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

export function LeadsPanel({ brand }: { brand: Brand | null }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Lead | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [solution, setSolution] = useState("");
  const [savingSolution, setSavingSolution] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const refreshLeads = async () => {
    const d = await consultor.call("leads");
    setLeads(d.leads || []);
  };

  useEffect(() => {
    refreshLeads().finally(() => setLoading(false));
  }, []);

  const openLead = async (l: Lead) => {
    setActive(l);
    setSolution(l.technical_solution || "");
    const d = await consultor.call("lead-detail", { id: l.id });
    setAnswers(d.answers || []);
    if (d.lead) {
      setActive(d.lead);
      setSolution(d.lead.technical_solution || "");
    }
  };

  const saveSolution = async () => {
    if (!active) return;
    setSavingSolution(true);
    try {
      await consultor.call("update-solution", { id: active.id, technical_solution: solution });
      toast({ title: "Solução técnica salva" });
      setActive({ ...active, technical_solution: solution, technical_solution_updated_at: new Date().toISOString() });
      refreshLeads();
    } catch (e) {
      toast({ title: "Erro ao salvar", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSavingSolution(false);
    }
  };

  const downloadPdf = () => {
    if (!active) return;
    const leadForPdf = { ...active, technical_solution: solution };
    generateBRD(brand, leadForPdf, answers);
  };

  const uploadAndGetPdfUrl = async (): Promise<string | null> => {
    if (!active) return null;
    const leadForPdf = { ...active, technical_solution: solution };
    const { blob, filename } = generateBRD(brand, leadForPdf, answers, { returnBlob: true });
    if (!blob) return null;
    return await consultor.uploadBriefingPdf(active.id, blob, filename);
  };

  const sendBriefingByWhatsApp = async () => {
    if (!active) return;
    if (!active.contact_whatsapp) {
      toast({ title: "WhatsApp do lead não cadastrado", variant: "destructive" });
      return;
    }
    setUploadingPdf(true);
    try {
      const url = await uploadAndGetPdfUrl();
      if (!url) throw new Error("Falha ao gerar PDF");
      const msg = `Olá ${active.contact_name || ""}! Segue o briefing completo do nosso atendimento:\n\n${url}\n\n${brand?.nome_fantasia || "Mega Dimensão"}`;
      window.open(waLink(active.contact_whatsapp, msg), "_blank");
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploadingPdf(false);
    }
  };

  const sendSolutionByWhatsApp = async () => {
    if (!active) return;
    if (!active.contact_whatsapp) {
      toast({ title: "WhatsApp do lead não cadastrado", variant: "destructive" });
      return;
    }
    if (!solution.trim()) {
      toast({ title: "Salve uma solução técnica antes de enviar", variant: "destructive" });
      return;
    }
    // Ensure latest solution is persisted before sharing the link
    if ((active.technical_solution || "") !== solution) {
      await saveSolution();
    }
    const url = `${window.location.origin}/solucao/${active.id}`;
    const msg = `Olá ${active.contact_name || ""}! Segue a solução técnica que preparamos:\n\n${url}\n\n${brand?.nome_fantasia || "Mega Dimensão"}`;
    window.open(waLink(active.contact_whatsapp, msg), "_blank");
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
              <th className="text-left px-5 py-3 font-medium">Apontamentos</th>
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
                <td className="px-5 py-3">
                  {l.technical_solution
                    ? <Badge>Preenchidos</Badge>
                    : <span className="text-muted-foreground text-xs">—</span>}
                </td>
                <td className="px-5 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => openLead(l)}>Ver</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
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

              <Tabs defaultValue="solution" className="w-full">
                <TabsList>
                  <TabsTrigger value="solution">Solução técnica</TabsTrigger>
                  <TabsTrigger value="answers">Respostas do briefing</TabsTrigger>
                  <TabsTrigger value="share">Compartilhar</TabsTrigger>
                </TabsList>

                <TabsContent value="solution" className="mt-4 space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Apontamentos coletados na reunião. Edite quando quiser.
                    {active.technical_solution_updated_at && (
                      <> · Última atualização: {new Date(active.technical_solution_updated_at).toLocaleString("pt-BR")}</>
                    )}
                  </div>
                  <RichTextEditor value={solution} onChange={setSolution} />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={saveSolution} disabled={savingSolution}>
                      {savingSolution ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Salvar solução
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(`/solucao/${active.id}`, "_blank")}
                      disabled={!active.technical_solution}
                    >
                      <Eye className="h-4 w-4 mr-2" /> Pré-visualizar como cliente
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="answers" className="mt-4">
                  <div className="space-y-3">
                    {answers.map((a) => (
                      <div key={a.id} className="rounded-lg border border-border/60 p-4">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{a.question_label}</div>
                        <div className="text-sm whitespace-pre-wrap">{a.answer || "—"}</div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="share" className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ShareCard
                      title="Baixar BRD em PDF"
                      desc="Gera o PDF completo com identificação, respostas e a solução técnica."
                      icon={<Download className="h-4 w-4" />}
                      onClick={downloadPdf}
                      label="Baixar PDF"
                    />
                    <ShareCard
                      title="Enviar BRD por WhatsApp"
                      desc="Faz upload do PDF e abre o WhatsApp com o link pronto para o cliente."
                      icon={uploadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                      onClick={sendBriefingByWhatsApp}
                      label={uploadingPdf ? "Gerando…" : "Enviar PDF"}
                      disabled={uploadingPdf}
                    />
                    <ShareCard
                      title="Enviar solução técnica online"
                      desc="Compartilha um link público (somente leitura) com a solução formatada."
                      icon={<MessageCircle className="h-4 w-4" />}
                      onClick={sendSolutionByWhatsApp}
                      label="Enviar link"
                      disabled={!solution.trim()}
                    />
                    <ShareCard
                      title="Gerar BRD (botão clássico)"
                      desc="Apenas baixa o PDF, sem upload."
                      icon={<FileText className="h-4 w-4" />}
                      onClick={downloadPdf}
                      label="Gerar BRD"
                    />
                  </div>
                </TabsContent>
              </Tabs>
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

function ShareCard({
  title, desc, icon, onClick, label, disabled,
}: { title: string; desc: string; icon: React.ReactNode; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 flex flex-col gap-3">
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground mt-1">{desc}</div>
      </div>
      <Button onClick={onClick} disabled={disabled} className="self-start">
        {icon}<span className="ml-2">{label}</span>
      </Button>
    </div>
  );
}
