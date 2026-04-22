import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { fmtMoney, fmtDate, cycleLabel, contractStatusLabel, nextBillingDate } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { FileText, Plus, Trash2 } from "lucide-react";

type Contract = { id: string; client_id: string; status: string; created_at: string; accepted_at: string | null };
type Profile = { id: string; full_name: string | null; nome_fantasia: string | null; email: string | null };
type Item = {
  id: string; contract_id: string; product_id: string | null;
  custom_name: string | null; custom_price_cents: number | null;
  billing_cycle: string; quantity: number; next_billing_at: string | null; active: boolean;
  products?: { name: string; price_cents: number } | null;
};
type Product = { id: string; name: string; price_cents: number; billing_cycle: string };

export function ContractsPanel() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [active, setActive] = useState<Contract | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // novo item
  const [newProductId, setNewProductId] = useState<string>("");
  const [newCustomName, setNewCustomName] = useState("");
  const [newPrice, setNewPrice] = useState("0,00");
  const [newCycle, setNewCycle] = useState("monthly");

  const refresh = async () => {
    const { data: cs } = await supabase.from("contracts").select("*").order("created_at", { ascending: false });
    setContracts((cs as Contract[]) || []);
    const ids = [...new Set((cs || []).map((c: Contract) => c.client_id))];
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, full_name, nome_fantasia, email").in("id", ids);
      const map: Record<string, Profile> = {};
      (ps as Profile[] || []).forEach((p) => { map[p.id] = p; });
      setProfiles(map);
    }
    const { data: pr } = await supabase.from("products").select("id, name, price_cents, billing_cycle").eq("active", true);
    setProducts((pr as Product[]) || []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const open = async (c: Contract) => {
    setActive(c);
    const { data } = await supabase.from("contract_items").select("*, products(name, price_cents)").eq("contract_id", c.id).order("created_at");
    setItems((data as Item[]) || []);
  };

  const updateStatus = async (status: string) => {
    if (!active) return;
    const patch: { status: string; started_at?: string } = { status };
    if (status === "active" && !active.accepted_at) patch.started_at = new Date().toISOString();
    await supabase.from("contracts").update(patch).eq("id", active.id);
    toast({ title: "Status atualizado" });
    refresh();
    setActive({ ...active, status });
  };

  const addItem = async () => {
    if (!active) return;
    const cents = Math.round(Number(newPrice.replace(/\./g, "").replace(",", ".")) * 100) || 0;
    const cycle = newProductId ? products.find((p) => p.id === newProductId)?.billing_cycle || newCycle : newCycle;
    const next = nextBillingDate(new Date(), cycle);
    const payload = {
      contract_id: active.id,
      product_id: newProductId || null,
      custom_name: newProductId ? null : (newCustomName || "Item"),
      custom_price_cents: newProductId ? null : cents,
      billing_cycle: cycle,
      quantity: 1,
      next_billing_at: next ? next.toISOString().slice(0, 10) : null,
      active: true,
    };
    const { error } = await supabase.from("contract_items").insert([payload]);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setNewProductId(""); setNewCustomName(""); setNewPrice("0,00");
    open(active);
  };

  const removeItem = async (i: Item) => {
    if (!confirm("Remover este item?")) return;
    await supabase.from("contract_items").delete().eq("id", i.id);
    if (active) open(active);
  };

  const toggleItem = async (i: Item) => {
    await supabase.from("contract_items").update({ active: !i.active }).eq("id", i.id);
    if (active) open(active);
  };

  const itemPrice = (i: Item) => i.custom_price_cents ?? i.products?.price_cents ?? 0;
  const itemName = (i: Item) => i.custom_name || i.products?.name || "Item";

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl">Contratos</h2>
      {loading ? <Card><CardContent className="py-10 text-center text-muted-foreground">Carregando…</CardContent></Card>
        : contracts.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum contrato ainda.</p>
          </CardContent></Card>
        ) : (
          <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Cliente</th>
                  <th className="text-left px-5 py-3 font-medium">Aceito em</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => {
                  const p = profiles[c.client_id];
                  return (
                    <tr key={c.id} className="border-t border-border/50 hover:bg-secondary/30">
                      <td className="px-5 py-3 font-medium">{p?.nome_fantasia || p?.full_name || "—"}<div className="text-xs text-muted-foreground">{p?.email}</div></td>
                      <td className="px-5 py-3 text-muted-foreground">{fmtDate(c.accepted_at || c.created_at)}</td>
                      <td className="px-5 py-3"><Badge variant={c.status === "active" ? "default" : "secondary"}>{contractStatusLabel[c.status]}</Badge></td>
                      <td className="px-5 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => open(c)}>Abrir</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">Contrato #{active?.id.slice(0, 8).toUpperCase()}</SheetTitle>
          </SheetHeader>
          {active && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Cliente</div>
                  <div className="font-medium">{profiles[active.client_id]?.nome_fantasia || profiles[active.client_id]?.full_name}</div>
                </div>
                <Select value={active.status} onValueChange={updateStatus}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_setup">Aguardando setup</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="paused">Pausado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <h3 className="font-medium mb-2">Itens</h3>
                <div className="space-y-2">
                  {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item ainda.</p>}
                  {items.map((i) => (
                    <div key={i.id} className="flex items-center justify-between border border-border/60 rounded-lg p-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{itemName(i)}</div>
                        <div className="text-xs text-muted-foreground">{cycleLabel[i.billing_cycle]} · {fmtMoney(itemPrice(i))}{i.next_billing_at && ` · próx. ${fmtDate(i.next_billing_at)}`}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={i.active} onCheckedChange={() => toggleItem(i)} />
                        <Button size="icon" variant="ghost" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-border/60 rounded-xl p-4 space-y-3 bg-secondary/20">
                <h3 className="font-medium">Adicionar item</h3>
                <div>
                  <Label>Produto do catálogo (opcional)</Label>
                  <Select value={newProductId || "_none"} onValueChange={(v) => setNewProductId(v === "_none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="— item customizado —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— item customizado —</SelectItem>
                      {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {fmtMoney(p.price_cents)} ({cycleLabel[p.billing_cycle]})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {!newProductId && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2"><Label>Nome</Label><Input value={newCustomName} onChange={(e) => setNewCustomName(e.target.value)} placeholder="Descrição" /></div>
                    <div><Label>Preço (R$)</Label><Input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} /></div>
                    <div className="col-span-3">
                      <Label>Ciclo</Label>
                      <Select value={newCycle} onValueChange={setNewCycle}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Mensal</SelectItem>
                          <SelectItem value="quarterly">Trimestral</SelectItem>
                          <SelectItem value="yearly">Anual</SelectItem>
                          <SelectItem value="one_time">Único</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <Button onClick={addItem} className="w-full"><Plus className="h-4 w-4 mr-2" /> Adicionar</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
