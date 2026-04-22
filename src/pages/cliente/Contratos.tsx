import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClientId } from "@/hooks/useClientId";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fmtDate, contractStatusLabel } from "@/lib/format";
import { FileText, ArrowRight } from "lucide-react";

type Contract = { id: string; status: string; created_at: string; accepted_at: string | null; notes: string | null };

export default function Contratos() {
  const { clientId } = useClientId();
  const [items, setItems] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    supabase.from("contracts").select("*").eq("client_id", clientId).order("created_at", { ascending: false })
      .then(({ data }) => { setItems((data as Contract[]) || []); setLoading(false); });
  }, [clientId]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Contratos</div>
        <h1 className="font-display text-4xl">Seus contratos</h1>
        <p className="text-muted-foreground mt-1">Histórico completo de contratos e seus itens.</p>
      </div>

      {loading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Carregando…</CardContent></Card>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Você ainda não tem contratos.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {items.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">Contrato #{c.id.slice(0, 8).toUpperCase()}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Aceito em {fmtDate(c.accepted_at || c.created_at)}
                    {c.notes && <span> · {c.notes}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={c.status === "active" ? "default" : "secondary"}>{contractStatusLabel[c.status] || c.status}</Badge>
                  <Button asChild variant="outline" size="sm"><Link to={`/cliente/contratos/${c.id}`}>Detalhes <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
