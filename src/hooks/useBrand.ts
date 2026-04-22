import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export function useBrand() {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  const apply = (b: Brand | null) => {
    setBrand(b);
    setLoading(false);
    if (b?.primary_color) {
      document.documentElement.style.setProperty("--primary", b.primary_color);
    }
  };

  const refresh = async () => apply(await fetchBrand());

  useEffect(() => {
    let mounted = true;
    fetchBrand().then((b) => { if (mounted) apply(b); });
    return () => { mounted = false; };
  }, []);

  return { brand, loading, refresh };
}
