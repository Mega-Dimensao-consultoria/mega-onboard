// Impersonate (read-only): consultor visualiza a área do cliente como ele veria.
// Armazena o client_id alvo no sessionStorage para que páginas /cliente/* usem esse id
// em vez do auth.uid() do consultor. As políticas RLS continuam vigentes — o consultor
// já tem acesso de leitura via has_role(..., 'consultor'), então não há escalonamento.

const KEY = "impersonate_client_id";
const NAME_KEY = "impersonate_client_name";

export function startImpersonate(clientId: string, clientName?: string | null) {
  sessionStorage.setItem(KEY, clientId);
  if (clientName) sessionStorage.setItem(NAME_KEY, clientName);
}

export function stopImpersonate() {
  sessionStorage.removeItem(KEY);
  sessionStorage.removeItem(NAME_KEY);
}

export function getImpersonatedClientId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(KEY);
}

export function getImpersonatedClientName(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(NAME_KEY);
}
