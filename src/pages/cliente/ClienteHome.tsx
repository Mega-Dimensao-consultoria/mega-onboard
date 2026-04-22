import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtMoney, fmtDate, contractStatusLabel, invoiceStatusLabel } from "@/lib/format";
import { ArrowRight, FileText, Receipt, AlertCircle } from "lucide-react";

type Contract = { id: string; status: string; created_at: string };
type Invoice = { id: string; total_cents: number; status: string; due_date: string };

export default function ClienteHome() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: cs }, { data: is }] = await Promise.all([
        supabase.from("contracts").select("id, status, created_at").eq("client_id", user.id).order("created_at", { ascending: false }),
        supabase.from("invoices").select("id, total_cents, status, due_date").eq("client_id", user.id).order("due_date", { ascending: true }),
      ]);
      setContracts((cs as Contract[]) || []);
      setInvoices((is as Invoice[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const activeContracts = contracts.filter((c) => c.status === "active").length;
  const openInvoices = invoices.filter((i) => i.status === "open" || i.status === "overdue");
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;
  const next = openInvoices[0];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Bem-vindo</div>
        <h1 className="font-display text-4xl">{user?.user_metadata?.full_name || "Cliente"}</h1>
        <p className="text-muted-foreground mt-1">Acompanhe seus contratos, faturas e serviços contratados.</p>
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
