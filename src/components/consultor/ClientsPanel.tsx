import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { fmtDate, fmtMoney, contractStatusLabel, invoiceStatusLabel } from "@/lib/format";
import { Users, Search, Eye, Mail, Phone, MapPin, FileText, Receipt, Building2, User as UserIcon, Hash, Calendar, Trash2 } from "lucide-react";
import { startImpersonate } from "@/lib/impersonate";
import { toast } from "@/hooks/use-toast";

type Client = {
  id: string; full_name: string | null; email: string | null; telefone: string | null;
  doc_type: string | null; doc_number: string | null; nome_fantasia: string | null;
  razao_social: string | null; endereco: string | null; created_at: string;
};

type ContractRow = { id: string; status: string; created_at: string; accepted_at: string | null };
type InvoiceRow = { id: string; total_cents: number; status: string; due_date: string };

export function ClientsPanel() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "cliente");
      const ids = (roles || []).map((r: { user_id: string }) => r.user_id);
      if (ids.length === 0) { setLoading(false); return; }
      const { data } = await supabase.from("profiles").select("*").in("id", ids).order("created_at", { ascending: false });
      setClients((data as Client[]) || []);
      setLoading(false);
    })();
  }, []);

  const openDetail = async (c: Client) => {
    setSelected(c);
    setDetailLoading(true);
    setContracts([]); setInvoices([]);
    const [{ data: cs }, { data: is }] = await Promise.all([
      supabase.from("contracts").select("id, status, created_at, accepted_at").eq("client_id", c.id).order("created_at", { ascending: false }),
      supabase.from("invoices").select("id, total_cents, status, due_date").eq("client_id", c.id).order("due_date", { ascending: false }).limit(10),
    ]);
    setContracts((cs as ContractRow[]) || []);
    setInvoices((is as InvoiceRow[]) || []);
    setDetailLoading(false);
  };

  const impersonate = (c: Client) => {
    const name = c.nome_fantasia || c.full_name || c.email || "Cliente";
    startImpersonate(c.id, name);
    toast({ title: "Modo visualização ativado", description: `Você está vendo a área como ${name}.` });
    navigate("/cliente");
  };

  const filtered = clients.filter((c) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return [c.full_name, c.email, c.nome_fantasia, c.razao_social, c.doc_number, c.telefone]
      .some((v) => v?.toLowerCase().includes(s));
  });

  const openInvoicesTotal = invoices.filter((i) => i.status === "open" || i.status === "overdue").reduce((s, i) => s + i.total_cents, 0);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;
  const activeContracts = contracts.filter((c) => c.status === "active").length;

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
                  <th className="text-right px-5 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-border/50 hover:bg-secondary/30 transition cursor-pointer"
                    onClick={() => openDetail(c)}
                  >
                    <td className="px-5 py-3 font-medium">
                      {c.nome_fantasia || c.full_name || "—"}
                      {c.razao_social && <div className="text-xs text-muted-foreground">{c.razao_social}</div>}
                    </td>
                    <td className="px-5 py-3"><Badge variant="secondary">{c.doc_type === "cnpj" ? "PJ" : c.doc_type === "cpf" ? "PF" : "—"}</Badge></td>
                    <td className="px-5 py-3 text-muted-foreground">{c.doc_number || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.email}<div className="text-xs">{c.telefone}</div></td>
                    <td className="px-5 py-3 text-muted-foreground">{fmtDate(c.created_at)}</td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); impersonate(c); }}
                        title="Ver área como este cliente"
                      >
                        <Eye className="h-4 w-4 mr-1" /> Ver como
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <SheetTitle className="font-display text-2xl">{selected.nome_fantasia || selected.full_name || "Cliente"}</SheetTitle>
                    <SheetDescription>
                      {selected.razao_social || (selected.doc_type === "cnpj" ? "Pessoa Jurídica" : "Pessoa Física")}
                    </SheetDescription>
                  </div>
                  <Badge variant="secondary">{selected.doc_type === "cnpj" ? "PJ" : selected.doc_type === "cpf" ? "PF" : "—"}</Badge>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <Button onClick={() => impersonate(selected)} className="w-full" size="lg">
                  <Eye className="h-4 w-4 mr-2" /> Acessar área como este cliente
                </Button>

                {/* Resumo */}
                <div className="grid grid-cols-3 gap-3">
                  <SummaryStat icon={<FileText className="h-3.5 w-3.5" />} label="Contratos ativos" value={String(activeContracts)} />
                  <SummaryStat icon={<Receipt className="h-3.5 w-3.5" />} label="Em aberto" value={fmtMoney(openInvoicesTotal)} />
                  <SummaryStat icon={<Calendar className="h-3.5 w-3.5" />} label="Vencidas" value={String(overdueCount)} highlight={overdueCount > 0} />
                </div>

                {/* Dados cadastrais */}
                <section className="space-y-3">
                  <h3 className="font-display text-lg">Dados cadastrais</h3>
                  <dl className="space-y-2 text-sm bg-secondary/40 rounded-xl p-4">
                    <Field icon={<UserIcon className="h-3.5 w-3.5" />} label="Nome completo" value={selected.full_name} />
                    {selected.nome_fantasia && <Field icon={<Building2 className="h-3.5 w-3.5" />} label="Nome fantasia" value={selected.nome_fantasia} />}
                    {selected.razao_social && <Field icon={<Building2 className="h-3.5 w-3.5" />} label="Razão social" value={selected.razao_social} />}
                    <Field icon={<Hash className="h-3.5 w-3.5" />} label={selected.doc_type === "cnpj" ? "CNPJ" : selected.doc_type === "cpf" ? "CPF" : "Documento"} value={selected.doc_number} />
                    <Field icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={selected.email} />
                    <Field icon={<Phone className="h-3.5 w-3.5" />} label="Telefone" value={selected.telefone} />
                    {selected.endereco && <Field icon={<MapPin className="h-3.5 w-3.5" />} label="Endereço" value={selected.endereco} />}
                    <Field icon={<Calendar className="h-3.5 w-3.5" />} label="Cliente desde" value={fmtDate(selected.created_at)} />
                  </dl>
                </section>

                {/* Contratos */}
                <section className="space-y-3">
                  <h3 className="font-display text-lg flex items-center gap-2"><FileText className="h-4 w-4" /> Contratos ({contracts.length})</h3>
                  {detailLoading ? <p className="text-sm text-muted-foreground">Carregando…</p>
                    : contracts.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum contrato.</p>
                    : (
                      <ul className="divide-y divide-border/60 rounded-xl border border-border/60 overflow-hidden">
                        {contracts.map((c) => (
                          <li key={c.id} className="px-4 py-3 flex items-center justify-between bg-card">
                            <div>
                              <div className="text-sm font-medium">#{c.id.slice(0, 8).toUpperCase()}</div>
                              <div className="text-xs text-muted-foreground">{fmtDate(c.accepted_at || c.created_at)}</div>
                            </div>
                            <Badge variant={c.status === "active" ? "default" : "secondary"}>{contractStatusLabel[c.status] || c.status}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                </section>

                {/* Faturas */}
                <section className="space-y-3">
                  <h3 className="font-display text-lg flex items-center gap-2"><Receipt className="h-4 w-4" /> Últimas faturas</h3>
                  {detailLoading ? <p className="text-sm text-muted-foreground">Carregando…</p>
                    : invoices.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma fatura.</p>
                    : (
                      <ul className="divide-y divide-border/60 rounded-xl border border-border/60 overflow-hidden">
                        {invoices.map((i) => (
                          <li key={i.id} className="px-4 py-3 flex items-center justify-between bg-card">
                            <div>
                              <div className="text-sm font-medium">{fmtMoney(i.total_cents)}</div>
                              <div className="text-xs text-muted-foreground">Vence em {fmtDate(i.due_date)}</div>
                            </div>
                            <Badge variant={i.status === "paid" ? "default" : i.status === "overdue" ? "destructive" : "secondary"}>
                              {invoiceStatusLabel[i.status]}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
        <dd className="font-medium break-words">{value || "—"}</dd>
      </div>
    </div>
  );
}

function SummaryStat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? "border-destructive/40 bg-destructive/5" : "border-border/60 bg-card"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className={`font-display text-lg mt-1 ${highlight ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}
