import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { getImpersonatedClientId } from "@/lib/impersonate";

/**
 * Retorna o id do "cliente atual" para uso nas páginas /cliente/*.
 * Se o consultor estiver impersonando, retorna o id do cliente impersonado.
 * Caso contrário, retorna o user.id do usuário autenticado.
 */
export function useClientId() {
  const { user, role } = useAuth();
  const [impersonating, setImpersonating] = useState<string | null>(null);

  useEffect(() => {
    setImpersonating(getImpersonatedClientId());
    const onStorage = () => setImpersonating(getImpersonatedClientId());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isImpersonating = role === "consultor" && !!impersonating;
  return {
    clientId: isImpersonating ? impersonating! : user?.id ?? null,
    isImpersonating,
    realUserId: user?.id ?? null,
  };
}
