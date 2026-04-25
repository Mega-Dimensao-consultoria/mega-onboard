import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BrandHeader } from "@/components/BrandHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useBrand } from "@/hooks/useBrand";

const emailSchema = z.string().trim().email("Email inválido").max(255);
const passwordSchema = z.string().min(8, "Senha precisa de no mínimo 8 caracteres").max(72);
const nameSchema = z.string().trim().min(2, "Informe seu nome").max(120);

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, role, loading } = useAuth();
  const { brand } = useBrand();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);

  // login
  const [lEmail, setLEmail] = useState("");
  const [lPw, setLPw] = useState("");

  // signup
  const [sName, setSName] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sPw, setSPw] = useState("");
  const [sPw2, setSPw2] = useState("");

  useEffect(() => {
    if (loading || !user) return;
    const next = params.get("next");
    if (next) navigate(next, { replace: true });
    else if (role === "consultor") navigate("/consultor", { replace: true });
    else navigate("/cliente", { replace: true });
  }, [user, role, loading, navigate, params]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(lEmail);
      passwordSchema.parse(lPw);
    } catch (err) {
      toast({ title: "Dados inválidos", description: err instanceof z.ZodError ? err.errors[0].message : "", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: lEmail, password: lPw });
    setBusy(false);
    if (error) {
      toast({ title: "Falha no login", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Bem-vindo!" });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      nameSchema.parse(sName);
      emailSchema.parse(sEmail);
      passwordSchema.parse(sPw);
    } catch (err) {
      toast({ title: "Dados inválidos", description: err instanceof z.ZodError ? err.errors[0].message : "", variant: "destructive" });
      return;
    }
    if (sPw !== sPw2) {
      toast({ title: "Senhas não conferem", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: sEmail,
      password: sPw,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: sName },
      },
    });
    setBusy(false);
    if (error) {
      toast({ title: "Falha no cadastro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Conta criada", description: "Você já pode acessar." });
  };

  const accent = brand?.auth_accent_color;
  return (
    <div className="min-h-screen flex flex-col">
      <BrandHeader />
      <main className="flex-1 grid lg:grid-cols-2 px-0">
        {brand?.auth_image_url && (
          <div
            className="hidden lg:block bg-secondary"
            style={{
              backgroundImage: `url(${brand.auth_image_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}
        <div className={`flex items-center justify-center px-6 py-10 ${brand?.auth_image_url ? "" : "lg:col-span-2"}`}>
        <div className="w-full max-w-md bg-card border border-border/60 rounded-2xl p-8 shadow-elegant">
          <div className="mb-6">
            <div
              className="text-xs uppercase tracking-widest text-muted-foreground"
              style={accent ? { color: `hsl(${accent})` } : undefined}
            >
              {brand?.auth_subtitle || "Acesso"}
            </div>
            <h1 className="font-display text-3xl mt-1">{brand?.auth_title || "Entre ou crie sua conta"}</h1>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")} className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="lemail">Email</Label>
                  <Input id="lemail" type="email" value={lEmail} onChange={(e) => setLEmail(e.target.value)} autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="lpw">Senha</Label>
                  <Input id="lpw" type="password" value={lPw} onChange={(e) => setLPw(e.target.value)} autoComplete="current-password" />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Entrar
                </Button>
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline w-full text-center"
                  onClick={async () => {
                    try {
                      emailSchema.parse(lEmail);
                    } catch {
                      toast({
                        title: "Informe seu email",
                        description: "Digite o email da conta para receber o link de redefinição.",
                        variant: "destructive",
                      });
                      return;
                    }
                    setBusy(true);
                    const { error } = await supabase.auth.resetPasswordForEmail(lEmail, {
                      redirectTo: `${window.location.origin}/redefinir-senha`,
                    });
                    setBusy(false);
                    if (error) {
                      toast({ title: "Falha ao enviar", description: error.message, variant: "destructive" });
                      return;
                    }
                    toast({
                      title: "Link enviado",
                      description: "Se o email existir, você receberá um link para redefinir a senha.",
                    });
                  }}
                  disabled={busy}
                >
                  Esqueci minha senha
                </button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label htmlFor="sname">Nome completo</Label>
                  <Input id="sname" value={sName} onChange={(e) => setSName(e.target.value)} autoComplete="name" />
                </div>
                <div>
                  <Label htmlFor="semail">Email</Label>
                  <Input id="semail" type="email" value={sEmail} onChange={(e) => setSEmail(e.target.value)} autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="spw">Senha</Label>
                  <Input id="spw" type="password" value={sPw} onChange={(e) => setSPw(e.target.value)} autoComplete="new-password" />
                </div>
                <div>
                  <Label htmlFor="spw2">Confirmar senha</Label>
                  <Input id="spw2" type="password" value={sPw2} onChange={(e) => setSPw2(e.target.value)} autoComplete="new-password" />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Criar conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
        </div>
      </main>
    </div>
  );
}
