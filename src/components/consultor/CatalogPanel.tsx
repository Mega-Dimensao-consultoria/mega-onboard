import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Product = {
  id: string;
  name: string;
  description: string | null;
  type: "plan" | "service" | "addon" | "custom";
  billing_cycle: "monthly" | "quarterly" | "yearly" | "one_time";
  price_cents: number;
  active: boolean;
  sort_order: number;
  whm_package: string | null;
};

const typeLabel = { plan: "Plano", service: "Serviço", addon: "Add-on", custom: "Customizado" };
const cycleLabel = { monthly: "Mensal", quarterly: "Trimestral", yearly: "Anual", one_time: "Único" };

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  type: z.enum(["plan", "service", "addon", "custom"]),
  billing_cycle: z.enum(["monthly", "quarterly", "yearly", "one_time"]),
  price_cents: z.number().int().min(0),
});

const empty: Omit<Product, "id"> = { name: "", description: "", type: "plan", billing_cycle: "monthly", price_cents: 0, active: true, sort_order: 0, whm_package: "" };

const fmt = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CatalogPanel() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, "id">>(empty);
  const [priceStr, setPriceStr] = useState("0,00");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
    setItems((data as Product[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setPriceStr("0,00");
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ ...p, description: p.description ?? "" });
    setPriceStr((p.price_cents / 100).toFixed(2).replace(".", ","));
    setOpen(true);
  };

  const save = async () => {
    const cents = Math.round(Number(priceStr.replace(/\./g, "").replace(",", ".")) * 100);
    const parsed = schema.safeParse({ ...form, price_cents: isNaN(cents) ? 0 : cents });
    if (!parsed.success) {
      toast({ title: "Dados inválidos", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    const payload = {
      name: parsed.data.name,
      description: parsed.data.description || null,
      type: parsed.data.type,
      billing_cycle: parsed.data.billing_cycle,
      price_cents: parsed.data.price_cents,
      active: form.active,
      sort_order: form.sort_order,
      whm_package: form.whm_package || null,
    };
    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert([payload]);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Produto atualizado" : "Produto criado" });
    setOpen(false);
    load();
  };

  const toggleActive = async (p: Product) => {
    const { error } = await supabase.from("products").update({ active: !p.active }).eq("id", p.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else load();
  };

  const remove = async (p: Product) => {
    if (!confirm(`Remover "${p.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Removido" }); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl">Catálogo</h2>
          <p className="text-sm text-muted-foreground">Planos recorrentes, serviços avulsos, add-ons e orçamentos customizados.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo produto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as Product["type"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plan">Plano</SelectItem>
                      <SelectItem value="service">Serviço avulso</SelectItem>
                      <SelectItem value="addon">Add-on</SelectItem>
                      <SelectItem value="custom">Customizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ciclo</Label>
                  <Select value={form.billing_cycle} onValueChange={(v) => setForm({ ...form, billing_cycle: v as Product["billing_cycle"] })}>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Preço (R$)</Label>
                  <Input value={priceStr} onChange={(e) => setPriceStr(e.target.value)} placeholder="0,00" />
                </div>
                <div>
                  <Label>Ordem</Label>
                  <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <span className="text-sm">Ativo (visível para clientes)</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Carregando…</div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhum produto cadastrado ainda.</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <Card key={p.id} className={p.active ? "" : "opacity-60"}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <Badge variant="secondary">{typeLabel[p.type]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                <div className="flex items-baseline gap-2">
                  <div className="font-display text-2xl">{fmt(p.price_cents)}</div>
                  <div className="text-xs text-muted-foreground">{cycleLabel[p.billing_cycle]}</div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <div className="flex items-center gap-2">
                    <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} />
                    <span className="text-xs text-muted-foreground">{p.active ? "Ativo" : "Inativo"}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(p)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
