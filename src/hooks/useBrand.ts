import { useEffect, useState } from "react";
import { consultor } from "@/lib/api";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/consultor-api`;

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

async function fetchPublicBrand(): Promise<Brand | null> {
  try {
    const res = await fetch(`${FN_URL}/public-brand`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: "{}",
    });
    const j = await res.json();
    return (j?.brand ?? null) as Brand | null;
  } catch {
    return null;
  }
}

async function fetchAuthenticatedBrand(): Promise<Brand | null> {
  try {
    const data = await consultor.call("brand-detail");
    return (data?.brand ?? null) as Brand | null;
  } catch {
    return null;
  }
}

export function useBrand() {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const hasToken = !!consultor.getToken();
    const data = hasToken ? await fetchAuthenticatedBrand() : await fetchPublicBrand();
    setBrand(data);
    setLoading(false);
    if (data?.primary_color) {
      document.documentElement.style.setProperty("--primary", data.primary_color);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const hasToken = !!consultor.getToken();
      const data = hasToken ? await fetchAuthenticatedBrand() : await fetchPublicBrand();
      if (!mounted) return;
      setBrand(data);
      setLoading(false);
      if (data?.primary_color) {
        document.documentElement.style.setProperty("--primary", data.primary_color);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { brand, loading, refresh: load };
}
