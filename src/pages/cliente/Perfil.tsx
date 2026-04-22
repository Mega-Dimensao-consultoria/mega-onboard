import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClientId } from "@/hooks/useClientId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  full_name: z.string().trim().min(2, "Nome muito curto").max(120),
  telefone: z.string().trim().max(40).optional().or(z.literal("")),
  doc_type: z.enum(["cpf", "cnpj", ""]).optional(),
  doc_number: z.string().trim().max(40).optional().or(z.literal("")),
  nome_fantasia: z.string().trim().max(160).optional().or(z.literal("")),
  razao_social: z.string().trim().max(200).optional().or(z.literal("")),
  endereco: z.string().trim().max(400).optional().or(z.literal("")),
});

export default function Perfil() {
  const { user } = useAuth();
  const { clientId, isImpersonating } = useClientId();
  const [form, setForm] = useState({
    full_name: "", telefone: "", email: "",
    doc_type: "" as "cpf" | "cnpj" | "",
    doc_number: "", nome_fantasia: "", razao_social: "", endereco: "",
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    supabase.from("profiles")
      .select("full_name,telefone,email,doc_type,doc_number,nome_fantasia,razao_social,endereco")
      .eq("id", clientId).maybeSingle()
      .then(({ data }) => {
        setForm({
          full_name: data?.full_name || "",
          telefone: data?.telefone || "",
          email: data?.email || (clientId === user?.id ? user?.email || "" : ""),
          doc_type: (data?.doc_type as "cpf" | "cnpj" | null) || "",
          doc_number: data?.doc_number || "",
          nome_fantasia: data?.nome_fantasia || "",
          razao_social: data?.razao_social || "",
          endereco: data?.endereco || "",
        });
        setLoading(false);
      });
  }, [clientId, user]);

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm((p) => ({ ...p, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Dados inválidos", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name,
      telefone: form.telefone || null,
      doc_type: form.doc_type || null,
      doc_number: form.doc_number || null,
      nome_fantasia: form.nome_fantasia || null,
      razao_social: form.razao_social || null,
      endereco: form.endereco || null,
    }).eq("id", clientId);
    setBusy(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Perfil atualizado" });
      await supabase.from("audit_log").insert([{
        actor_user_id: user?.id, action: "profile_updated",
        target_type: "client", target_id: clientId,
        metadata: isImpersonating ? { via: "consultor_impersonate" } : null,
      }]);
    }
  };

  if (loading) return <div className="text-muted-foreground">Carregando…</div>;

  const isPJ = form.doc_type === "cnpj";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-3xl">Perfil</h1>
        <p className="text-muted-foreground mt-1">
          {isImpersonating ? "Editando como consultor — alterações serão registradas." : "Seus dados cadastrais."}
        </p>
      </div>

      <form onSubmit={save} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Contato</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input value={form.email} disabled />
              <p className="text-xs text-muted-foreground mt-1">Email não pode ser alterado por aqui.</p>
            </div>
            <div>
              <Label htmlFor="fn">Nome completo</Label>
              <Input id="fn" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tel">Telefone</Label>
              <Input id="tel" value={form.telefone} onChange={(e) => set("telefone", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Documentos e endereço</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.doc_type || "none"} onValueChange={(v) => set("doc_type", v === "none" ? "" : v as "cpf" | "cnpj")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="doc">{form.doc_type === "cnpj" ? "CNPJ" : form.doc_type === "cpf" ? "CPF" : "Documento"}</Label>
                <Input id="doc" value={form.doc_number} onChange={(e) => set("doc_number", e.target.value)} />
              </div>
            </div>

            {isPJ && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="nf">Nome fantasia</Label>
                  <Input id="nf" value={form.nome_fantasia} onChange={(e) => set("nome_fantasia", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="rs">Razão social</Label>
                  <Input id="rs" value={form.razao_social} onChange={(e) => set("razao_social", e.target.value)} />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="end">Endereço</Label>
              <Input id="end" value={form.endereco} onChange={(e) => set("endereco", e.target.value)} placeholder="Rua, número, complemento, cidade/UF" />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={busy}>{busy ? "Salvando…" : "Salvar alterações"}</Button>
      </form>
    </div>
  );
}
