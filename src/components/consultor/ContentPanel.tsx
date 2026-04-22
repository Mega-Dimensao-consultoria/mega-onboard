import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Brand, FooterLink } from "@/hooks/useBrand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

export function ContentPanel({ brand, onSaved }: { brand: Brand | null; onSaved: () => void }) {
  const [b, setB] = useState<Brand>(brand || {});
  const [links, setLinks] = useState<FooterLink[]>(
    Array.isArray(brand?.footer_links) ? brand!.footer_links! : []
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (brand) {
      setB(brand);
      setLinks(Array.isArray(brand.footer_links) ? brand.footer_links : []);
    }
  }, [brand]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...b, footer_links: links };
      const { error } = b.id
        ? await supabase.from("brand_settings").update(payload).eq("id", b.id)
        : await supabase.from("brand_settings").insert([payload]);
      if (error) throw error;
      toast({ title: "Conteúdo atualizado!" });
      onSaved();
    } catch (e) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addLink = () => setLinks([...links, { label: "", url: "" }]);
  const removeLink = (i: number) => setLinks(links.filter((_, idx) => idx !== i));
  const updateLink = (i: number, key: keyof FooterLink, val: string) =>
    setLinks(links.map((l, idx) => (idx === i ? { ...l, [key]: val } : l)));

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Hero da Home */}
      <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4">
        <div>
          <h2 className="font-display text-xl">Tela inicial (Hero)</h2>
          <p className="text-xs text-muted-foreground mt-1">Os textos da página de boas-vindas.</p>
        </div>
        <div>
          <Label>Badge</Label>
          <Input value={b.hero_badge || ""} onChange={(e) => setB({ ...b, hero_badge: e.target.value })} placeholder="Onboarding inteligente" />
        </div>
        <div>
          <Label>Título principal</Label>
          <Textarea rows={2} value={b.hero_title || ""} onChange={(e) => setB({ ...b, hero_title: e.target.value })} placeholder="Vamos desenhar o projeto certo para você." />
          <p className="text-[11px] text-muted-foreground mt-1">Dica: use *texto* para colocar uma palavra em itálico/destaque.</p>
        </div>
        <div>
          <Label>Subtítulo</Label>
          <Textarea rows={3} value={b.hero_subtitle || ""} onChange={(e) => setB({ ...b, hero_subtitle: e.target.value })} />
        </div>
        <div>
          <Label>Texto do botão</Label>
          <Input value={b.hero_cta_label || ""} onChange={(e) => setB({ ...b, hero_cta_label: e.target.value })} placeholder="Começar agora" />
        </div>
        <div>
          <Label>CTA "área do cliente"</Label>
          <Input value={b.client_login_cta || ""} onChange={(e) => setB({ ...b, client_login_cta: e.target.value })} placeholder="Acesse sua área do cliente" />
        </div>
      </div>

      {/* Sucesso & SEO */}
      <div className="space-y-6">
        <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4">
          <div>
            <h2 className="font-display text-xl">Mensagem de sucesso</h2>
            <p className="text-xs text-muted-foreground mt-1">Exibida após o lead enviar o formulário.</p>
          </div>
          <div>
            <Label>Título</Label>
            <Input value={b.success_title || ""} onChange={(e) => setB({ ...b, success_title: e.target.value })} placeholder="Tudo certo!" />
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea rows={3} value={b.success_message || ""} onChange={(e) => setB({ ...b, success_message: e.target.value })} />
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4">
          <div>
            <h2 className="font-display text-xl">SEO</h2>
            <p className="text-xs text-muted-foreground mt-1">Título da aba e descrição usada por buscadores.</p>
          </div>
          <div>
            <Label>Título do site (&lt;title&gt;)</Label>
            <Input value={b.site_title || ""} onChange={(e) => setB({ ...b, site_title: e.target.value })} placeholder="Prospekta · Onboarding" />
          </div>
          <div>
            <Label>Meta descrição</Label>
            <Textarea rows={2} maxLength={180} value={b.site_description || ""} onChange={(e) => setB({ ...b, site_description: e.target.value })} />
            <p className="text-[11px] text-muted-foreground mt-1">{(b.site_description || "").length}/160 caracteres ideais.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4 lg:col-span-2">
        <div>
          <h2 className="font-display text-xl">Rodapé</h2>
          <p className="text-xs text-muted-foreground mt-1">Texto e links exibidos no rodapé das páginas públicas.</p>
        </div>
        <div>
          <Label>Texto do rodapé</Label>
          <Input value={b.footer_text || ""} onChange={(e) => setB({ ...b, footer_text: e.target.value })} placeholder="© {year} Sua empresa" />
          <p className="text-[11px] text-muted-foreground mt-1">Use <code>{"{year}"}</code> para inserir o ano corrente automaticamente.</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Links do rodapé</Label>
            <Button type="button" size="sm" variant="outline" onClick={addLink}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar link
            </Button>
          </div>
          {links.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum link adicionado.</p>
          )}
          {links.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
              <Input placeholder="Rótulo" value={l.label} onChange={(e) => updateLink(i, "label", e.target.value)} />
              <Input placeholder="https://..." value={l.url} onChange={(e) => updateLink(i, "url", e.target.value)} />
              <Button type="button" size="icon" variant="ghost" onClick={() => removeLink(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2">
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? "Salvando..." : "Salvar conteúdo"}
        </Button>
      </div>
    </div>
  );
}
