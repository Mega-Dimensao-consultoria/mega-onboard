import { supabase } from "@/integrations/supabase/client";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/consultor-api`;
const TOKEN_KEY = "prospekta.consultor.token";

export const consultor = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),

  async call(action: string, body: Record<string, unknown> = {}) {
    const res = await fetch(`${FN_URL}/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-consultor-token": consultor.getToken() || "",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro");
    return data;
  },

  async uploadLogo(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${FN_URL}/upload-logo`, {
      method: "POST",
      headers: {
        "x-consultor-token": consultor.getToken() || "",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro");
    return data.url as string;
  },

  async login(password: string) {
    const data = await this.call("login", { password });
    this.setToken(data.token);
    return data;
  },

  async verify() {
    if (!this.getToken()) return false;
    try { await this.call("verify"); return true; } catch { return false; }
  },
};

export { supabase };
