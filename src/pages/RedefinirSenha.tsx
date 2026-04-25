import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { BrandHeader } from "@/components/BrandHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const passwordSchema = z.string().min(8, "Senha precisa de no mínimo 8 caracteres").max(72);

export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase coloca o token no hash (#access_token=...) — detectSessionInUrl trata.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast({
          title: "Link inválido ou expirado",
          description: "Solicite um novo link de redefinição.",
          variant: "destructive",
        });
        navigate("/auth", { replace: true });
        return;
      }
      setReady(true);
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      passwordSchema.parse(pw);
    } catch (err) {
      toast({
        title: "Senha inválida",
        description: err instanceof z.ZodError ? err.errors[0].message : "",
        variant: "destructive",
      });
      return;
    }
    if (pw !== pw2) {
      toast({ title: "Senhas não conferem", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      toast({ title: "Falha ao redefinir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Senha atualizada", description: "Você já pode usar a nova senha." });
    const { data } = await supabase.auth.getUser();
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user!.id);
    const isConsultor = roles?.some((r) => r.role === "consultor");
    navigate(isConsultor ? "/consultor" : "/cliente", { replace: true });
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <BrandHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md bg-card border border-border/60 rounded-2xl p-8 shadow-elegant">
          <h1 className="font-display text-3xl mb-6">Redefinir senha</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="pw">Nova senha</Label>
              <Input
                id="pw"
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label htmlFor="pw2">Confirmar nova senha</Label>
              <Input
                id="pw2"
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar nova senha
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
