import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/format";
import {
  TrendingUp, Users, FileText, Receipt, AlertCircle, CheckCircle2,
  ArrowUpRight, Activity, Loader2, Server, ServerCrash, Cpu,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

type Metrics = {
  mrrCents: number;
  activeContracts: number;
  totalClients: number;
  newLeadsMonth: number;
  totalLeads: number;
  conversionRate: number;
  invoicesOpen: number;
  invoicesOpenCents: number;
  invoicesOverdue: number;
  invoicesOverdueCents: number;
  invoicesPaidMonth: number;
  invoicesPaidMonthCents: number;
  recentActivity: { action: string; created_at: string; metadata: Record<string, unknown> | null }[];
};

const startOfMonthIso = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
};

export function DashboardPanel() {
  const [m, setM] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [serverLoading, setServerStatusLoading] = useState(false);

  const fetchServerStatus = async () => {
    setServerStatusLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("whm-integration", {
        body: { action: "get_server_status", cpanel_user: "admin" } // user doesn't matter for this action
      });
      if (error) throw error;
      if (data?.ok) setServerStatus(data.result);
    } catch (e) {
      console.error("Server status error", e);
    } finally {
      setServerStatusLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const monthStart = startOfMonthIso();
      const today = new Date().toISOString().slice(0, 10);

      const [
        contractItemsRes, contractsRes, clientsRes, leadsTotalRes, leadsMonthRes,
        invoicesRes, auditRes,
      ] = await Promise.all([
        supabase.from("contract_items").select("billing_cycle, quantity, custom_price_cents, product_id, active").eq("active", true),
        supabase.from("contracts").select("id, status").eq("status", "active"),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "cliente"),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
        supabase.from("invoices").select("status, total_cents, due_date, paid_at"),
        supabase.from("audit_log").select("action, created_at, metadata").order("created_at", { ascending: false }).limit(8),
      ]);

      // MRR: precisamos dos preços dos produtos vinculados
      const items = (contractItemsRes.data || []) as { billing_cycle: string; quantity: number; custom_price_cents: number | null; product_id: string | null }[];
      const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean) as string[])];
      let priceMap: Record<string, number> = {};
      if (productIds.length) {
        const { data: prods } = await supabase.from("products").select("id, price_cents").in("id", productIds);
        priceMap = Object.fromEntries((prods || []).map((p) => [p.id, p.price_cents]));
      }
      let mrr = 0;
      for (const it of items) {
        const price = it.custom_price_cents ?? (it.product_id ? priceMap[it.product_id] : 0) ?? 0;
        const monthly =
          it.billing_cycle === "monthly" ? price :
          it.billing_cycle === "quarterly" ? price / 3 :
          it.billing_cycle === "yearly" ? price / 12 : 0;
        mrr += monthly * (it.quantity || 1);
      }

      const invs = (invoicesRes.data || []) as { status: string; total_cents: number; due_date: string; paid_at: string | null }[];
      const open = invs.filter((i) => i.status === "open" && i.due_date >= today);
      const overdue = invs.filter((i) => i.status === "open" && i.due_date < today || i.status === "overdue");
      const paidMonth = invs.filter((i) => i.status === "paid" && i.paid_at && i.paid_at >= monthStart);

      const totalLeads = leadsTotalRes.count || 0;
      const newLeadsMonth = leadsMonthRes.count || 0;
      const totalClients = clientsRes.count || 0;
      const conversion = totalLeads > 0 ? (totalClients / totalLeads) * 100 : 0;

      setM({
        mrrCents: Math.round(mrr),
        activeContracts: (contractsRes.data || []).length,
        totalClients,
        newLeadsMonth,
        totalLeads,
        conversionRate: conversion,
        invoicesOpen: open.length,
        invoicesOpenCents: open.reduce((s, i) => s + i.total_cents, 0),
        invoicesOverdue: overdue.length,
        invoicesOverdueCents: overdue.reduce((s, i) => s + i.total_cents, 0),
        invoicesPaidMonth: paidMonth.length,
        invoicesPaidMonthCents: paidMonth.reduce((s, i) => s + i.total_cents, 0),
        recentActivity: (auditRes.data as Metrics["recentActivity"]) || [],
      });
      setLoading(false);
    })();
    fetchServerStatus();
  }, []);

  if (loading || !m) {
    return (
      <div className="grid place-items-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="MRR estimado"
          value={fmtMoney(m.mrrCents)}
          icon={TrendingUp}
          accent="primary"
          hint={`${m.activeContracts} contrato${m.activeContracts !== 1 ? "s" : ""} ativo${m.activeContracts !== 1 ? "s" : ""}`}
        />
        <KpiCard
          label="Faturas em aberto"
          value={String(m.invoicesOpen)}
          icon={Receipt}
          accent="muted"
          hint={fmtMoney(m.invoicesOpenCents)}
        />
        <KpiCard
          label="Vencidas"
          value={String(m.invoicesOverdue)}
          icon={AlertCircle}
          accent="destructive"
          hint={fmtMoney(m.invoicesOverdueCents)}
        />
        <KpiCard
          label="Recebido no mês"
          value={fmtMoney(m.invoicesPaidMonthCents)}
          icon={CheckCircle2}
          accent="success"
          hint={`${m.invoicesPaidMonth} fatura${m.invoicesPaidMonth !== 1 ? "s" : ""}`}
        />
      </div>

      {/* Funil */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Novos leads no mês"
          value={String(m.newLeadsMonth)}
          icon={ArrowUpRight}
          accent="muted"
          hint={`${m.totalLeads} no histórico`}
        />
        <KpiCard
          label="Clientes ativos"
          value={String(m.totalClients)}
          icon={Users}
          accent="muted"
        />
        <KpiCard
          label="Conversão lead → cliente"
          value={`${m.conversionRate.toFixed(1)}%`}
          icon={FileText}
          accent="muted"
        />
      </div>

      {/* Atividade recente */}
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg">Atividade recente</h2>
        </div>
        {m.recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
        ) : (
          <ul className="space-y-2">
            {m.recentActivity.map((a, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-2 border-b border-border/40 last:border-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{labelAction(a.action)}</div>
                  {a.metadata && Object.keys(a.metadata).length > 0 && (
                    <div className="text-xs text-muted-foreground truncate">
                      {Object.entries(a.metadata).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
                    </div>
                  )}
                </div>
                <time className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(a.created_at).toLocaleString("pt-BR")}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const accentClasses: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  destructive: "bg-destructive/10 text-destructive",
  success: "bg-emerald-500/10 text-emerald-600",
  muted: "bg-muted text-muted-foreground",
};

function KpiCard({
  label, value, hint, icon: Icon, accent = "muted",
}: {
  label: string; value: string; hint?: string;
  icon: React.ComponentType<{ className?: string }>; accent?: keyof typeof accentClasses;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-md transition">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className={`h-8 w-8 grid place-items-center rounded-lg ${accentClasses[accent]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="font-display text-2xl">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function labelAction(a: string): string {
  const map: Record<string, string> = {
    mark_invoice_paid: "Fatura marcada como paga",
    proposal_accepted: "Proposta aceita por cliente",
    impersonate_start: "Iniciou visualização como cliente",
    impersonate_stop: "Encerrou visualização como cliente",
    contract_created: "Contrato criado",
    contract_updated: "Contrato atualizado",
    invoice_created: "Fatura criada",
    lead_deleted: "Lead removido",
  };
  return map[a] || a;
}
