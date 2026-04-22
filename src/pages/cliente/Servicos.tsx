import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClientId } from "@/hooks/useClientId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fmtMoney, cycleLabel, productTypeLabel, nextBillingDate, fmtDate } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Plus, Loader2, Trash2 } from "lucide-react";

type Product = { id: string; name: string; description: string | null; type: string; billing_cycle: string; price_cents: number };
type Contract = { id: string; status: string };
type ContractItem = {
  id: string; billing_cycle: string; quantity: number; active: boolean;
  next_billing_at: string | null; custom_name: string | null; custom_price_cents: number | null;
  product: { id: string; name: string; price_cents: number; type: string } | null;
};

async function notifyServiceChange(opts: {
  clientId: string;
  serviceName: string;
  action: "added" | "cancelled" | "removed" | "suspended" | "reactivated";
  byConsultant: boolean;
  itemId: string;
}) {
  // busca email do cliente
  const { data: prof } = await supabase
    .from("profiles")
    .select("email, full_name, nome_fantasia")
    .eq("id", opts.clientId)
    .maybeSingle();
  if (!prof?.email) return;
  try {
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "service-changed",
        recipientEmail: prof.email,
        idempotencyKey: `service-${opts.action}-${opts.itemId}-${Date.now()}`,
        templateData: {
          name: prof.nome_fantasia || prof.full_name || undefined,
          serviceName: opts.serviceName,
          action: opts.action,
          byConsultant: opts.byConsultant,
        },
      },
    });
  } catch (e) {
    console.warn("notifyServiceChange failed", e);
  }
}

export default function Servicos() {
  const { user, role } = useAuth();
  const { clientId, isImpersonating } = useClientId();
  const isConsultor = role === "consultor";

  const [products, setProducts] = useState<Product[]>([]);
  const [contract, setContract] = useState<Contract | null>(null);
  const [items, setItems] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<ContractItem | null>(null);
  const [removing, setRemoving] = useState(false);

  const loadItems = useCallback(async (contractId: string) => {
    const { data } = await supabase
      .from("contract_items")
      .select("id, billing_cycle, quantity, active, next_billing_at, custom_name, custom_price_cents, product:products(id,name,price_cents,type)")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: false });
    setItems((data as unknown as ContractItem[]) || []);
  }, []);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from("products").select("*").eq("active", true).in("type", ["service", "addon"]).order("sort_order"),
        supabase.from("contracts").select("id, status").eq("client_id", clientId).neq("status", "cancelled").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setProducts((p as Product[]) || []);
      setContract(c as Contract);
      if (c) await loadItems((c as Contract).id);
      setLoading(false);
    })();
  }, [clientId, loadItems]);

  const contratar = async (p: Product) => {
    if (isImpersonating) return toast({ title: "Modo visualização", description: "Saia do modo visualização para realizar ações.", variant: "destructive" });
    if (!contract) return toast({ title: "Você ainda não tem contrato ativo", description: "Aguarde o consultor configurar seu plano.", variant: "destructive" });
    setAdding(p.id);
    try {
      const next = nextBillingDate(new Date(), p.billing_cycle);
      const { data: inserted, error } = await supabase.from("contract_items").insert([{
        contract_id: contract.id,
        product_id: p.id,
        billing_cycle: p.billing_cycle,
        quantity: 1,
        next_billing_at: next ? next.toISOString().slice(0, 10) : null,
        active: true,
      }]).select("id").single();
      if (error) throw error;
      await supabase.from("audit_log").insert([{
        actor_user_id: user?.id, action: "client_added_service", target_type: "product", target_id: p.id,
        metadata: { contract_id: contract.id },
      }]);
      await loadItems(contract.id);
      toast({ title: "Serviço contratado", description: "Será incluído na sua próxima fatura." });
      if (clientId && inserted?.id) {
        notifyServiceChange({
          clientId, serviceName: p.name, action: "added",
          byConsultant: isConsultor, itemId: inserted.id,
        });
      }
    } catch (e) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setAdding(null); }
  };

  const removerItem = async () => {
    if (!confirmRemove || !contract || !clientId) return;
    setRemoving(true);
    const serviceName = confirmRemove.custom_name || confirmRemove.product?.name || "Serviço";
    const itemId = confirmRemove.id;
    try {
      if (isConsultor) {
        const { error } = await supabase.from("contract_items").delete().eq("id", itemId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("contract_items").update({ active: false, next_billing_at: null })
          .eq("id", itemId);
        if (error) throw error;
      }
      await supabase.from("audit_log").insert([{
        actor_user_id: user?.id,
        action: isConsultor ? "consultor_removed_service" : "client_cancelled_service",
        target_type: "contract_item",
        target_id: itemId,
        metadata: { contract_id: contract.id, name: serviceName },
      }]);
      await loadItems(contract.id);
      toast({ title: isConsultor ? "Serviço removido" : "Serviço cancelado", description: isConsultor ? "Item excluído do contrato." : "Não será incluído nas próximas faturas." });
      // notifica cliente por email
      notifyServiceChange({
        clientId, serviceName,
        action: isConsultor ? "removed" : "cancelled",
        byConsultant: isConsultor, itemId,
      });
      setConfirmRemove(null);
    } catch (e) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setRemoving(false); }
  };

  const activeItems = items.filter((i) => i.active);

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Catálogo</div>
        <h1 className="font-display text-4xl">Serviços a la carte</h1>
        <p className="text-muted-foreground mt-1">Contrate serviços avulsos e add-ons. Tudo é incluído na sua próxima fatura.</p>
      </div>

      {!loading && contract && (
        <section className="space-y-3">
          <h2 className="font-display text-2xl">Seus serviços ativos</h2>
          {activeItems.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhum serviço avulso contratado.</CardContent></Card>
          ) : (
            <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
              <ul className="divide-y divide-border/60">
                {activeItems.map((it) => {
                  const name = it.custom_name || it.product?.name || "Item";
                  const price = it.custom_price_cents ?? it.product?.price_cents ?? 0;
                  return (
                    <li key={it.id} className="px-5 py-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{name}</div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                          <span>{fmtMoney(price * (it.quantity || 1))} · {cycleLabel[it.billing_cycle]}</span>
                          {it.next_billing_at && <span>Próx. cobrança: {fmtDate(it.next_billing_at)}</span>}
                          {it.quantity > 1 && <span>Qtd: {it.quantity}</span>}
                        </div>
                      </div>
                      <Button
                        size="sm" variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmRemove(it)}
                        disabled={isImpersonating && !isConsultor}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {isConsultor ? "Remover" : "Cancelar"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Disponíveis</h2>
        {loading ? <Card><CardContent className="py-10 text-center text-muted-foreground">Carregando…</CardContent></Card>
          : products.length === 0 ? (
            <Card><CardContent className="py-16 text-center">
              <Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum serviço disponível no momento.</p>
            </CardContent></Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => (
                <Card key={p.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <Badge variant="secondary">{productTypeLabel[p.type]}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 flex-1 flex flex-col">
                    {p.description && <p className="text-sm text-muted-foreground line-clamp-3">{p.description}</p>}
                    <div className="flex items-baseline gap-2 mt-auto">
                      <div className="font-display text-2xl">{fmtMoney(p.price_cents)}</div>
                      <div className="text-xs text-muted-foreground">{cycleLabel[p.billing_cycle]}</div>
                    </div>
                    <Button onClick={() => contratar(p)} disabled={adding === p.id || !contract}>
                      {adding === p.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                      Contratar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
      </section>

      <AlertDialog open={!!confirmRemove} onOpenChange={(o) => !o && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isConsultor ? "Remover serviço?" : "Cancelar serviço?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isConsultor
                ? `O item "${confirmRemove?.custom_name || confirmRemove?.product?.name}" será excluído permanentemente do contrato. O cliente receberá um email de notificação.`
                : `O serviço "${confirmRemove?.custom_name || confirmRemove?.product?.name}" deixará de ser cobrado nas próximas faturas. Faturas já emitidas não são afetadas. Você receberá um email de confirmação.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={removerItem} disabled={removing} className="bg-destructive hover:bg-destructive/90">
              {removing ? "Processando…" : (isConsultor ? "Remover" : "Confirmar cancelamento")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
