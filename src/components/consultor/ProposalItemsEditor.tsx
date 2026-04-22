import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { fmtMoney, cycleLabel } from "@/lib/format";
import { Loader2, Plus, Trash2, Package } from "lucide-react";

type Product = {
  id: string;
  name: string;
  price_cents: number;
  billing_cycle: string;
  type: string;
};

type ProposedItem = {
  id: string;
  lead_id: string;
  product_id: string | null;
  custom_name: string | null;
  custom_price_cents: number | null;
  billing_cycle: string;
  quantity: number;
  sort_order: number;
  notes: string | null;
};

export function ProposalItemsEditor({ leadId }: { leadId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<ProposedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [productId, setProductId] = useState<string>("");
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [cycle, setCycle] = useState("monthly");
  const [quantity, setQuantity] = useState(1);

  const refresh = async () => {
    const [{ data: prods }, { data: its }] = await Promise.all([
      supabase.from("products").select("id,name,price_cents,billing_cycle,type").eq("active", true).order("sort_order"),
      supabase.from("lead_proposed_items").select("*").eq("lead_id", leadId).order("sort_order"),
    ]);
    setProducts((prods as Product[]) || []);
    setItems((its as ProposedItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [leadId]);

  const resetForm = () => {
    setProductId("");
    setCustomName("");
    setCustomPrice("");
    setCycle("monthly");
    setQuantity(1);
  };

  const addItem = async () => {
    setAdding(true);
    try {
      let payload: Partial<ProposedItem> = {
        lead_id: leadId,
        quantity,
        sort_order: items.length,
        billing_cycle: cycle,
      };

      if (productId) {
        const p = products.find((x) => x.id === productId);
        if (!p) throw new Error("Produto não encontrado");
        payload = { ...payload, product_id: p.id, billing_cycle: p.billing_cycle, custom_name: null, custom_price_cents: null };
      } else {
        if (!customName.trim()) throw new Error("Informe o nome do item customizado");
        const cents = Math.round(parseFloat(customPrice.replace(",", ".") || "0") * 100);
        if (!cents || cents < 0) throw new Error("Informe um preço válido");
        payload = { ...payload, product_id: null, custom_name: customName.trim(), custom_price_cents: cents };
      }

      const { error } = await supabase.from("lead_proposed_items").insert(payload as never);
      if (error) throw error;
      toast({ title: "Item adicionado à proposta" });
      resetForm();
      refresh();
    } catch (e) {
      toast({ title: "Erro ao adicionar", description: (e as Error).message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from("lead_proposed_items").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    refresh();
  };

  const itemDisplay = (it: ProposedItem) => {
    if (it.product_id) {
      const p = products.find((x) => x.id === it.product_id);
      return { name: p?.name || "Produto", price: p?.price_cents || 0, cycle: it.billing_cycle };
    }
    return { name: it.custom_name || "Item", price: it.custom_price_cents || 0, cycle: it.billing_cycle };
  };

  const total = items.reduce((sum, it) => sum + itemDisplay(it).price * it.quantity, 0);

  if (loading) return <div className="text-muted-foreground text-sm">Carregando…</div>;

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">
        Monte aqui a proposta comercial. Esses itens aparecerão na página pública e serão copiados automaticamente para o contrato quando o cliente aceitar.
      </div>

      {items.length === 0 ? (
        <div className="text-center py-10 bg-secondary/30 rounded-xl border border-dashed border-border">
          <Package className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum item na proposta ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => {
            const d = itemDisplay(it);
            return (
              <div key={it.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-card">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{d.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {fmtMoney(d.price)} · {cycleLabel[d.cycle] || d.cycle}
                    {it.quantity > 1 && ` · ${it.quantity}x`}
                  </div>
                </div>
                <div className="text-sm font-semibold tabular-nums">
                  {fmtMoney(d.price * it.quantity)}
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeItem(it.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          <div className="flex justify-between items-center pt-2 px-3 border-t border-border/60">
            <span className="text-sm text-muted-foreground">Total estimado</span>
            <span className="font-display text-xl">{fmtMoney(total)}</span>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border/60 p-4 space-y-3 bg-secondary/20">
        <div className="text-sm font-medium">Adicionar item</div>

        <div>
          <Label className="text-xs">Do catálogo</Label>
          <Select value={productId} onValueChange={(v) => { setProductId(v); setCustomName(""); setCustomPrice(""); }}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um produto/serviço…" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} — {fmtMoney(p.price_cents)} / {cycleLabel[p.billing_cycle]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!productId && (
          <>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">ou item customizado</div>
            <div className="grid sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Nome</Label>
                <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Ex.: Setup inicial" />
              </div>
              <div>
                <Label className="text-xs">Preço (R$)</Label>
                <Input value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <Label className="text-xs">Ciclo</Label>
                <Select value={cycle} onValueChange={setCycle}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                    <SelectItem value="one_time">Único</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Quantidade</Label>
                <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
              </div>
            </div>
          </>
        )}

        {productId && (
          <div>
            <Label className="text-xs">Quantidade</Label>
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} className="max-w-[120px]" />
          </div>
        )}

        <Button onClick={addItem} disabled={adding} size="sm">
          {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Adicionar
        </Button>
      </div>
    </div>
  );
}
