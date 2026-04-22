import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBrand } from "@/hooks/useBrand";
import { BrandHeader } from "@/components/BrandHeader";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileText, Receipt, Sparkles, CreditCard, User2, FolderKanban, LogOut, Eye, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getImpersonatedClientId, getImpersonatedClientName, stopImpersonate } from "@/lib/impersonate";

const items = [
  { to: "/cliente", icon: LayoutDashboard, label: "Início", end: true },
  { to: "/cliente/contratos", icon: FileText, label: "Contratos" },
  { to: "/cliente/faturas", icon: Receipt, label: "Faturas" },
  { to: "/cliente/servicos", icon: Sparkles, label: "Serviços" },
  { to: "/cliente/plano", icon: CreditCard, label: "Plano" },
  { to: "/cliente/projetos", icon: FolderKanban, label: "Projetos" },
  { to: "/cliente/perfil", icon: User2, label: "Perfil" },
];

export function ClienteLayout() {
  const { signOut, user, role } = useAuth();
  // Aplica a cor específica do cliente (se configurada) sobrescrevendo --primary
  useBrand("cliente");
  const navigate = useNavigate();
  const impersonatedId = getImpersonatedClientId();
  const impersonatedName = getImpersonatedClientName();
  const isImpersonating = role === "consultor" && !!impersonatedId;

  const exitImpersonate = () => {
    stopImpersonate();
    navigate("/consultor");
  };

  return (
    <div className="min-h-screen flex flex-col bg-secondary/30">
      {isImpersonating && (
        <div className="bg-warning text-warning-foreground px-4 py-2 text-sm flex items-center justify-center gap-3 flex-wrap">
          <Eye className="h-4 w-4" />
          <span>Modo visualização — você está vendo a área como <strong>{impersonatedName || "o cliente"}</strong>. Alterações são desencorajadas.</span>
          <Button size="sm" variant="outline" className="h-7" onClick={exitImpersonate}>
            <X className="h-3 w-3 mr-1" /> Sair do modo visualização
          </Button>
        </div>
      )}
      <BrandHeader rightSlot={
        isImpersonating ? (
          <Button variant="ghost" size="sm" onClick={exitImpersonate}>
            <X className="h-4 w-4 mr-2" /> Voltar ao painel
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/auth"); }}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        )
      } />
      <div className="flex-1 container py-8 grid lg:grid-cols-[220px_1fr] gap-8">
        <aside className="lg:sticky lg:top-24 self-start">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Área do cliente</div>
          <nav className="flex lg:flex-col gap-1 overflow-x-auto">
            {items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap",
                    isActive ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-foreground/80"
                  )
                }
              >
                <it.icon className="h-4 w-4" /> {it.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-6 text-xs text-muted-foreground hidden lg:block break-all">{user?.email}</div>
        </aside>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
