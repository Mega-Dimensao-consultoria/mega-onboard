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
};

export function useBrand() {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.from("brand_settings").select("*").limit(1).maybeSingle().then(({ data }) => {
      if (!mounted) return;
      setBrand(data as Brand | null);
      setLoading(false);
      if (data?.primary_color) {
        document.documentElement.style.setProperty("--primary", data.primary_color);
      }
    });
    return () => { mounted = false; };
  }, []);

  return { brand, loading, refresh: async () => {
    const { data } = await supabase.from("brand_settings").select("*").limit(1).maybeSingle();
    setBrand(data as Brand | null);
    if (data?.primary_color) document.documentElement.style.setProperty("--primary", data.primary_color);
  }};
}
