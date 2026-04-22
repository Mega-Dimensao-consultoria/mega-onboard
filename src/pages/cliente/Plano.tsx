import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClientId } from "@/hooks/useClientId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, cycleLabel, nextBillingDate } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { CreditCard, Loader2, ArrowRightLeft } from "lucide-react";

type Product = { id: string; name: string; description: string | null; billing_cycle: string; price_cents: number };
type ContractItem = { id: string; product_id: string | null; custom_name: string | null; custom_price_cents: number | null; billing_cycle: string; products?: { name: string; price_cents: number } | null };
type Contract = { id: string };

export default function Plano() {
  const { user } = useAuth();
  const { clientId, isImpersonating } = useClientId();
  const [plans, setPlans] = useState<Product[]>([]);
  const [contract, setContract] = useState<Contract | null>(null);
  const [currentPlan, setCurrentPlan] = useState<ContractItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);

  const refresh = async () => {
    if (!clientId) return;
    const [{ data: ps }, { data: c }] = await Promise.all([
      supabase.from("products").select("*").eq("active", true).eq("type", "plan").order("sort_order"),
      supabase.from("contracts").select("id").eq("client_id", clientId).neq("status", "cancelled").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setPlans((ps as Product[]) || []);
    if (c) {
      setContract(c as Contract);
      const { data: it } = await supabase.from("contract_items")
        .select("*, products(name, price_cents, type)")
        .eq("contract_id", (c as Contract).id)
        .eq("active", true);
      const planItem = (it as ContractItem[] | null)?.find((i) => (i as any).products?.type === "plan") || null;
      setCurrentPlan(planItem);
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [clientId]);

  const trocar = async (p: Product) => {
    if (isImpersonating) return toast({ title: "Modo visualização", description: "Saia do modo visualização para realizar trocas.", variant: "destructive" });
    if (!contract) return;
    setSwitching(p.id);
    try {
      // desativa plano atual
      if (currentPlan) {
        await supabase.from("contract_items").update({ active: false }).eq("id", currentPlan.id);
      }
      // adiciona novo
      const next = nextBillingDate(new Date(), p.billing_cycle);
      const { error } = await supabase.from("contract_items").insert([{
        contract_id: contract.id,
        product_id: p.id,
        billing_cycle: p.billing_cycle,
        quantity: 1,
        next_billing_at: next ? next.toISOString().slice(0, 10) : null,
        active: true,
      }]);
      if (error) throw error;
      await supabase.from("audit_log").insert([{
        actor_user_id: user?.id, action: "client_changed_plan", target_type: "product", target_id: p.id,
        metadata: { contract_id: contract.id, previous_plan_item: currentPlan?.id },
      }]);
      toast({ title: "Plano alterado!", description: "Seu novo plano valerá a partir da próxima cobrança." });
      refresh();
    } catch (e) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setSwitching(null); }
  };

  const currentName = currentPlan?.custom_name || currentPlan?.products?.name;
  const currentPrice = currentPlan?.custom_price_cents ?? currentPlan?.products?.price_cents ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Plano</div>
        <h1 className="font-display text-4xl">Seu plano</h1>
        <p className="text-muted-foreground mt-1">Veja seu plano atual e troque quando quiser.</p>
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
                          <Button onClick={() => trocar(p)} disabled={switching === p.id || !contract} variant="outline" className="w-full">
                            {switching === p.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRightLeft className="h-4 w-4 mr-2" />}
                            {currentPlan ? "Trocar para este" : "Contratar"}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
