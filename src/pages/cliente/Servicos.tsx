import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, cycleLabel, productTypeLabel, nextBillingDate } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Plus, Loader2 } from "lucide-react";

type Product = { id: string; name: string; description: string | null; type: string; billing_cycle: string; price_cents: number };
type Contract = { id: string; status: string };

export default function Servicos() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from("products").select("*").eq("active", true).in("type", ["service", "addon"]).order("sort_order"),
        supabase.from("contracts").select("id, status").eq("client_id", user.id).neq("status", "cancelled").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setProducts((p as Product[]) || []);
      setContract(c as Contract);
      setLoading(false);
    })();
  }, [user]);

  const contratar = async (p: Product) => {
    if (!contract) return toast({ title: "Você ainda não tem contrato ativo", description: "Aguarde o consultor configurar seu plano.", variant: "destructive" });
    setAdding(p.id);
    try {
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
        actor_user_id: user?.id, action: "client_added_service", target_type: "product", target_id: p.id,
        metadata: { contract_id: contract.id },
      }]);
      toast({ title: "Serviço contratado", description: "Será incluído na sua próxima fatura." });
    } catch (e) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setAdding(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Catálogo</div>
        <h1 className="font-display text-4xl">Serviços a la carte</h1>
        <p className="text-muted-foreground mt-1">Contrate serviços avulsos e add-ons. Tudo é incluído na sua próxima fatura.</p>
      </div>

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
    </div>
  );
}
