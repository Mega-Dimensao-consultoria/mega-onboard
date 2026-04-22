import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtMoney, fmtDate, cycleLabel, nextBillingDate, waLink, buildInvoicePaidMessage } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRightLeft, CheckCircle2, XCircle, Clock } from "lucide-react";

type Request = {
  id: string; client_id: string; contract_id: string;
  current_item_id: string | null; current_product_id: string | null;
  desired_product_id: string; status: string; client_note: string | null;
  consultor_note: string | null; created_at: string; decided_at: string | null;
};
type Profile = { id: string; full_name: string | null; email: string | null; telefone: string | null; nome_fantasia: string | null };
type Product = { id: string; name: string; billing_cycle: string; price_cents: number };

export function PlanChangeRequestsPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<Request[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Request | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const { data } = await supabase.from("plan_change_requests").select("*").order("created_at", { ascending: false });
    const list = (data as Request[]) || [];
    setItems(list);
    const clientIds = [...new Set(list.map((r) => r.client_id))];
    const productIds = [...new Set(list.flatMap((r) => [r.desired_product_id, r.current_product_id].filter(Boolean) as string[]))];
    if (clientIds.length) {
      const { data: ps } = await supabase.from("profiles").select("id, full_name, email, telefone, nome_fantasia").in("id", clientIds);
      const m: Record<string, Profile> = {};
      (ps as Profile[] || []).forEach((p) => { m[p.id] = p; });
      setProfiles(m);
    }
    if (productIds.length) {
      const { data: pr } = await supabase.from("products").select("id, name, billing_cycle, price_cents").in("id", productIds);
      const mp: Record<string, Product> = {};
      (pr as Product[] || []).forEach((p) => { mp[p.id] = p; });
      setProducts(mp);
    }
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const decide = async (r: Request, action: "approve" | "reject") => {
    setBusy(true);
    try {
      if (action === "approve") {
        const target = products[r.desired_product_id];
        if (!target) throw new Error("Produto não encontrado");
        // desativa item atual
        if (r.current_item_id) {
          await supabase.from("contract_items").update({ active: false }).eq("id", r.current_item_id);
        }
        // cria novo item
        const next = nextBillingDate(new Date(), target.billing_cycle);
        await supabase.from("contract_items").insert([{
          contract_id: r.contract_id,
          product_id: target.id,
          billing_cycle: target.billing_cycle,
          quantity: 1,
          next_billing_at: next ? next.toISOString().slice(0, 10) : null,
          active: true,
        }]);
      }
      await supabase.from("plan_change_requests").update({
        status: action === "approve" ? "approved" : "rejected",
        consultor_note: note || null,
        decided_by: user?.id,
        decided_at: new Date().toISOString(),
      }).eq("id", r.id);
      await supabase.from("audit_log").insert([{
        actor_user_id: user?.id,
        action: action === "approve" ? "plan_change_approved" : "plan_change_rejected",
        target_type: "plan_change_request", target_id: r.id,
        metadata: { note, desired_product_id: r.desired_product_id },
      }]);
      // Notifica o cliente por email
      const prof = profiles[r.client_id];
      const target = products[r.desired_product_id];
      if (prof?.email) {
        supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "service-changed",
            recipientEmail: prof.email,
            idempotencyKey: `plan-${action}-${r.id}`,
            templateData: {
              name: prof.full_name,
              serviceName: target?.name || "novo plano",
              action: action === "approve" ? "reactivate" : "removed",
              note,
            },
          },
        }).catch(() => {});
      }
      toast({ title: action === "approve" ? "Troca aprovada" : "Solicitação recusada" });
      setActive(null); setNote("");
      refresh();
    } catch (e) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const statusBadge = (s: string) => {
    const v = s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary";
    const label = s === "approved" ? "Aprovada" : s === "rejected" ? "Recusada" : "Pendente";
    return <Badge variant={v}>{label}</Badge>;
  };

  const pending = items.filter((i) => i.status === "pending");
  const decided = items.filter((i) => i.status !== "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-2xl">Solicitações de troca de plano</h2>
        {pending.length > 0 && <Badge variant="secondary">{pending.length} pendente(s)</Badge>}
      </div>

      {loading ? <Card><CardContent className="py-10 text-center text-muted-foreground">Carregando…</CardContent></Card>
        : items.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <ArrowRightLeft className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma solicitação registrada.</p>
          </CardContent></Card>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm uppercase tracking-wider text-muted-foreground">Pendentes</h3>
                <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="text-left px-5 py-3 font-medium">Cliente</th>
                        <th className="text-left px-5 py-3 font-medium">De</th>
                        <th className="text-left px-5 py-3 font-medium">Para</th>
                        <th className="text-left px-5 py-3 font-medium">Solicitada</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pending.map((r) => {
                        const p = profiles[r.client_id];
                        const from = r.current_product_id ? products[r.current_product_id]?.name : "—";
                        const to = products[r.desired_product_id];
                        return (
                          <tr key={r.id} className="border-t border-border/50 hover:bg-secondary/30">
                            <td className="px-5 py-3 font-medium">{p?.nome_fantasia || p?.full_name || "—"}<div className="text-xs text-muted-foreground">{p?.email}</div></td>
                            <td className="px-5 py-3 text-muted-foreground">{from}</td>
                            <td className="px-5 py-3 font-medium">{to?.name} <span className="text-xs text-muted-foreground">({to && fmtMoney(to.price_cents)}/{to && cycleLabel[to.billing_cycle]})</span></td>
                            <td className="px-5 py-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                            <td className="px-5 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => { setActive(r); setNote(""); }}>Analisar</Button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {decided.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm uppercase tracking-wider text-muted-foreground">Histórico</h3>
                <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="text-left px-5 py-3 font-medium">Cliente</th>
                        <th className="text-left px-5 py-3 font-medium">Plano</th>
                        <th className="text-left px-5 py-3 font-medium">Decidida</th>
                        <th className="text-left px-5 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decided.map((r) => {
                        const p = profiles[r.client_id];
                        const to = products[r.desired_product_id];
                        return (
                          <tr key={r.id} className="border-t border-border/50">
                            <td className="px-5 py-3">{p?.nome_fantasia || p?.full_name || "—"}</td>
                            <td className="px-5 py-3">{to?.name}</td>
                            <td className="px-5 py-3 text-muted-foreground">{r.decided_at ? fmtDate(r.decided_at) : "—"}</td>
                            <td className="px-5 py-3">{statusBadge(r.status)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Analisar solicitação</DialogTitle></DialogHeader>
          {active && (() => {
            const p = profiles[active.client_id];
            const from = active.current_product_id ? products[active.current_product_id] : null;
            const to = products[active.desired_product_id];
            return (
              <div className="space-y-3 text-sm">
                <div><span className="text-muted-foreground">Cliente:</span> <strong>{p?.nome_fantasia || p?.full_name}</strong> ({p?.email})</div>
                <div className="bg-secondary/50 rounded-lg p-3 space-y-1">
                  <div>De: <strong>{from?.name || "Sem plano"}</strong> {from && `· ${fmtMoney(from.price_cents)}/${cycleLabel[from.billing_cycle]}`}</div>
                  <div>Para: <strong>{to?.name}</strong> {to && `· ${fmtMoney(to.price_cents)}/${cycleLabel[to.billing_cycle]}`}</div>
                </div>
                {active.client_note && (
                  <div>
                    <div className="text-muted-foreground text-xs uppercase">Observação do cliente</div>
                    <div className="italic">"{active.client_note}"</div>
                  </div>
                )}
                <div>
                  <div className="text-muted-foreground text-xs uppercase mb-1">Sua resposta (opcional)</div>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Aprovado, valerá no próximo ciclo." />
                </div>
              </div>
            );
          })()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setActive(null)} disabled={busy}>Fechar</Button>
            <Button variant="destructive" onClick={() => active && decide(active, "reject")} disabled={busy}>
              <XCircle className="h-4 w-4 mr-2" /> Recusar
            </Button>
            <Button onClick={() => active && decide(active, "approve")} disabled={busy}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Aprovar e aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
