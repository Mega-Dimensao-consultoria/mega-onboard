import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FooterLink = { label: string; url: string };
export type NavLink = { label: string; url: string };

export type HomeSection = {
  id: string;
  kind: "features" | "testimonials" | "faq" | "cta" | "logos";
  title: string | null;
  subtitle: string | null;
  content: unknown; // shape varies per kind, see HomeSections renderer
  visible: boolean;
  sort_order: number;
};

export type Brand = {
  id?: string;
  cnpj?: string | null;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
  // Paleta pública
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  background_color?: string | null;
  foreground_color?: string | null;
  // Paleta cliente
  client_primary_color?: string | null;
  client_secondary_color?: string | null;
  client_accent_color?: string | null;
  client_background_color?: string | null;
  client_foreground_color?: string | null;
  // Tipografia
  heading_font?: string | null;
  body_font?: string | null;
  // Logos
  logo_url?: string | null;
  client_logo_url?: string | null;
  // Pagamento
  pix_key?: string | null;
  pix_key_type?: string | null;
  paypal_env?: "sandbox" | "live" | null;
  paypal_client_id?: string | null;
  paypal_client_secret?: string | null;
  // Hero
  hero_badge?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  hero_cta_label?: string | null;
  hero_background_url?: string | null;
  hero_overlay_opacity?: number | null;
  // Sucesso
  success_title?: string | null;
  success_message?: string | null;
  // Auth
  auth_title?: string | null;
  auth_subtitle?: string | null;
  auth_image_url?: string | null;
  auth_accent_color?: string | null;
  // Proposta
  proposal_title?: string | null;
  proposal_intro?: string | null;
  proposal_after_accept?: string | null;
  proposal_accent_color?: string | null;
  // Footer & Nav & SEO
  footer_text?: string | null;
  footer_links?: FooterLink[] | null;
  nav_links?: NavLink[] | null;
  site_title?: string | null;
  site_description?: string | null;
  // Cliente
  client_login_cta?: string | null;
};

async function fetchBrand(): Promise<Brand | null> {
  const { data: sess } = await supabase.auth.getSession();
  if (sess?.session) {
    // Consultor: SELECT * (inclui credenciais sensíveis). RLS bloqueia para não-consultor.
    const { data } = await supabase
      .from("brand_settings")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (data) return data as unknown as Brand;
    // Cliente autenticado: usa RPC que omite credenciais sensíveis
    const { data: rpc } = await supabase.rpc("get_brand_for_authenticated");
    const row = Array.isArray(rpc) && rpc.length > 0 ? rpc[0] : null;
    return (row as unknown as Brand) ?? null;
  }
  const { data } = await supabase.rpc("get_public_brand");
  const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
  return (row as unknown as Brand) ?? null;
}

const loadedFonts = new Set<string>();

function loadGoogleFont(family: string) {
  if (!family || loadedFonts.has(family)) return;
  loadedFonts.add(family);
  const id = `gf-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

function setVar(name: string, value?: string | null) {
  if (value && value.trim()) document.documentElement.style.setProperty(name, value);
}

/**
 * useBrand
 * @param scope "public" (default) usa primary_color; "cliente" usa client_primary_color quando definida.
 */
export function useBrand(scope: "public" | "cliente" = "public") {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  const apply = (b: Brand | null) => {
    setBrand(b);
    setLoading(false);
    if (!b) return;

    const pick = (cli?: string | null, pub?: string | null) =>
      scope === "cliente" && cli ? cli : pub;

    setVar("--primary", pick(b.client_primary_color, b.primary_color));
    setVar("--secondary", pick(b.client_secondary_color, b.secondary_color));
    setVar("--accent", pick(b.client_accent_color, b.accent_color));
    setVar("--background", pick(b.client_background_color, b.background_color));
    setVar("--foreground", pick(b.client_foreground_color, b.foreground_color));

    if (b.heading_font) {
      loadGoogleFont(b.heading_font);
      document.documentElement.style.setProperty("--font-display", `"${b.heading_font}", serif`);
    }
    if (b.body_font) {
      loadGoogleFont(b.body_font);
      document.documentElement.style.setProperty("--font-sans", `"${b.body_font}", sans-serif`);
    }

    if (b.site_title) document.title = b.site_title;
    if (b.site_description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "description");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", b.site_description);
    }
  };

  const refresh = async () => apply(await fetchBrand());

  useEffect(() => {
    let mounted = true;
    fetchBrand().then((b) => {
      if (mounted) apply(b);
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  return { brand, loading, refresh };
}
