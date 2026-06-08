import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBrand } from "@/hooks/useBrand";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type Form = {
  pix_key_type: string;
  pix_key: string;
  paypal_env: "sandbox" | "live";
  whm_host: string;
  whm_user: string;
  whm_api_token: string;
  whm_port: string;
  whm_auto_provision: boolean;
  whm_auto_suspend: boolean;
};

export function BillingSettingsPanel() {
  const { brand, refresh } = useBrand();
  const [f, setF] = useState<Form>({
    pix_key_type: "",
    pix_key: "",
    paypal_env: "sandbox",
    whm_host: "",
    whm_user: "",
    whm_api_token: "",
    whm_port: "2087",
    whm_auto_provision: false,
    whm_auto_suspend: false,
  });
  const [saving, setSaving] = useState(false);
  const [testingWhm, setTestingWhm] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  const testWHM = async () => {
    setTestingWhm(true);
    setTestResult(null);
    try {
      // First save the current config to ensure we test what's in the inputs
      const { error: saveErr } = await supabase
        .from("brand_settings")
        .update({
          whm_config: {
            host: f.whm_host,
            user: f.whm_user,
            api_token: f.whm_api_token,
            port: f.whm_port,
          } as any,
        })
        .eq("id", brand?.id);
      
      if (saveErr) throw new Error("Salve as configurações antes de testar.");

      const { data, error } = await supabase.functions.invoke("whm-integration", {
        body: { action: "test_connection", cpanel_user: f.whm_user }
      });

      if (error) throw error;

      if (data?.ok && data.result?.connectivity) {
        setTestResult({
          success: true,
          message: `Conectado ao WHM v${data.result.version}. Permissões verificadas com sucesso.`,
          details: {
            conectividade: data.result.connectivity,
            permissoes: data.result.permissions_check,
            carga_sistema: data.result.load_check
          }
        });
        toast({ title: "Teste de conexão bem-sucedido!" });
      } else {
        throw new Error(data?.result?.raw?.version?.metadata?.reason || "Falha na autenticação ou servidor inacessível.");
      }
    } catch (e) {
      setTestResult({
        success: false,
        message: e instanceof Error ? e.message : "Erro desconhecido ao testar conexão."
      });
      toast({ 
        title: "Erro no teste", 
        description: "Verifique os dados e tente novamente.",
        variant: "destructive" 
      });
    } finally {
      setTestingWhm(false);
    }
  };

  useEffect(() => {
    if (!brand) return;
    const whm = (brand as any).whm_config || {};
    setF({
      pix_key_type: brand.pix_key_type || "",
      pix_key: brand.pix_key || "",
      paypal_env: (brand.paypal_env as "sandbox" | "live") || "sandbox",
      whm_host: whm.host || "",
      whm_user: whm.user || "",
      whm_api_token: whm.api_token || "",
      whm_port: whm.port || "2087",
      whm_auto_provision: (brand as any).whm_auto_provision || false,
      whm_auto_suspend: (brand as any).whm_auto_suspend || false,
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
          whm_config: {
            host: f.whm_host,
            user: f.whm_user,
            api_token: f.whm_api_token,
            port: f.whm_port,
          } as any,
          whm_auto_provision: f.whm_auto_provision,
          whm_auto_suspend: f.whm_auto_suspend,
        })
        .eq("id", brand.id);
      if (error) throw error;
      toast({ title: "Configurações salvas!" });
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

        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 flex gap-3">
          <ShieldCheck className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-medium">Credenciais gerenciadas em local seguro</p>
            <p className="text-muted-foreground">
              Client ID e Client Secret do PayPal ficam armazenados como secrets no Lovable Cloud:
            </p>
            <ul className="text-muted-foreground list-disc pl-5">
              <li><code>PAYPAL_CLIENT_ID</code></li>
              <li><code>PAYPAL_CLIENT_SECRET</code></li>
            </ul>
            <p className="text-muted-foreground">
              Caminho: <em>Lovable → Cloud → Secrets</em>. Ao trocar entre Sandbox e Produção, atualize os dois secrets com as credenciais do app correspondente no PayPal Developer e selecione o ambiente acima.
            </p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? "Salvando..." : "Salvar configurações"}
        </Button>
      </div>

      {/* WHM / cPanel */}
      <div className="lg:col-span-2 bg-card rounded-2xl border border-border/60 p-6 space-y-4">
        <div>
          <h2 className="font-display text-xl">Integração WHM / cPanel</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Configure seu servidor WHM para automatizar a suspensão e encerramento de contas.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Servidor (IP ou Hostname)</Label>
            <Input
              value={f.whm_host}
              onChange={(e) => setF({ ...f, whm_host: e.target.value })}
              placeholder="ex: srv1.meuhost.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Porta API (Padrão: 2087)</Label>
            <Input
              value={f.whm_port}
              onChange={(e) => setF({ ...f, whm_port: e.target.value })}
              placeholder="2087"
            />
          </div>
          <div className="space-y-2">
            <Label>Usuário WHM (Root ou Reseller)</Label>
            <Input
              value={f.whm_user}
              onChange={(e) => setF({ ...f, whm_user: e.target.value })}
              placeholder="root"
            />
          </div>
          <div className="space-y-2">
            <Label>Token de API</Label>
            <Input
              type="password"
              value={f.whm_api_token}
              onChange={(e) => setF({ ...f, whm_api_token: e.target.value })}
              placeholder="Seu token de API do WHM"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 pt-4 border-t border-border/40">
          <div className="flex items-center justify-between gap-3 bg-secondary/30 p-4 rounded-xl">
            <div>
              <Label className="font-medium">Provisão Automática</Label>
              <p className="text-[10px] text-muted-foreground">Criar conta cPanel após pagamento da primeira fatura.</p>
            </div>
            <Switch 
              checked={f.whm_auto_provision} 
              onCheckedChange={(v) => setF({ ...f, whm_auto_provision: v })}
            />
          </div>

          <div className="flex items-center justify-between gap-3 bg-secondary/30 p-4 rounded-xl">
            <div>
              <Label className="font-medium">Suspensão Automática</Label>
              <p className="text-[10px] text-muted-foreground">Suspender conta no cPanel se houver faturas vencidas.</p>
            </div>
            <Switch 
              checked={f.whm_auto_suspend} 
              onCheckedChange={(v) => setF({ ...f, whm_auto_suspend: v })}
            />
          </div>
        </div>

        <div className="rounded-xl border border-blue-500/40 bg-blue-500/5 p-3 flex gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1 text-muted-foreground">
            <p className="font-medium text-foreground">Como configurar:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Acesse seu WHM e procure por <strong>Manage API Tokens</strong>.</li>
              <li>Gere um novo token com permissões para: <em>Manage accounts (suspend/unsuspend/remove)</em> e <em>Passwd</em>.</li>
              <li>Insira o token e o hostname acima e salve.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
