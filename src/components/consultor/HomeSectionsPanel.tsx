import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";

type Kind = "features" | "testimonials" | "faq" | "cta" | "logos";

type Section = {
  id: string;
  kind: Kind;
  title: string | null;
  subtitle: string | null;
  content: unknown;
  visible: boolean;
  sort_order: number;
};

const KIND_LABEL: Record<Kind, string> = {
  features: "Diferenciais (3 colunas)",
  testimonials: "Depoimentos",
  faq: "Perguntas frequentes",
  cta: "Chamada para ação",
  logos: "Logos de clientes",
};

const DEFAULT_CONTENT: Record<Kind, unknown> = {
  features: [{ title: "Título", description: "Descrição curta." }],
  testimonials: [{ name: "Nome", role: "Cargo", quote: "Depoimento aqui." }],
  faq: [{ question: "Pergunta?", answer: "Resposta." }],
  cta: { button_label: "Saiba mais", button_url: "#" },
  logos: [{ name: "Cliente", url: "" }],
};

export function HomeSectionsPanel() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("home_sections")
      .select("*")
      .order("sort_order", { ascending: true });
    setSections((data as unknown as Section[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addSection = async (kind: Kind) => {
    const next_order = (sections[sections.length - 1]?.sort_order ?? -1) + 1;
    const { error } = await supabase.from("home_sections").insert({
      kind,
      title: KIND_LABEL[kind],
      subtitle: null,
      content: DEFAULT_CONTENT[kind] as never,
      visible: true,
      sort_order: next_order,
    });
    if (error) {
      toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Bloco adicionado" });
    load();
  };

  const updateLocal = (id: string, patch: Partial<Section>) =>
    setSections((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const persist = async (s: Section) => {
    setSavingId(s.id);
    const { error } = await supabase
      .from("home_sections")
      .update({
        title: s.title,
        subtitle: s.subtitle,
        content: s.content as never,
        visible: s.visible,
        sort_order: s.sort_order,
      })
      .eq("id", s.id);
    setSavingId(null);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Bloco salvo" });
  };

  const removeSection = async (id: string) => {
    if (!confirm("Remover este bloco?")) return;
    const { error } = await supabase.from("home_sections").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = sections.findIndex((s) => s.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sections.length) return;
    const a = sections[idx];
    const b = sections[swapIdx];
    const newList = [...sections];
    newList[idx] = { ...b, sort_order: a.sort_order };
    newList[swapIdx] = { ...a, sort_order: b.sort_order };
    setSections(newList);
    await Promise.all([
      supabase.from("home_sections").update({ sort_order: a.sort_order }).eq("id", b.id),
      supabase.from("home_sections").update({ sort_order: b.sort_order }).eq("id", a.id),
    ]);
    load();
  };

  const toggleVisible = async (s: Section) => {
    const next = !s.visible;
    updateLocal(s.id, { visible: next });
    await supabase.from("home_sections").update({ visible: next }).eq("id", s.id);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border/60 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl">Blocos extras da Home</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Adicione, reordene e personalize seções abaixo do hero da página inicial pública.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
            <Button key={k} variant="outline" size="sm" onClick={() => addSection(k)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> {KIND_LABEL[k]}
            </Button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {!loading && sections.length === 0 && (
        <p className="text-sm text-muted-foreground bg-card border border-dashed border-border/60 rounded-2xl p-8 text-center">
          Nenhum bloco. Use os botões acima para criar.
        </p>
      )}

      {sections.map((s, i) => (
        <div key={s.id} className="bg-card rounded-2xl border border-border/60 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
                {KIND_LABEL[s.kind]}
              </span>
              <Button size="icon" variant="ghost" onClick={() => move(s.id, -1)} disabled={i === 0}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => move(s.id, 1)} disabled={i === sections.length - 1}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => toggleVisible(s)}>
                {s.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => persist(s)} disabled={savingId === s.id}>
                {savingId === s.id ? "Salvando…" : "Salvar"}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => removeSection(s.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Título</Label>
              <Input value={s.title || ""} onChange={(e) => updateLocal(s.id, { title: e.target.value })} />
            </div>
            <div>
              <Label>Subtítulo</Label>
              <Input value={s.subtitle || ""} onChange={(e) => updateLocal(s.id, { subtitle: e.target.value })} />
            </div>
          </div>

          <ContentEditor section={s} onChange={(content) => updateLocal(s.id, { content })} />
        </div>
      ))}
    </div>
  );
}

function ContentEditor({ section, onChange }: { section: Section; onChange: (c: unknown) => void }) {
  if (section.kind === "cta") {
    const c = (section.content as { button_label?: string; button_url?: string }) || {};
    return (
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label>Texto do botão</Label>
          <Input value={c.button_label || ""} onChange={(e) => onChange({ ...c, button_label: e.target.value })} />
        </div>
        <div>
          <Label>URL do botão</Label>
          <Input value={c.button_url || ""} onChange={(e) => onChange({ ...c, button_url: e.target.value })} />
        </div>
      </div>
    );
  }

  const items = (section.content as Array<Record<string, string>>) || [];
  const fields = fieldsFor(section.kind);

  const update = (i: number, key: string, val: string) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, Object.fromEntries(fields.map((f) => [f.key, ""]))]);

  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-lg border border-border/60 p-3 space-y-2 bg-secondary/20">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Item {i + 1}</span>
            <Button size="icon" variant="ghost" onClick={() => remove(i)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-2">
            {fields.map((f) =>
              f.long ? (
                <div key={f.key} className="md:col-span-2">
                  <Label>{f.label}</Label>
                  <Textarea rows={2} value={it[f.key] || ""} onChange={(e) => update(i, f.key, e.target.value)} />
                </div>
              ) : (
                <div key={f.key}>
                  <Label>{f.label}</Label>
                  <Input value={it[f.key] || ""} onChange={(e) => update(i, f.key, e.target.value)} />
                </div>
              )
            )}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar item
      </Button>
    </div>
  );
}

function fieldsFor(kind: Kind): Array<{ key: string; label: string; long?: boolean }> {
  switch (kind) {
    case "features":
      return [
        { key: "title", label: "Título" },
        { key: "description", label: "Descrição", long: true },
      ];
    case "testimonials":
      return [
        { key: "name", label: "Nome" },
        { key: "role", label: "Cargo" },
        { key: "quote", label: "Depoimento", long: true },
      ];
    case "faq":
      return [
        { key: "question", label: "Pergunta" },
        { key: "answer", label: "Resposta", long: true },
      ];
    case "logos":
      return [
        { key: "name", label: "Nome" },
        { key: "url", label: "URL da imagem" },
      ];
    default:
      return [];
  }
}
