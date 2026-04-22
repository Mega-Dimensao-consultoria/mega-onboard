import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FooterLink = { label: string; url: string };

export type Brand = {
  id?: string;
  cnpj?: string | null;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
  primary_color?: string | null;
  logo_url?: string | null;
  pix_key?: string | null;
  pix_key_type?: string | null;
  paypal_username?: string | null;
  // Conteúdo da home pública
  hero_badge?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  hero_cta_label?: string | null;
  success_title?: string | null;
  success_message?: string | null;
  // Footer & SEO
  footer_text?: string | null;
  footer_links?: FooterLink[] | null;
  site_title?: string | null;
  site_description?: string | null;
  // Cliente
  client_primary_color?: string | null;
  client_login_cta?: string | null;
};

async function fetchBrand(): Promise<Brand | null> {
  const { data } = await supabase
    .from("brand_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as Brand) ?? null;
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
    const color =
      scope === "cliente" && b?.client_primary_color
        ? b.client_primary_color
        : b?.primary_color;
    if (color) {
      document.documentElement.style.setProperty("--primary", color);
    }
    if (b?.site_title) document.title = b.site_title;
    if (b?.site_description) {
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
