import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Brand, FooterLink, NavLink } from "@/hooks/useBrand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { ImageUpload } from "./ImageUpload";
import { HslColorPicker } from "./HslColorPicker";

const GOOGLE_FONTS = [
  "Inter", "Poppins", "Montserrat", "Roboto", "Open Sans", "Lato", "Nunito",
  "Playfair Display", "Cormorant Garamond", "Libre Baskerville", "Merriweather",
  "DM Serif Display", "Space Grotesk", "Sora", "Manrope", "Outfit", "Figtree",
  "Bebas Neue", "Archivo Black", "Syne", "Plus Jakarta Sans", "Urbanist",
];

export function ContentPanel({ brand, onSaved }: { brand: Brand | null; onSaved: () => void }) {
  const [b, setB] = useState<Brand>(brand || {});
  const [links, setLinks] = useState<FooterLink[]>(
    Array.isArray(brand?.footer_links) ? brand!.footer_links! : []
  );
  const [navLinks, setNavLinks] = useState<NavLink[]>(
    Array.isArray(brand?.nav_links) ? brand!.nav_links! : []
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (brand) {
      setB(brand);
      setLinks(Array.isArray(brand.footer_links) ? brand.footer_links : []);
      setNavLinks(Array.isArray(brand.nav_links) ? brand.nav_links : []);
    }
  }, [brand]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...b, footer_links: links, nav_links: navLinks };
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

  const addNav = () => setNavLinks([...navLinks, { label: "", url: "" }]);
  const removeNav = (i: number) => setNavLinks(navLinks.filter((_, idx) => idx !== i));
  const updateNav = (i: number, key: keyof NavLink, val: string) =>
    setNavLinks(navLinks.map((l, idx) => (idx === i ? { ...l, [key]: val } : l)));

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Hero da Home */}
      <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4">
        <div>
          <h2 className="font-display text-xl">Tela inicial (Hero)</h2>
          <p className="text-xs text-muted-foreground mt-1">Os textos e imagem da página de boas-vindas.</p>
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
        <ImageUpload
          label="Imagem de fundo do hero"
          field="hero-bg"
          recommended="Paisagem, 1920 × 1080 px (16:9)"
          value={b.hero_background_url}
          onChange={(url) => setB({ ...b, hero_background_url: url })}
        />
        <div>
          <Label>Opacidade do overlay (0 a 1)</Label>
          <Input type="number" min={0} max={1} step={0.05} value={b.hero_overlay_opacity ?? 0.5} onChange={(e) => setB({ ...b, hero_overlay_opacity: parseFloat(e.target.value) })} />
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

      {/* Tipografia & Paleta extra */}
      <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4">
        <div>
          <h2 className="font-display text-xl">Tipografia</h2>
          <p className="text-xs text-muted-foreground mt-1">Fontes do Google Fonts aplicadas em todo o site.</p>
        </div>
        <div>
          <Label>Fonte de títulos</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={b.heading_font || ""} onChange={(e) => setB({ ...b, heading_font: e.target.value || null })}>
            <option value="">Padrão</option>
            {GOOGLE_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <Label>Fonte do corpo</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={b.body_font || ""} onChange={(e) => setB({ ...b, body_font: e.target.value || null })}>
            <option value="">Padrão</option>
            {GOOGLE_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4">
        <div>
          <h2 className="font-display text-xl">Paleta complementar</h2>
          <p className="text-xs text-muted-foreground mt-1">Use formato HSL: ex. <code>210 65% 24%</code></p>
        </div>
        <div>
          <Label>Secondary</Label>
          <HslColorPicker value={b.secondary_color} onChange={(v) => setB({ ...b, secondary_color: v })} placeholder="210 40% 96%" />
        </div>
        <div>
          <Label>Accent</Label>
          <HslColorPicker value={b.accent_color} onChange={(v) => setB({ ...b, accent_color: v })} placeholder="142 70% 45%" />
        </div>
        <div>
          <Label>Background</Label>
          <HslColorPicker value={b.background_color} onChange={(v) => setB({ ...b, background_color: v })} placeholder="0 0% 100%" />
        </div>
        <div>
          <Label>Foreground</Label>
          <HslColorPicker value={b.foreground_color} onChange={(v) => setB({ ...b, foreground_color: v })} placeholder="222 47% 11%" />
        </div>
      </div>

      {/* Auth */}
      <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4">
        <div>
          <h2 className="font-display text-xl">Tela de Login/Cadastro</h2>
          <p className="text-xs text-muted-foreground mt-1">Personalize a página /auth.</p>
        </div>
        <div>
          <Label>Título</Label>
          <Input value={b.auth_title || ""} onChange={(e) => setB({ ...b, auth_title: e.target.value })} placeholder="Entre ou crie sua conta" />
        </div>
        <div>
          <Label>Subtítulo</Label>
          <Input value={b.auth_subtitle || ""} onChange={(e) => setB({ ...b, auth_subtitle: e.target.value })} placeholder="Acesso" />
        </div>
        <div>
          <Label>Cor de destaque</Label>
          <HslColorPicker value={b.auth_accent_color} onChange={(v) => setB({ ...b, auth_accent_color: v })} placeholder="210 65% 24%" />
        </div>
        <ImageUpload
          label="Imagem lateral"
          field="auth-image"
          recommended="Vertical, 1000 × 1400 px (proporção ~5:7)"
          value={b.auth_image_url}
          onChange={(url) => setB({ ...b, auth_image_url: url })}
        />
      </div>

      {/* Proposta */}
      <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4">
        <div>
          <h2 className="font-display text-xl">Página da Proposta</h2>
          <p className="text-xs text-muted-foreground mt-1">Personalize a página pública /solucao/:id.</p>
        </div>
        <div>
          <Label>Título</Label>
          <Input value={b.proposal_title || ""} onChange={(e) => setB({ ...b, proposal_title: e.target.value })} placeholder="Solução Técnica Apresentada" />
        </div>
        <div>
          <Label>Texto introdutório</Label>
          <Textarea rows={2} value={b.proposal_intro || ""} onChange={(e) => setB({ ...b, proposal_intro: e.target.value })} />
        </div>
        <div>
          <Label>Texto após aceite</Label>
          <Textarea rows={2} value={b.proposal_after_accept || ""} onChange={(e) => setB({ ...b, proposal_after_accept: e.target.value })} placeholder="Esta proposta já foi formalizada..." />
        </div>
        <div>
          <Label>Cor de destaque</Label>
          <HslColorPicker value={b.proposal_accent_color} onChange={(v) => setB({ ...b, proposal_accent_color: v })} placeholder="210 65% 24%" />
        </div>
      </div>

      {/* Navegação */}
      <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4 lg:col-span-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl">Menu de navegação (topo)</h2>
            <p className="text-xs text-muted-foreground mt-1">Aparece no header das páginas públicas.</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addNav}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar item
          </Button>
        </div>
        {navLinks.length === 0 && <p className="text-xs text-muted-foreground">Nenhum link no menu.</p>}
        {navLinks.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
            <Input placeholder="Rótulo" value={l.label} onChange={(e) => updateNav(i, "label", e.target.value)} />
            <Input placeholder="https://... ou #ancora" value={l.url} onChange={(e) => updateNav(i, "url", e.target.value)} />
            <Button type="button" size="icon" variant="ghost" onClick={() => removeNav(i)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
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

      <div className="lg:col-span-2 sticky bottom-4">
        <Button onClick={save} disabled={saving} className="w-full h-12 shadow-elegant">
          {saving ? "Salvando..." : "Salvar tudo"}
        </Button>
      </div>
    </div>
  );
}
