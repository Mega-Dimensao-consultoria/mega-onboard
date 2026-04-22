import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, ScrollText, Search } from "lucide-react";

type Entry = {
  id: string;
  action: string;
  actor_user_id: string | null;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const ACTION_LABELS: Record<string, string> = {
  mark_invoice_paid: "Fatura paga",
  proposal_accepted: "Proposta aceita",
  impersonate_start: "Início impersonate",
  impersonate_stop: "Fim impersonate",
  contract_created: "Contrato criado",
  contract_updated: "Contrato atualizado",
  invoice_created: "Fatura criada",
  lead_deleted: "Lead removido",
  service_added: "Serviço adicionado",
  plan_changed: "Plano alterado",
};

export function AuditLogPanel() {
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      setItems((data as Entry[]) || []);
      setLoading(false);
    })();
  }, []);

  const actions = Array.from(new Set(items.map((i) => i.action)));
  const filtered = items.filter((i) => {
    if (filter !== "all" && i.action !== filter) return false;
    if (!q) return true;
    const blob = `${i.action} ${i.target_type || ""} ${i.target_id || ""} ${JSON.stringify(i.metadata || {})}`.toLowerCase();
    return blob.includes(q.toLowerCase());
  });

  if (loading) {
    return (
      <div className="grid place-items-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ação, ID ou metadados..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Filtrar ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>
                {ACTION_LABELS[a] || a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border/60">
          <ScrollText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
          <ul className="divide-y divide-border/60">
            {filtered.map((e) => (
              <li key={e.id} className="px-4 sm:px-6 py-3 hover:bg-secondary/30 transition">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline">{ACTION_LABELS[e.action] || e.action}</Badge>
                    {e.target_type && (
                      <span className="text-xs text-muted-foreground truncate">
                        {e.target_type} · {e.target_id?.slice(0, 8)}
                      </span>
                    )}
                  </div>
                  <time className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString("pt-BR")}
                  </time>
                </div>
                {e.metadata && Object.keys(e.metadata).length > 0 && (
                  <pre className="mt-2 text-[11px] bg-muted/50 rounded p-2 overflow-x-auto text-muted-foreground">
                    {JSON.stringify(e.metadata, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
