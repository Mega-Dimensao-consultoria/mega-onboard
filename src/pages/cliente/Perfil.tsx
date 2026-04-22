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
import {
  maskCEP, maskCNPJ, maskCPF, maskPhone, onlyDigits,
  isValidCPF, isValidCNPJ, fetchCep,
} from "@/lib/masks";
import { Loader2 } from "lucide-react";

const schema = z.object({
  full_name: z.string().trim().min(2, "Nome muito curto").max(120),
  telefone: z.string().trim().max(40).optional().or(z.literal("")),
  doc_type: z.enum(["cpf", "cnpj", ""]).optional(),
  doc_number: z.string().trim().max(40).optional().or(z.literal("")),
  nome_fantasia: z.string().trim().max(160).optional().or(z.literal("")),
  razao_social: z.string().trim().max(200).optional().or(z.literal("")),
  cep: z.string().trim().max(10).optional().or(z.literal("")),
  logradouro: z.string().trim().max(200).optional().or(z.literal("")),
  numero: z.string().trim().max(20).optional().or(z.literal("")),
  complemento: z.string().trim().max(120).optional().or(z.literal("")),
  bairro: z.string().trim().max(120).optional().or(z.literal("")),
  cidade: z.string().trim().max(120).optional().or(z.literal("")),
  estado: z.string().trim().max(2).optional().or(z.literal("")),
});

type Form = {
  full_name: string; telefone: string; email: string;
  doc_type: "cpf" | "cnpj" | "";
  doc_number: string; nome_fantasia: string; razao_social: string;
  cep: string; logradouro: string; numero: string; complemento: string;
  bairro: string; cidade: string; estado: string;
};

const empty: Form = {
  full_name: "", telefone: "", email: "",
  doc_type: "", doc_number: "", nome_fantasia: "", razao_social: "",
  cep: "", logradouro: "", numero: "", complemento: "",
  bairro: "", cidade: "", estado: "",
};

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function Perfil() {
  const { user } = useAuth();
  const { clientId, isImpersonating } = useClientId();
  const [form, setForm] = useState<Form>(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    supabase.from("profiles")
      .select("full_name,telefone,email,doc_type,doc_number,nome_fantasia,razao_social,endereco,cep,logradouro,numero,complemento,bairro,cidade,estado")
      .eq("id", clientId).maybeSingle()
      .then(({ data }) => {
        const docType = (data?.doc_type as "cpf" | "cnpj" | null) || "";
        setForm({
          full_name: data?.full_name || "",
          telefone: maskPhone(data?.telefone || ""),
          email: data?.email || (clientId === user?.id ? user?.email || "" : ""),
          doc_type: docType,
          doc_number: docType === "cnpj" ? maskCNPJ(data?.doc_number || "") : docType === "cpf" ? maskCPF(data?.doc_number || "") : data?.doc_number || "",
          nome_fantasia: data?.nome_fantasia || "",
          razao_social: data?.razao_social || "",
          cep: maskCEP(data?.cep || ""),
          // fallback: se não houver logradouro estruturado, mostra o endereco antigo
          logradouro: data?.logradouro || data?.endereco || "",
          numero: data?.numero || "",
          complemento: data?.complemento || "",
          bairro: data?.bairro || "",
          cidade: data?.cidade || "",
          estado: data?.estado || "",
        });
        setLoading(false);
      });
  }, [clientId, user]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((p) => ({ ...p, [k]: v }));

  const onCepChange = async (v: string) => {
    const masked = maskCEP(v);
    set("cep", masked);
    if (onlyDigits(masked).length === 8) {
      setCepLoading(true);
      const r = await fetchCep(masked);
      setCepLoading(false);
      if (r) {
        setForm((p) => ({
          ...p,
          logradouro: r.logradouro || p.logradouro,
          bairro: r.bairro || p.bairro,
          cidade: r.localidade || p.cidade,
          estado: r.uf || p.estado,
          complemento: p.complemento || r.complemento || "",
        }));
        toast({ title: "Endereço encontrado", description: `${r.localidade}/${r.uf}` });
      } else {
        toast({ title: "CEP não encontrado", description: "Preencha o endereço manualmente.", variant: "destructive" });
      }
    }
  };

  const onDocTypeChange = (v: "cpf" | "cnpj" | "") => {
    setForm((p) => ({ ...p, doc_type: v, doc_number: v === "cnpj" ? maskCNPJ(p.doc_number) : v === "cpf" ? maskCPF(p.doc_number) : onlyDigits(p.doc_number) }));
  };

  const onDocChange = (v: string) => {
    if (form.doc_type === "cnpj") set("doc_number", maskCNPJ(v));
    else if (form.doc_type === "cpf") set("doc_number", maskCPF(v));
    else set("doc_number", v);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Dados inválidos", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    // valida documento se preenchido
    if (form.doc_type === "cpf" && form.doc_number && !isValidCPF(form.doc_number)) {
      return toast({ title: "CPF inválido", variant: "destructive" });
    }
    if (form.doc_type === "cnpj" && form.doc_number && !isValidCNPJ(form.doc_number)) {
      return toast({ title: "CNPJ inválido", variant: "destructive" });
    }
    setBusy(true);

    // monta endereco "legado" concatenado para compatibilidade com telas que ainda usam o campo único
    const enderecoConcat = [
      [form.logradouro, form.numero].filter(Boolean).join(", "),
      form.complemento,
      form.bairro,
      [form.cidade, form.estado].filter(Boolean).join("/"),
      form.cep,
    ].filter((p) => p && p.trim().length > 0).join(" · ");

    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name,
      telefone: onlyDigits(form.telefone) || null,
      doc_type: form.doc_type || null,
      doc_number: onlyDigits(form.doc_number) || null,
      nome_fantasia: form.nome_fantasia || null,
      razao_social: form.razao_social || null,
      cep: onlyDigits(form.cep) || null,
      logradouro: form.logradouro || null,
      numero: form.numero || null,
      complemento: form.complemento || null,
      bairro: form.bairro || null,
      cidade: form.cidade || null,
      estado: form.estado || null,
      endereco: enderecoConcat || null,
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
              <Input id="tel" value={form.telefone} onChange={(e) => set("telefone", maskPhone(e.target.value))} placeholder="(11) 99999-9999" inputMode="numeric" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Documentos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.doc_type || "none"} onValueChange={(v) => onDocTypeChange(v === "none" ? "" : v as "cpf" | "cnpj")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="doc">{isPJ ? "CNPJ" : form.doc_type === "cpf" ? "CPF" : "Documento"}</Label>
                <Input
                  id="doc"
                  value={form.doc_number}
                  onChange={(e) => onDocChange(e.target.value)}
                  placeholder={isPJ ? "00.000.000/0000-00" : form.doc_type === "cpf" ? "000.000.000-00" : ""}
                  inputMode="numeric"
                />
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Endereço</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="cep">CEP</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    value={form.cep}
                    onChange={(e) => onCepChange(e.target.value)}
                    placeholder="00000-000"
                    inputMode="numeric"
                  />
                  {cepLoading && <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="log">Logradouro</Label>
                <Input id="log" value={form.logradouro} onChange={(e) => set("logradouro", e.target.value)} placeholder="Rua, avenida…" />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="num">Número</Label>
                <Input id="num" value={form.numero} onChange={(e) => set("numero", e.target.value)} placeholder="123" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="comp">Complemento</Label>
                <Input id="comp" value={form.complemento} onChange={(e) => set("complemento", e.target.value)} placeholder="Apto, sala…" />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="bairro">Bairro</Label>
                <Input id="bairro" value={form.bairro} onChange={(e) => set("bairro", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={form.estado || "none"} onValueChange={(v) => set("estado", v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {UFS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={busy}>{busy ? "Salvando…" : "Salvar alterações"}</Button>
      </form>
    </div>
  );
}
