// Impersonate (read-only): consultor visualiza a área do cliente como ele veria.
// Armazena o client_id alvo no sessionStorage para que páginas /cliente/* usem esse id
// em vez do auth.uid() do consultor. As políticas RLS continuam vigentes — o consultor
// já tem acesso de leitura via has_role(..., 'consultor'), então não há escalonamento.

import { supabase } from "@/integrations/supabase/client";

const KEY = "impersonate_client_id";
const NAME_KEY = "impersonate_client_name";

export async function startImpersonate(clientId: string, clientName?: string | null) {
  sessionStorage.setItem(KEY, clientId);
  if (clientName) sessionStorage.setItem(NAME_KEY, clientName);
  // Best-effort audit log
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("audit_log").insert([{
    actor_user_id: user?.id ?? null,
    action: "impersonate_start",
    target_type: "client",
    target_id: clientId,
    metadata: clientName ? { name: clientName } : null,
  }]);
}

export async function stopImpersonate() {
  const clientId = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  sessionStorage.removeItem(NAME_KEY);
  if (clientId) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("audit_log").insert([{
      actor_user_id: user?.id ?? null,
      action: "impersonate_stop",
      target_type: "client",
      target_id: clientId,
    }]);
  }
}

export function getImpersonatedClientId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(KEY);
}

export function getImpersonatedClientName(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(NAME_KEY);
}
