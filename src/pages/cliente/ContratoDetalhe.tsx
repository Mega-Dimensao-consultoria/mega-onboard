import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClientId } from "@/hooks/useClientId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtDate, contractStatusLabel, cycleLabel } from "@/lib/format";
import { ArrowLeft } from "lucide-react";

type Item = {
  id: string; custom_name: string | null; custom_price_cents: number | null;
  billing_cycle: string; quantity: number; next_billing_at: string | null; active: boolean;
  product_id: string | null;
  products?: { name: string; price_cents: number } | null;
};
type Contract = { id: string; status: string; accepted_at: string | null; created_at: string; notes: string | null };

export default function ContratoDetalhe() {
  const { id } = useParams();
  const { clientId } = useClientId();
  const [contract, setContract] = useState<Contract | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId || !id) return;
    (async () => {
      const [{ data: c }, { data: it }] = await Promise.all([
        supabase.from("contracts").select("*").eq("id", id).maybeSingle(),
        supabase.from("contract_items").select("*, products(name, price_cents)").eq("contract_id", id).order("created_at"),
      ]);
      setContract(c as Contract);
      setItems((it as Item[]) || []);
      setLoading(false);
    })();
  }, [clientId, id]);

  const itemPrice = (i: Item) => i.custom_price_cents ?? i.products?.price_cents ?? 0;
  const itemName = (i: Item) => i.custom_name || i.products?.name || "Item";
  const total = items.filter((i) => i.active && i.billing_cycle === "monthly").reduce((s, i) => s + itemPrice(i) * i.quantity, 0);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm"><Link to="/cliente/contratos"><ArrowLeft className="h-4 w-4 mr-1" /> Contratos</Link></Button>

      {loading ? <div className="text-muted-foreground">Carregando…</div> : !contract ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Contrato não encontrado.</CardContent></Card>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Contrato</div>
              <h1 className="font-display text-3xl">#{contract.id.slice(0, 8).toUpperCase()}</h1>
              <p className="text-muted-foreground mt-1">Aceito em {fmtDate(contract.accepted_at || contract.created_at)}</p>
            </div>
            <Badge variant={contract.status === "active" ? "default" : "secondary"} className="text-sm">{contractStatusLabel[contract.status]}</Badge>
          </div>

          <Card>
            <CardHeader><CardTitle>Itens contratados</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aguardando o consultor adicionar os itens deste contrato.</p>
              ) : items.map((i) => (
                <div key={i.id} className="flex items-center justify-between border-b border-border/40 py-3 last:border-0">
                  <div>
                    <div className="font-medium">{itemName(i)} {i.quantity > 1 && <span className="text-muted-foreground">×{i.quantity}</span>}</div>
                    <div className="text-xs text-muted-foreground">{cycleLabel[i.billing_cycle]}{i.next_billing_at && ` · próx. cobrança ${fmtDate(i.next_billing_at)}`}{!i.active && " · inativo"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{fmtMoney(itemPrice(i) * i.quantity)}</div>
                  </div>
                </div>
              ))}
              {total > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="text-sm text-muted-foreground">Total mensal estimado</div>
                  <div className="font-display text-2xl">{fmtMoney(total)}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
