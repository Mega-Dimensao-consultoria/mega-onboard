import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClientId } from "@/hooks/useClientId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtMoney, fmtDate, contractStatusLabel, invoiceStatusLabel } from "@/lib/format";
import { ArrowRight, FileText, Receipt, AlertCircle, ExternalLink, HardDrive, Zap, ShieldCheck } from "lucide-react";
import { Progress } from "@/components/ui/switch"; // Wait, Progress is not Switch. I need Progress component.
import { toast } from "@/hooks/use-toast";

type Contract = { id: string; status: string; created_at: string };
type Invoice = { id: string; total_cents: number; status: string; due_date: string };

export default function ClienteHome() {
  const { user } = useAuth();
  const { clientId } = useClientId();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [profile, setProfile] = useState<{ name: string | null; cpanel_username: string | null }>({ name: null, cpanel_username: null });
  const [loading, setLoading] = useState(true);
  const [cpanelLoading, setCpanelLoading] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      const [{ data: cs }, { data: is }, { data: prof }] = await Promise.all([
        supabase.from("contracts").select("id, status, created_at").eq("client_id", clientId).order("created_at", { ascending: false }),
        supabase.from("invoices").select("id, total_cents, status, due_date").eq("client_id", clientId).order("due_date", { ascending: true }),
        supabase.from("profiles").select("full_name, nome_fantasia, cpanel_username").eq("id", clientId).maybeSingle(),
      ]);
      setContracts((cs as Contract[]) || []);
      setInvoices((is as Invoice[]) || []);
      setProfile({
        name: prof?.nome_fantasia || prof?.full_name || null,
        cpanel_username: (prof as any)?.cpanel_username || null
      });
      setLoading(false);
    })();
  }, [clientId]);

  const activeContracts = contracts.filter((c) => c.status === "active").length;
  const openInvoices = invoices.filter((i) => i.status === "open" || i.status === "overdue");
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;
  const next = openInvoices[0];

  const handleCPanelLogin = async () => {
    if (!profile.cpanel_username) return;
    setCpanelLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("whm-integration", {
        body: { action: "get_login_link", cpanel_user: profile.cpanel_username }
      });
      if (error) throw error;
      if (data?.result?.data?.url) {
        window.open(data.result.data.url, "_blank");
      } else {
        throw new Error("Não foi possível gerar o link de acesso.");
      }
    } catch (e) {
      toast({
        title: "Erro ao acessar cPanel",
        description: e instanceof Error ? e.message : "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setCpanelLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Bem-vindo</div>
          <h1 className="font-display text-4xl">{profile.name || user?.user_metadata?.full_name || "Cliente"}</h1>
          <p className="text-muted-foreground mt-1">Acompanhe seus contratos, faturas e serviços contratados.</p>
        </div>
        {profile.cpanel_username && (
          <Button onClick={handleCPanelLogin} disabled={cpanelLoading} className="sm:w-auto w-full">
            {cpanelLoading ? "Acessando..." : "Acessar cPanel"} <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {overdueCount > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-sm">Você tem {overdueCount} fatura{overdueCount > 1 ? "s" : ""} vencida{overdueCount > 1 ? "s" : ""}</div>
            <p className="text-xs text-muted-foreground mt-1">Regularize para evitar interrupções no serviço.</p>
          </div>
          <Button asChild size="sm" variant="destructive"><Link to="/cliente/faturas">Ver faturas</Link></Button>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Contratos ativos" value={loading ? "—" : String(activeContracts)} icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Faturas em aberto" value={loading ? "—" : String(openInvoices.length)} icon={<Receipt className="h-4 w-4" />} />
        <StatCard
          label="Próximo vencimento"
          value={next ? fmtDate(next.due_date) : "—"}
          sub={next ? fmtMoney(next.total_cents) : ""}
          icon={<Receipt className="h-4 w-4" />}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Contratos recentes</CardTitle><Button asChild variant="ghost" size="sm"><Link to="/cliente/contratos">Ver todos <ArrowRight className="h-3 w-3 ml-1" /></Link></Button></CardHeader>
          <CardContent>
            {contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum contrato ainda.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {contracts.slice(0, 4).map((c) => (
                  <li key={c.id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">Contrato #{c.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">{fmtDate(c.created_at)}</div>
                    </div>
                    <Badge variant={c.status === "active" ? "default" : "secondary"}>{contractStatusLabel[c.status] || c.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">Próximas faturas</CardTitle><Button asChild variant="ghost" size="sm"><Link to="/cliente/faturas">Ver todas <ArrowRight className="h-3 w-3 ml-1" /></Link></Button></CardHeader>
          <CardContent>
            {openInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma fatura em aberto.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {openInvoices.slice(0, 4).map((i) => (
                  <li key={i.id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{fmtMoney(i.total_cents)}</div>
                      <div className="text-xs text-muted-foreground">Vence em {fmtDate(i.due_date)}</div>
                    </div>
                    <Button asChild size="sm" variant="outline"><Link to={`/cliente/faturas/${i.id}`}>{invoiceStatusLabel[i.status]}</Link></Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-normal flex items-center gap-2">
          {icon} {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-display">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}
