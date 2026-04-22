import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClientId } from "@/hooks/useClientId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtDate, contractStatusLabel } from "@/lib/format";
import { FolderKanban, FileText, Calendar, CheckCircle2, PauseCircle, XCircle, PlayCircle } from "lucide-react";

type Project = {
  id: string; // contract_id
  status: string;
  accepted_at: string | null;
  created_at: string;
  started_at: string | null;
  notes: string | null;
  items: { id: string; name: string; cycle: string; active: boolean }[];
};

const cycleLabel: Record<string, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  yearly: "Anual",
  one_time: "Única",
};

const statusIcon: Record<string, React.ReactNode> = {
  active: <PlayCircle className="h-4 w-4 text-success" />,
  pending_setup: <Calendar className="h-4 w-4 text-muted-foreground" />,
  paused: <PauseCircle className="h-4 w-4 text-warning" />,
  cancelled: <XCircle className="h-4 w-4 text-destructive" />,
  completed: <CheckCircle2 className="h-4 w-4 text-success" />,
};

export default function Projetos() {
  const { clientId } = useClientId();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      const { data: contracts } = await supabase
        .from("contracts")
        .select("id, status, accepted_at, created_at, started_at, notes")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      const ids = (contracts || []).map((c) => c.id);
      const itemsMap = new Map<string, Project["items"]>();
      if (ids.length > 0) {
        const { data: items } = await supabase
          .from("contract_items")
          .select("id, contract_id, custom_name, billing_cycle, active, products(name)")
          .in("contract_id", ids);
        for (const it of (items || []) as Array<{
          id: string; contract_id: string; custom_name: string | null;
          billing_cycle: string; active: boolean; products?: { name: string } | null;
        }>) {
          const arr = itemsMap.get(it.contract_id) || [];
          arr.push({
            id: it.id,
            name: it.custom_name || it.products?.name || "Serviço",
            cycle: it.billing_cycle,
            active: it.active,
          });
          itemsMap.set(it.contract_id, arr);
        }
      }
      setProjects((contracts || []).map((c) => ({ ...c, items: itemsMap.get(c.id) || [] })));
      setLoading(false);
    })();
  }, [clientId]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Projetos</div>
        <h1 className="font-display text-4xl">Seus projetos</h1>
        <p className="text-muted-foreground mt-1">Acompanhe o status de cada projeto contratado e os serviços que o compõem.</p>
      </div>

      {loading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Carregando…</CardContent></Card>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderKanban className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Você ainda não tem projetos contratados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((p) => {
            const activeCount = p.items.filter((i) => i.active).length;
            return (
              <Card key={p.id}>
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {statusIcon[p.status] || <FileText className="h-4 w-4" />}
                      Projeto #{p.id.slice(0, 8).toUpperCase()}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Iniciado em {fmtDate(p.started_at || p.accepted_at || p.created_at)}
                      {" · "}{activeCount} serviço{activeCount === 1 ? "" : "s"} ativo{activeCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Badge variant={p.status === "active" ? "default" : p.status === "cancelled" ? "destructive" : "secondary"}>
                    {contractStatusLabel[p.status] || p.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  {p.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado neste projeto ainda.</p>
                  ) : (
                    <ul className="divide-y divide-border/60">
                      {p.items.map((it) => (
                        <li key={it.id} className="py-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block h-2 w-2 rounded-full ${it.active ? "bg-success" : "bg-muted"}`} />
                            <span className="text-sm">{it.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{cycleLabel[it.cycle] || it.cycle}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {p.notes && <p className="text-xs text-muted-foreground mt-3 italic">{p.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
