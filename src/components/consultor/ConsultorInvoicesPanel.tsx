import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBrand } from "@/hooks/useBrand";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtMoney, fmtDate, invoiceStatusLabel, waLink, buildInvoiceCreatedMessage, buildInvoiceReminderMessage, buildInvoicePaidMessage } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { Receipt, ExternalLink, CheckCircle2, MessageCircle, Mail, Bell, RefreshCw } from "lucide-react";

type Invoice = {
  id: string; client_id: string; total_cents: number; status: string;
  due_date: string; period_start: string | null; period_end: string | null;
  payment_method: string | null; paid_at: string | null; payment_proof_url: string | null;
  created_at: string;
};
type Profile = { id: string; full_name: string | null; nome_fantasia: string | null; email: string | null; telefone: string | null };

export function ConsultorInvoicesPanel() {
  const { brand } = useBrand();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [filter, setFilter] = useState<"all" | "open" | "overdue" | "paid">("all");
  const [active, setActive] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const triggerGenerate = async () => {
    if (!confirm("Disparar geração de faturas agora? Será gerada uma fatura para cada item de contrato vencido hoje, e enviados lembretes pendentes.")) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("trigger-generate-invoices", { body: {} });
      if (error) throw error;
      const r = (data as { result?: { generated?: number; overdueMarked?: number; remindersSent?: number; errors?: string[] } } | null)?.result;
      const generated = r?.generated ?? 0;
      const overdue = r?.overdueMarked ?? 0;
      const reminders = r?.remindersSent ?? 0;
      const errs = r?.errors?.length ?? 0;
      toast({
        title: "Geração concluída",
        description: `${generated} fatura(s) gerada(s), ${overdue} marcada(s) como vencida(s), ${reminders} lembrete(s) enviado(s)${errs ? ` · ${errs} erro(s)` : ""}.`,
      });
      await refresh();
    } catch (e) {
      toast({ title: "Falha ao gerar faturas", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const refresh = async () => {
    const { data } = await supabase.from("invoices").select("*").order("due_date", { ascending: false });
    setInvoices((data as Invoice[]) || []);
    const ids = [...new Set((data || []).map((i: Invoice) => i.client_id))];
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, full_name, nome_fantasia, email, telefone").in("id", ids);
      const m: Record<string, Profile> = {};
      (ps as Profile[] || []).forEach((p) => { m[p.id] = p; });
      setProfiles(m);
    }
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const filtered = filter === "all" ? invoices : invoices.filter((i) => i.status === filter);
  const variantFor = (s: string) => s === "paid" ? "default" : s === "overdue" ? "destructive" : "secondary";
  const invoiceUrl = (i: Invoice) => `${window.location.origin}/cliente/faturas/${i.id}`;

  const markPaid = async (i: Invoice, method: string) => {
    const paidAt = new Date().toISOString();
    await supabase.from("invoices").update({
      status: "paid", payment_method: method, paid_at: paidAt,
    }).eq("id", i.id);
    await supabase.from("audit_log").insert([{
      action: "mark_invoice_paid", target_type: "invoice", target_id: i.id, metadata: { method },
    }]);
    const prof = profiles[i.client_id];
    if (prof?.email) {
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "invoice-paid",
          recipientEmail: prof.email,
          idempotencyKey: `invoice-paid-${i.id}`,
          templateData: {
            name: prof.full_name,
            amount: fmtMoney(i.total_cents),
            paidAt: fmtDate(paidAt),
            method: method === "pix" ? "Pix" : method === "paypal" ? "PayPal" : "Manual",
            invoiceUrl: invoiceUrl(i),
          },
        },
      }).catch(() => {});
    }
    toast({ title: "Fatura confirmada" });
    
    // Dispara processamento pós-pagamento (automação WHM)
    supabase.functions.invoke("process-invoice-paid", {
      body: { invoice_id: i.id }
    }).catch(e => console.error("Process invoice paid failed", e));

    refresh();
    setActive(null);
  };

  const cancel = async (i: Invoice) => {
    if (!confirm("Cancelar esta fatura?")) return;
    await supabase.from("invoices").update({ status: "cancelled" }).eq("id", i.id);
    refresh();
    setActive(null);
  };

  const resendEmail = async (i: Invoice, kind: "created" | "reminder") => {
    const prof = profiles[i.client_id];
    if (!prof?.email) return toast({ title: "Cliente sem email cadastrado", variant: "destructive" });
    setResending(`${i.id}-${kind}`);
    try {
      const dueDate = new Date(i.due_date);
      const days = Math.round((dueDate.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
      const overdue = days < 0;
      const body = kind === "created"
        ? {
            templateName: "invoice-created",
            templateData: {
              name: prof.full_name,
              amount: fmtMoney(i.total_cents),
              dueDate: fmtDate(i.due_date),
              period: i.period_start && i.period_end ? `${fmtDate(i.period_start)} a ${fmtDate(i.period_end)}` : "",
              invoiceUrl: invoiceUrl(i),
            },
          }
        : {
            templateName: "invoice-reminder",
            templateData: {
              name: prof.full_name,
              amount: fmtMoney(i.total_cents),
              dueDate: fmtDate(i.due_date),
              daysUntilDue: Math.max(days, 0),
              overdue,
              invoiceUrl: invoiceUrl(i),
            },
          };
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          ...body,
          recipientEmail: prof.email,
          idempotencyKey: `manual-${kind}-${i.id}-${Date.now()}`,
        },
      });
      if (error) throw error;
      await supabase.from("audit_log").insert([{
        action: `manual_email_${kind}`, target_type: "invoice", target_id: i.id, metadata: { recipient: prof.email },
      }]);
      toast({ title: "Email enviado", description: `${prof.email}` });
    } catch (e) {
      toast({ title: "Erro ao enviar", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setResending(null); }
  };

  const openWhatsApp = (i: Invoice, kind: "created" | "reminder" | "paid") => {
    const prof = profiles[i.client_id];
    if (!prof?.telefone) return toast({ title: "Cliente sem WhatsApp cadastrado", variant: "destructive" });
    const base = {
      clientName: prof.full_name,
      amountCents: i.total_cents,
      invoiceUrl: invoiceUrl(i),
      brandName: brand?.nome_fantasia || null,
    };
    let msg = "";
    if (kind === "created") msg = buildInvoiceCreatedMessage({ ...base, dueDate: i.due_date });
    else if (kind === "paid") msg = buildInvoicePaidMessage({ ...base, paidAt: i.paid_at || new Date().toISOString(), method: i.payment_method || undefined });
    else {
      const due = new Date(i.due_date);
      const overdue = due.getTime() < new Date().setHours(0, 0, 0, 0);
      msg = buildInvoiceReminderMessage({ ...base, dueDate: i.due_date, overdue });
    }
    const url = waLink(prof.telefone, msg);
    if (!url) return toast({ title: "Telefone inválido", variant: "destructive" });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-2xl">Faturas</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={triggerGenerate} disabled={generating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Gerando…" : "Gerar faturas agora"}
          </Button>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="open">Abertas</TabsTrigger>
              <TabsTrigger value="overdue">Vencidas</TabsTrigger>
              <TabsTrigger value="paid">Pagas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {loading ? <Card><CardContent className="py-10 text-center text-muted-foreground">Carregando…</CardContent></Card>
        : filtered.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma fatura nesta visão.</p>
          </CardContent></Card>
        ) : (
          <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Cliente</th>
                  <th className="text-left px-5 py-3 font-medium">Valor</th>
                  <th className="text-left px-5 py-3 font-medium">Vencimento</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => {
                  const p = profiles[i.client_id];
                  return (
                    <tr key={i.id} className="border-t border-border/50 hover:bg-secondary/30">
                      <td className="px-5 py-3 font-medium">{p?.nome_fantasia || p?.full_name || "—"}<div className="text-xs text-muted-foreground">{p?.email}</div></td>
                      <td className="px-5 py-3 font-medium">{fmtMoney(i.total_cents)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{fmtDate(i.due_date)}</td>
                      <td className="px-5 py-3"><Badge variant={variantFor(i.status)}>{invoiceStatusLabel[i.status]}</Badge></td>
                      <td className="px-5 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => setActive(i)}>Abrir</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle className="font-display text-2xl">Fatura {active && fmtMoney(active.total_cents)}</SheetTitle></SheetHeader>
          {active && (
            <div className="mt-6 space-y-4">
              <div className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Cliente:</span> {profiles[active.client_id]?.nome_fantasia || profiles[active.client_id]?.full_name}</div>
                <div><span className="text-muted-foreground">Vencimento:</span> {fmtDate(active.due_date)}</div>
                {active.period_start && <div><span className="text-muted-foreground">Período:</span> {fmtDate(active.period_start)} – {fmtDate(active.period_end)}</div>}
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={variantFor(active.status)}>{invoiceStatusLabel[active.status]}</Badge></div>
                {active.paid_at && <div><span className="text-muted-foreground">Paga em:</span> {fmtDate(active.paid_at)} via {active.payment_method}</div>}
              </div>

              {active.payment_proof_url && (
                <Button asChild variant="outline" className="w-full">
                  <a href={active.payment_proof_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-2" /> Ver comprovante</a>
                </Button>
              )}

              {/* Notificações ao cliente */}
              <div className="space-y-2 border border-border/60 rounded-xl p-4">
                <div className="text-sm font-medium flex items-center gap-2"><Bell className="h-4 w-4" /> Notificar cliente</div>
                <div className="grid grid-cols-2 gap-2">
                  {active.status === "paid" ? (
                    <>
                      <Button size="sm" variant="outline" disabled={resending === `${active.id}-created`}
                        onClick={() => resendEmail(active, "created")}>
                        <Mail className="h-3.5 w-3.5 mr-1.5" /> Reenviar recibo
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openWhatsApp(active, "paid")}>
                        <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> WhatsApp confirmação
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" disabled={resending === `${active.id}-created`}
                        onClick={() => resendEmail(active, "created")}>
                        <Mail className="h-3.5 w-3.5 mr-1.5" /> Reenviar fatura
                      </Button>
                      <Button size="sm" variant="outline" disabled={resending === `${active.id}-reminder`}
                        onClick={() => resendEmail(active, "reminder")}>
                        <Mail className="h-3.5 w-3.5 mr-1.5" /> Enviar lembrete
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openWhatsApp(active, "created")}>
                        <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> WhatsApp fatura
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openWhatsApp(active, "reminder")}>
                        <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> WhatsApp lembrete
                      </Button>
                    </>
                  )}
                </div>
                {!profiles[active.client_id]?.telefone && (
                  <p className="text-xs text-muted-foreground">Cliente sem WhatsApp cadastrado — botões de WhatsApp ficarão indisponíveis.</p>
                )}
              </div>

              {active.status !== "paid" && active.status !== "cancelled" && (
                <div className="space-y-2 border border-border/60 rounded-xl p-4">
                  <div className="text-sm font-medium">Confirmar pagamento</div>
                  <Select onValueChange={(m) => markPaid(active, m)}>
                    <SelectTrigger><SelectValue placeholder="Selecione o método" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="manual">Outro / manual</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="destructive" onClick={() => cancel(active)} className="w-full">Cancelar fatura</Button>
                </div>
              )}

              {active.status === "paid" && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 text-primary">
                  <CheckCircle2 className="h-5 w-5" /> Fatura quitada
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
