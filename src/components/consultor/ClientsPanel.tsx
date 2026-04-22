import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/format";
import { Users, Search } from "lucide-react";

type Client = {
  id: string; full_name: string | null; email: string | null; telefone: string | null;
  doc_type: string | null; doc_number: string | null; nome_fantasia: string | null;
  razao_social: string | null; created_at: string;
};

export function ClientsPanel() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      // pega user_ids com role cliente, depois carrega profiles
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "cliente");
      const ids = (roles || []).map((r: { user_id: string }) => r.user_id);
      if (ids.length === 0) { setLoading(false); return; }
      const { data } = await supabase.from("profiles").select("*").in("id", ids).order("created_at", { ascending: false });
      setClients((data as Client[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = clients.filter((c) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return [c.full_name, c.email, c.nome_fantasia, c.razao_social, c.doc_number, c.telefone]
      .some((v) => v?.toLowerCase().includes(s));
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-2xl">Clientes</h2>
          <p className="text-sm text-muted-foreground">Todos os clientes cadastrados após aceitar uma proposta.</p>
        </div>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome, email, CNPJ…" className="pl-9 w-72" />
        </div>
      </div>

      {loading ? <Card><CardContent className="py-10 text-center text-muted-foreground">Carregando…</CardContent></Card>
        : filtered.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum cliente {q ? "encontrado." : "ainda."}</p>
          </CardContent></Card>
        ) : (
          <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Nome</th>
                  <th className="text-left px-5 py-3 font-medium">Tipo</th>
                  <th className="text-left px-5 py-3 font-medium">Documento</th>
                  <th className="text-left px-5 py-3 font-medium">Contato</th>
                  <th className="text-left px-5 py-3 font-medium">Cliente desde</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-border/50 hover:bg-secondary/30 transition">
                    <td className="px-5 py-3 font-medium">{c.nome_fantasia || c.full_name || "—"}{c.razao_social && <div className="text-xs text-muted-foreground">{c.razao_social}</div>}</td>
                    <td className="px-5 py-3"><Badge variant="secondary">{c.doc_type === "cnpj" ? "PJ" : c.doc_type === "cpf" ? "PF" : "—"}</Badge></td>
                    <td className="px-5 py-3 text-muted-foreground">{c.doc_number || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.email}<div className="text-xs">{c.telefone}</div></td>
                    <td className="px-5 py-3 text-muted-foreground">{fmtDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
