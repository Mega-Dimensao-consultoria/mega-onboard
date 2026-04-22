import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { getImpersonatedClientId } from "@/lib/impersonate";

export function RequireAuth({ children, role }: { children: React.ReactNode; role?: AppRole }) {
  const { user, role: userRole, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando…</div>;
  }
  if (!user) {
    return <Navigate to={`/auth?next=${encodeURIComponent(loc.pathname)}`} replace />;
  }
  if (role && userRole !== role) {
    // Permite consultor entrar em /cliente quando estiver impersonando
    const impersonating = getImpersonatedClientId();
    if (role === "cliente" && userRole === "consultor" && impersonating) {
      return <>{children}</>;
    }
    return <Navigate to={userRole === "consultor" ? "/consultor" : "/cliente"} replace />;
  }
  return <>{children}</>;
}
