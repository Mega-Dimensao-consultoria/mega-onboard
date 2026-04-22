import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBrand } from "@/hooks/useBrand";
import { BrandHeader } from "@/components/BrandHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { onlyDigits } from "@/lib/format";
import { generateContractPdf, htmlToPlainText } from "@/lib/contractPdf";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, Search, Building2, User2 } from "lucide-react";

type DocType = "cpf" | "cnpj";

const cpfSchema = z.string().refine((v) => onlyDigits(v).length === 11, "CPF deve ter 11 dígitos");
const cnpjSchema = z.string().refine((v) => onlyDigits(v).length === 14, "CNPJ deve ter 14 dígitos");
const emailSchema = z.string().trim().email("E-mail inválido").max(255);
const passwordSchema = z.string().min(8, "Senha precisa de no mínimo 8 caracteres").max(72);

export default function AceiteProposta() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { brand } = useBrand();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // step 1
  const [docType, setDocType] = useState<DocType>("cnpj");
  const [docNumber, setDocNumber] = useState("");
  const [searchingCnpj, setSearchingCnpj] = useState(false);
  const [fullName, setFullName] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [emailContato, setEmailContato] = useState("");

  // step 2
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [celular, setCelular] = useState("");

  // pré-carrega lead caso usuário já esteja logado e queira só completar dados
  useEffect(() => {
    if (!id) return;
    supabase.from("leads").select("contact_name, contact_email, contact_whatsapp").eq("id", id).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        if (data.contact_name) setFullName(data.contact_name);
        if (data.contact_email) { setEmailContato(data.contact_email); setEmail(data.contact_email); }
        if (data.contact_whatsapp) { setTelefone(data.contact_whatsapp); setCelular(data.contact_whatsapp); }
      });
  }, [id]);

  const buscarCnpj = async () => {
    const cnpj = onlyDigits(docNumber);
    if (cnpj.length !== 14) return toast({ title: "CNPJ deve ter 14 dígitos", variant: "destructive" });
    setSearchingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!res.ok) throw new Error("CNPJ não encontrado");
      const d = await res.json();
      setRazaoSocial(d.razao_social || "");
      setNomeFantasia(d.nome_fantasia || "");
      setEndereco([d.logradouro, d.numero, d.bairro, d.municipio, d.uf, d.cep].filter(Boolean).join(", "));
      if (d.ddd_telefone_1) setTelefone(d.ddd_telefone_1);
      if (d.email) setEmailContato(d.email);
      toast({ title: "Dados preenchidos automaticamente" });
    } catch (e) {
      toast({ title: "Não encontramos esse CNPJ", description: e instanceof Error ? e.message : "Tente novamente em instantes.", variant: "destructive" });
    } finally { setSearchingCnpj(false); }
  };

  const validateStep1 = () => {
    try {
      (docType === "cpf" ? cpfSchema : cnpjSchema).parse(docNumber);
    } catch {
      toast({ title: docType === "cpf" ? "CPF inválido" : "CNPJ inválido", variant: "destructive" });
      return false;
    }
    if (docType === "cpf" && fullName.trim().length < 2) { toast({ title: "Informe seu nome completo", variant: "destructive" }); return false; }
    if (docType === "cnpj" && (razaoSocial.trim().length < 2)) { toast({ title: "Informe a razão social", variant: "destructive" }); return false; }
    if (onlyDigits(telefone).length < 10) { toast({ title: "Telefone inválido", variant: "destructive" }); return false; }
    return true;
  };

  const next = () => {
    if (step === 1 && !validateStep1()) return;
    setStep((s) => s + 1);
  };

  const finalizar = async () => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(pw);
    } catch (err) {
      toast({ title: "Dados inválidos", description: err instanceof z.ZodError ? err.errors[0].message : "", variant: "destructive" });
      return;
    }
    if (pw !== pw2) { toast({ title: "Senhas não conferem", variant: "destructive" }); return; }
    if (onlyDigits(celular).length < 10) { toast({ title: "Celular inválido", variant: "destructive" }); return; }

    setBusy(true);
    try {
      // Captura IP do cliente (best-effort)
      let acceptedIp: string | null = null;
      try {
        const { data: ipData } = await supabase.functions.invoke("get-client-ip");
        acceptedIp = (ipData as { ip?: string | null })?.ip ?? null;
      } catch { /* silencioso */ }

      let userId = user?.id;
      // 1. cria conta (se ainda não logado)
      if (!userId) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pw,
          options: {
            emailRedirectTo: `${window.location.origin}/cliente`,
            data: { full_name: docType === "cpf" ? fullName : (nomeFantasia || razaoSocial) },
          },
        });
        if (error) throw error;
        userId = data.user?.id;
        if (!userId) throw new Error("Falha ao criar conta");
      }

      // 2. salva profile (RLS permite owner ou consultor)
      const profilePayload = {
        id: userId,
        full_name: docType === "cpf" ? fullName : (nomeFantasia || razaoSocial),
        doc_type: docType,
        doc_number: onlyDigits(docNumber),
        razao_social: docType === "cnpj" ? razaoSocial : null,
        nome_fantasia: docType === "cnpj" ? nomeFantasia : null,
        endereco: endereco || null,
        telefone: celular || telefone,
        email,
      };
      await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });

      // 3. busca itens propostos pelo consultor + solução técnica do lead
      const [{ data: proposedItems }, { data: leadRow }] = await Promise.all([
        supabase
          .from("lead_proposed_items")
          .select("*, products(name, price_cents)")
          .eq("lead_id", id!)
          .order("sort_order"),
        supabase
          .from("leads")
          .select("technical_solution")
          .eq("id", id!)
          .maybeSingle(),
      ]);

      const hasItems = (proposedItems?.length || 0) > 0;
      const acceptedAt = new Date();

      // 4. cria contrato (active se já tem itens; pending_setup caso contrário)
      const { data: contractRow, error: cErr } = await supabase.from("contracts").insert([{
        client_id: userId,
        lead_id: id,
        status: hasItems ? "active" : "pending_setup",
        accepted_at: acceptedAt.toISOString(),
        accepted_ip: acceptedIp,
        started_at: hasItems ? acceptedAt.toISOString() : null,
      }]).select("id").single();
      if (cErr && !cErr.message.includes("duplicate")) throw cErr;

      // 5. copia os itens propostos para contract_items
      if (hasItems && contractRow?.id) {
        const today = new Date();
        const itemsPayload = proposedItems!.map((p) => {
          let nextBilling: string | null = null;
          if (p.billing_cycle === "monthly") {
            const d = new Date(today); d.setMonth(d.getMonth() + 1);
            nextBilling = d.toISOString().slice(0, 10);
          } else if (p.billing_cycle === "quarterly") {
            const d = new Date(today); d.setMonth(d.getMonth() + 3);
            nextBilling = d.toISOString().slice(0, 10);
          } else if (p.billing_cycle === "yearly") {
            const d = new Date(today); d.setFullYear(d.getFullYear() + 1);
            nextBilling = d.toISOString().slice(0, 10);
          } else if (p.billing_cycle === "one_time") {
            nextBilling = today.toISOString().slice(0, 10);
          }
          return {
            contract_id: contractRow.id,
            product_id: p.product_id,
            custom_name: p.custom_name,
            custom_price_cents: p.custom_price_cents,
            billing_cycle: p.billing_cycle,
            quantity: p.quantity,
            next_billing_at: nextBilling,
            active: true,
          };
        });
        await supabase.from("contract_items").insert(itemsPayload);
      }

      // 6. gera PDF do contrato e faz upload (best-effort)
      let contractPdfPath: string | null = null;
      if (contractRow?.id) {
        try {
          const pdfBlob = generateContractPdf({
            brand,
            contractId: contractRow.id,
            leadId: id!,
            party: {
              full_name: profilePayload.full_name || email,
              doc_type: docType,
              doc_number: profilePayload.doc_number!,
              razao_social: profilePayload.razao_social,
              nome_fantasia: profilePayload.nome_fantasia,
              endereco: profilePayload.endereco,
              email,
              telefone: profilePayload.telefone,
            },
            items: (proposedItems || []).map((p: {
              custom_name: string | null; custom_price_cents: number | null;
              billing_cycle: string; quantity: number;
              products?: { name: string; price_cents: number } | null;
            }) => ({
              custom_name: p.custom_name,
              product_name: p.products?.name,
              custom_price_cents: p.custom_price_cents,
              product_price_cents: p.products?.price_cents,
              billing_cycle: p.billing_cycle,
              quantity: p.quantity,
            })),
            acceptedAt,
            acceptedIp,
            technicalSolutionPlain: leadRow?.technical_solution
              ? htmlToPlainText(leadRow.technical_solution)
              : null,
          });
          const path = `${userId}/${contractRow.id}.pdf`;
          const { error: upErr } = await supabase.storage
            .from("contracts")
            .upload(path, pdfBlob, { upsert: true, contentType: "application/pdf" });
          if (!upErr) {
            contractPdfPath = path;
            await supabase.from("contracts")
              .update({ notes: `Contrato assinado eletronicamente. PDF: ${path}` })
              .eq("id", contractRow.id);
          }
        } catch (pdfErr) {
          console.warn("Falha ao gerar/upload PDF do contrato", pdfErr);
        }
      }

      // 7. atualiza lead → status proposta_aceita
      await supabase.from("leads").update({ status: "proposta_aceita" }).eq("id", id);

      // 8. audit
      await supabase.from("audit_log").insert([{
        actor_user_id: userId,
        action: "proposal_accepted",
        target_type: "lead",
        target_id: id,
        metadata: { doc_type: docType, accepted_ip: acceptedIp, contract_id: contractRow?.id, pdf_path: contractPdfPath },
      }]);

      // 9. dispara email de confirmação (best-effort)
      const recipientName = docType === "cpf" ? fullName : (nomeFantasia || razaoSocial);
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "proposal-accepted",
          recipientEmail: email,
          idempotencyKey: `proposal-accepted-${id}`,
          templateData: { name: recipientName, portalUrl: `${window.location.origin}/cliente` },
        },
      }).catch(() => { /* silencioso */ });

      setDone(true);
    } catch (e) {
      toast({ title: "Erro ao finalizar", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col">
        <BrandHeader />
        <main className="flex-1 grid place-items-center px-6 py-10">
          <div className="max-w-md w-full text-center bg-card border border-border/60 rounded-2xl p-10 shadow-elegant">
            <div className="h-16 w-16 rounded-full bg-primary/10 grid place-items-center mx-auto mb-5">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl">Proposta aceita!</h1>
            <p className="text-muted-foreground mt-2">
              Sua conta está pronta. Em instantes nosso consultor vai configurar seu plano e suas primeiras faturas aparecerão na sua área.
            </p>
            <Button asChild className="mt-6 w-full" size="lg">
              <Link to="/cliente">Ir para a área do cliente</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <BrandHeader />
      <main className="flex-1 container max-w-2xl py-10">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Aceite de proposta</div>
          <h1 className="font-display text-4xl mt-1">Vamos formalizar</h1>
          <p className="text-muted-foreground mt-1">Etapa {step} de 2</p>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl p-6 sm:p-8 shadow-elegant space-y-6">
          {step === 1 && (
            <>
              <RadioGroup value={docType} onValueChange={(v) => setDocType(v as DocType)} className="grid grid-cols-2 gap-3">
                <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${docType === "cpf" ? "border-primary bg-primary/5" : "border-border/60"}`}>
                  <RadioGroupItem value="cpf" id="cpf" />
                  <User2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Pessoa Física</div>
                    <div className="text-xs text-muted-foreground">CPF</div>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${docType === "cnpj" ? "border-primary bg-primary/5" : "border-border/60"}`}>
                  <RadioGroupItem value="cnpj" id="cnpj" />
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Pessoa Jurídica</div>
                    <div className="text-xs text-muted-foreground">CNPJ + busca automática</div>
                  </div>
                </label>
              </RadioGroup>

              <div>
                <Label>{docType === "cpf" ? "CPF" : "CNPJ"}</Label>
                <div className="flex gap-2">
                  <Input
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder={docType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                  />
                  {docType === "cnpj" && (
                    <Button type="button" variant="secondary" onClick={buscarCnpj} disabled={searchingCnpj}>
                      {searchingCnpj ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      <span className="ml-2 hidden sm:inline">Buscar</span>
                    </Button>
                  )}
                </div>
              </div>

              {docType === "cpf" ? (
                <div>
                  <Label>Nome completo</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label>Razão social</Label><Input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} /></div>
                  <div><Label>Nome fantasia</Label><Input value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} /></div>
                </div>
              )}

              <div>
                <Label>Endereço</Label>
                <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro, cidade — UF" />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>Telefone</Label><Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" /></div>
                <div><Label>E-mail de contato</Label><Input type="email" value={emailContato} onChange={(e) => setEmailContato(e.target.value)} /></div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" asChild><Link to={`/solucao/${id}`}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Link></Button>
                <Button onClick={next}>Continuar <ArrowRight className="h-4 w-4 ml-2" /></Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <h2 className="font-display text-xl">Crie seu acesso</h2>
                <p className="text-sm text-muted-foreground mt-1">Esta conta será usada para acompanhar contratos, faturas e serviços.</p>
              </div>

              {user ? (
                <div className="rounded-lg bg-secondary/50 p-4 text-sm">
                  Você já está logado como <strong>{user.email}</strong>. Vamos vincular esta proposta a essa conta.
                </div>
              ) : (
                <>
                  <div>
                    <Label>E-mail de acesso</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><Label>Senha</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></div>
                    <div><Label>Confirmar senha</Label><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></div>
                  </div>
                </>
              )}

              <div>
                <Label>Celular (WhatsApp)</Label>
                <Input value={celular} onChange={(e) => setCelular(e.target.value)} placeholder="(11) 99999-9999" />
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
                <Button onClick={finalizar} disabled={busy} size="lg">
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Aceitar proposta
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Ao aceitar, você concorda em receber comunicações sobre contratos e faturas. Seus dados são tratados conforme a LGPD.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
