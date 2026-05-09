import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBrand } from "@/hooks/useBrand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck } from "lucide-react";

type Form = {
  pix_key_type: string;
  pix_key: string;
  paypal_env: "sandbox" | "live";
  paypal_client_id: string;
};

export function BillingSettingsPanel() {
  const { brand, refresh } = useBrand();
  const [f, setF] = useState<Form>({
    pix_key_type: "",
    pix_key: "",
    paypal_env: "sandbox",
    paypal_client_id: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!brand) return;
    setF({
      pix_key_type: brand.pix_key_type || "",
      pix_key: brand.pix_key || "",
      paypal_env: (brand.paypal_env as "sandbox" | "live") || "sandbox",
      paypal_client_id: brand.paypal_client_id || "",
    });
  }, [brand]);

  const save = async () => {
    if (!brand?.id) {
      toast({ title: "Configure a marca primeiro", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("brand_settings")
        .update({
          pix_key_type: f.pix_key_type || null,
          pix_key: f.pix_key || null,
          paypal_env: f.paypal_env,
          paypal_client_id: f.paypal_client_id || null,
        })
        .eq("id", brand.id);
      if (error) throw error;
      toast({ title: "Configurações de cobrança salvas!" });
      refresh();
    } catch (e) {
      toast({
        title: "Erro ao salvar",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* PIX */}
      <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4">
        <div>
          <h2 className="font-display text-xl">Pix</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Os dados aparecem na tela de pagamento da fatura para o cliente.
          </p>
        </div>
        <div>
          <Label>Tipo de chave</Label>
          <Select
            value={f.pix_key_type}
            onValueChange={(v) => setF({ ...f, pix_key_type: v })}
          >
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cpf">CPF</SelectItem>
              <SelectItem value="cnpj">CNPJ</SelectItem>
              <SelectItem value="email">E-mail</SelectItem>
              <SelectItem value="phone">Telefone</SelectItem>
              <SelectItem value="random">Aleatória</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Chave Pix</Label>
          <Input
            value={f.pix_key}
            onChange={(e) => setF({ ...f, pix_key: e.target.value })}
            placeholder="sua chave Pix"
          />
        </div>
      </div>

      {/* PayPal */}
      <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-4">
        <div>
          <h2 className="font-display text-xl">PayPal</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Pagamento via API: ao clicar em <strong>Pagar com PayPal</strong>, o cliente é redirecionado já com o valor preenchido e a confirmação volta automaticamente.
          </p>
        </div>

        <div>
          <Label>Ambiente</Label>
          <Select
            value={f.paypal_env}
            onValueChange={(v) => setF({ ...f, paypal_env: v as "sandbox" | "live" })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sandbox">Sandbox (testes — sem cobrança real)</SelectItem>
              <SelectItem value="live">Produção (pagamentos reais)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground mt-1">
            Cada ambiente tem suas próprias credenciais. Crie um app em{" "}
            <a
              href="https://developer.paypal.com/dashboard/applications"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              PayPal Developer
            </a>
            .
          </p>
        </div>

        <div>
          <Label>Client ID (opcional, público)</Label>
          <Input
            value={f.paypal_client_id}
            onChange={(e) => setF({ ...f, paypal_client_id: e.target.value })}
            placeholder="A... (string longa do PayPal Developer)"
            className="font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Se preferir, deixe em branco e configure também o Client ID como
            secret <code>PAYPAL_CLIENT_ID</code>.
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 flex gap-3">
          <ShieldCheck className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-medium">Client Secret é gerenciado em local seguro</p>
            <p className="text-muted-foreground">
              Para alterar a senha do PayPal (Client Secret), abra o painel
              do Lovable Cloud nesse projeto e edite os secrets:
            </p>
            <ul className="text-muted-foreground list-disc pl-5">
              <li><code>PAYPAL_CLIENT_SECRET</code> — obrigatório</li>
              <li><code>PAYPAL_CLIENT_ID</code> — opcional (sobrescreve o campo acima)</li>
            </ul>
            <p className="text-muted-foreground">
              Caminho: <em>Lovable → Cloud → Secrets</em>. Após salvar, as
              edge functions de pagamento já usam o novo valor automaticamente.
            </p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? "Salvando..." : "Salvar configurações de cobrança"}
        </Button>
      </div>
    </div>
  );
}
