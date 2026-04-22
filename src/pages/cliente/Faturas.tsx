import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtMoney, fmtDate, invoiceStatusLabel } from "@/lib/format";
import { Receipt, ArrowRight } from "lucide-react";

type Invoice = { id: string; total_cents: number; status: string; due_date: string; period_start: string | null; period_end: string | null };

const variantFor = (s: string) => s === "paid" ? "default" : s === "overdue" ? "destructive" : "secondary";

export default function Faturas() {
  const { user } = useAuth();
  const [items, setItems] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "paid" | "overdue">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("invoices").select("*").eq("client_id", user.id).order("due_date", { ascending: false })
      .then(({ data }) => { setItems((data as Invoice[]) || []); setLoading(false); });
  }, [user]);

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Faturas</div>
        <h1 className="font-display text-4xl">Histórico de faturas</h1>
        <p className="text-muted-foreground mt-1">Visualize e pague suas faturas.</p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="open">Em aberto</TabsTrigger>
          <TabsTrigger value="overdue">Vencidas</TabsTrigger>
          <TabsTrigger value="paid">Pagas</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Carregando…</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma fatura {filter !== "all" ? "neste filtro" : "ainda"}.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((i) => (
            <Card key={i.id}>
              <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="font-display text-2xl">{fmtMoney(i.total_cents)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Vencimento: {fmtDate(i.due_date)}
                    {i.period_start && i.period_end && ` · Período ${fmtDate(i.period_start)} a ${fmtDate(i.period_end)}`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={variantFor(i.status)}>{invoiceStatusLabel[i.status] || i.status}</Badge>
                  <Button asChild variant="outline" size="sm"><Link to={`/cliente/faturas/${i.id}`}>Detalhes <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
