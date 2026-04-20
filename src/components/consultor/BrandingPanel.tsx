import { useState } from "react";
import { consultor } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import type { Brand } from "@/hooks/useBrand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Search, Upload } from "lucide-react";

export function BrandingPanel({ brand, onSaved }: { brand: Brand | null; onSaved: () => void }) {
  const [b, setB] = useState<Brand>(brand || {});
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [colorHex, setColorHex] = useState(hslToHex(brand?.primary_color || "210 65% 24%"));

  const searchCNPJ = async () => {
    const cnpj = (b.cnpj || "").replace(/\D/g, "");
    if (cnpj.length !== 14) return toast({ title: "CNPJ deve ter 14 dígitos", variant: "destructive" });
    setSearching(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!res.ok) throw new Error("CNPJ não encontrado");
      const d = await res.json();
      setB((prev) => ({
        ...prev,
        razao_social: d.razao_social || prev.razao_social,
        nome_fantasia: d.nome_fantasia || prev.nome_fantasia,
        endereco: [d.logradouro, d.numero, d.bairro, d.municipio, d.uf, d.cep].filter(Boolean).join(", "),
        telefone: d.ddd_telefone_1 || prev.telefone,
        email: d.email || prev.email,
      }));
      toast({ title: "Dados preenchidos via BrasilAPI" });
    } catch (e) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const onLogo = async (file: File) => {
    try {
      const url = await consultor.uploadLogo(file);
      setB((p) => ({ ...p, logo_url: url }));
      toast({ title: "Logo enviada" });
    } catch (e) {
      toast({ title: "Erro upload", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await consultor.call("save-brand", { brand: { ...b, primary_color: hexToHsl(colorHex) } });
      toast({ title: "Marca atualizada!" });
      onSaved();
    } catch (e) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4">
        <h2 className="font-display text-xl">Identidade da empresa</h2>
        <div>
          <Label>CNPJ</Label>
          <div className="flex gap-2">
            <Input value={b.cnpj || ""} onChange={(e) => setB({ ...b, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
            <Button variant="secondary" onClick={searchCNPJ} disabled={searching}>
              <Search className="h-4 w-4 mr-2" />{searching ? "..." : "Buscar"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Preenche automaticamente via BrasilAPI.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Razão Social</Label><Input value={b.razao_social || ""} onChange={(e) => setB({ ...b, razao_social: e.target.value })} /></div>
          <div><Label>Nome Fantasia</Label><Input value={b.nome_fantasia || ""} onChange={(e) => setB({ ...b, nome_fantasia: e.target.value })} /></div>
        </div>
        <div><Label>Endereço</Label><Input value={b.endereco || ""} onChange={(e) => setB({ ...b, endereco: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Telefone</Label><Input value={b.telefone || ""} onChange={(e) => setB({ ...b, telefone: e.target.value })} /></div>
          <div><Label>E-mail</Label><Input value={b.email || ""} onChange={(e) => setB({ ...b, email: e.target.value })} /></div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-5">
        <h2 className="font-display text-xl">Aparência</h2>
        <div>
          <Label>Cor primária</Label>
          <div className="flex items-center gap-3 mt-1">
            <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} className="h-12 w-16 rounded border border-border cursor-pointer" />
            <Input value={colorHex} onChange={(e) => setColorHex(e.target.value)} className="font-mono" />
          </div>
        </div>
        <div>
          <Label>Logo</Label>
          <div className="flex items-center gap-4 mt-1">
            {b.logo_url && <img src={b.logo_url} alt="Logo" className="h-16 w-auto object-contain rounded border border-border p-1 bg-secondary/30" />}
            <label className="flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-secondary cursor-pointer text-sm">
              <Upload className="h-4 w-4" /> Enviar logo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} />
            </label>
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="w-full">{saving ? "Salvando..." : "Salvar alterações"}</Button>
      </div>
    </div>
  );
}

function hslToHex(hsl: string): string {
  const m = hsl.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  if (!m) return "#1e3a5f";
  const h = +m[1], s = +m[2] / 100, l = +m[3] / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): string {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return "210 65% 24%";
  const [r, g, b] = m.map((x) => parseInt(x, 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
