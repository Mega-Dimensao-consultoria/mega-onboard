import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClientId } from "@/hooks/useClientId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtMoney, fmtDate, cycleLabel } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { CreditCard, Loader2, ArrowRightLeft, Clock, CheckCircle2, XCircle } from "lucide-react";

type Product = { id: string; name: string; description: string | null; billing_cycle: string; price_cents: number };
type ContractItem = { id: string; product_id: string | null; custom_name: string | null; custom_price_cents: number | null; billing_cycle: string; products?: { name: string; price_cents: number; type?: string } | null };
type Contract = { id: string };
type ChangeRequest = {
  id: string; status: string; created_at: string; decided_at: string | null;
  desired_product_id: string; client_note: string | null; consultor_note: string | null;
};

export default function Plano() {
  const { user } = useAuth();
  const { clientId, isImpersonating } = useClientId();
  const [plans, setPlans] = useState<Product[]>([]);
  const [contract, setContract] = useState<Contract | null>(null);
  const [currentPlan, setCurrentPlan] = useState<ContractItem | null>(null);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [note, setNote] = useState("");

  const refresh = async () => {
    if (!clientId) return;
    const [{ data: ps }, { data: c }, { data: rs }] = await Promise.all([
      supabase.from("products").select("*").eq("active", true).eq("type", "plan").order("sort_order"),
      supabase.from("contracts").select("id").eq("client_id", clientId).neq("status", "cancelled").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("plan_change_requests").select("id,status,created_at,decided_at,desired_product_id,client_note,consultor_note").eq("client_id", clientId).order("created_at", { ascending: false }),
    ]);
    setPlans((ps as Product[]) || []);
    setRequests((rs as ChangeRequest[]) || []);
    if (c) {
      setContract(c as Contract);
      const { data: it } = await supabase.from("contract_items")
        .select("*, products(name, price_cents, type)")
        .eq("contract_id", (c as Contract).id)
        .eq("active", true);
      const planItem = (it as ContractItem[] | null)?.find((i) => i.products?.type === "plan") || null;
      setCurrentPlan(planItem);
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [clientId]);

  const openRequest = (p: Product) => {
    if (isImpersonating) return toast({ title: "Modo visualização", description: "Saia do modo visualização para solicitar troca.", variant: "destructive" });
    setSelected(p);
    setNote("");
  };

  const submitRequest = async () => {
    if (!selected || !contract || !clientId) return;
    setRequesting(true);
    try {
      const { error } = await supabase.from("plan_change_requests").insert([{
        client_id: clientId,
        contract_id: contract.id,
        current_item_id: currentPlan?.id ?? null,
        current_product_id: currentPlan?.product_id ?? null,
        desired_product_id: selected.id,
        client_note: note || null,
        status: "pending",
      }]);
      if (error) throw error;
      await supabase.from("audit_log").insert([{
        actor_user_id: user?.id, action: "plan_change_requested",
        target_type: "product", target_id: selected.id,
        metadata: { contract_id: contract.id, from: currentPlan?.product_id ?? null, note },
      }]);
      toast({ title: "Solicitação enviada", description: "O consultor irá analisar e aprovar a troca." });
      setSelected(null);
      refresh();
    } catch (e) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setRequesting(false); }
  };

  const currentName = currentPlan?.custom_name || currentPlan?.products?.name;
  const currentPrice = currentPlan?.custom_price_cents ?? currentPlan?.products?.price_cents ?? 0;
  const pending = requests.find((r) => r.status === "pending");
  const productName = (id: string) => plans.find((p) => p.id === id)?.name || "—";
  const reqStatusLabel: Record<string, string> = { pending: "Em análise", approved: "Aprovada", rejected: "Recusada" };
  const reqStatusIcon: Record<string, React.ReactNode> = {
    pending: <Clock className="h-4 w-4" />,
    approved: <CheckCircle2 className="h-4 w-4" />,
    rejected: <XCircle className="h-4 w-4" />,
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Plano</div>
        <h1 className="font-display text-4xl">Seu plano</h1>
        <p className="text-muted-foreground mt-1">Veja seu plano atual e solicite uma troca quando precisar.</p>
      </div>

      {loading ? <Card><CardContent className="py-10 text-center text-muted-foreground">Carregando…</CardContent></Card> : (
        <>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Plano atual</CardTitle></CardHeader>
            <CardContent>
              {currentPlan ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-display text-2xl">{currentName}</div>
                    <div className="text-sm text-muted-foreground">{cycleLabel[currentPlan.billing_cycle]}</div>
                  </div>
                  <div className="font-display text-2xl">{fmtMoney(currentPrice)}</div>
                </div>
              ) : <p className="text-sm text-muted-foreground">Nenhum plano ativo. Aguarde o consultor configurar seu primeiro plano.</p>}
            </CardContent>
          </Card>

          {pending && (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="py-4 flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div className="flex-1 text-sm">
                  <div className="font-medium">Você tem uma solicitação de troca em análise</div>
                  <div className="text-muted-foreground">Para {productName(pending.desired_product_id)} · enviada em {fmtDate(pending.created_at)}</div>
                </div>
                <Badge variant="secondary">Em análise</Badge>
              </CardContent>
            </Card>
          )}

          {plans.length > 0 && (
            <div>
              <h2 className="font-display text-xl mb-3">{currentPlan ? "Trocar de plano" : "Planos disponíveis"}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((p) => {
                  const isCurrent = currentPlan?.product_id === p.id;
                  return (
                    <Card key={p.id} className={isCurrent ? "border-primary" : ""}>
                      <CardHeader className="pb-2 flex-row items-start justify-between gap-2">
                        <CardTitle className="text-base">{p.name}</CardTitle>
                        {isCurrent && <Badge>Atual</Badge>}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {p.description && <p className="text-sm text-muted-foreground line-clamp-3">{p.description}</p>}
                        <div className="flex items-baseline gap-2">
                          <div className="font-display text-2xl">{fmtMoney(p.price_cents)}</div>
                          <div className="text-xs text-muted-foreground">{cycleLabel[p.billing_cycle]}</div>
                        </div>
                        {!isCurrent && (
                          <Button onClick={() => openRequest(p)} disabled={!contract || !!pending} variant="outline" className="w-full">
                            <ArrowRightLeft className="h-4 w-4 mr-2" />
                            {pending ? "Aguardando aprovação" : currentPlan ? "Solicitar troca" : "Solicitar contratação"}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {requests.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Histórico de solicitações</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y divide-border/60">
                  {requests.map((r) => (
                    <li key={r.id} className="py-3 flex items-start gap-3">
                      <div className="mt-1 text-muted-foreground">{reqStatusIcon[r.status]}</div>
                      <div className="flex-1 text-sm">
                        <div className="font-medium">Troca para {productName(r.desired_product_id)}</div>
                        <div className="text-xs text-muted-foreground">
                          {fmtDate(r.created_at)} {r.decided_at && `· decidida em ${fmtDate(r.decided_at)}`}
                        </div>
                        {r.consultor_note && <div className="mt-1 text-xs italic text-muted-foreground">"{r.consultor_note}"</div>}
                      </div>
                      <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                        {reqStatusLabel[r.status]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar troca para {selected?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              O consultor receberá sua solicitação e fará o ajuste no seu contrato. Você pode adicionar uma observação opcional.
            </p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Quero ativar o novo plano a partir do próximo ciclo."
              rows={3}
            />
            <div className="text-sm bg-secondary/50 rounded-lg p-3">
              <div>De: <strong>{currentName || "Sem plano"}</strong></div>
              <div>Para: <strong>{selected?.name}</strong> · {selected && fmtMoney(selected.price_cents)}/{selected && cycleLabel[selected.billing_cycle]}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button onClick={submitRequest} disabled={requesting}>
              {requesting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
