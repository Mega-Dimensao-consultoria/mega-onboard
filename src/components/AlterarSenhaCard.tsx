import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, KeyRound } from "lucide-react";

const passwordSchema = z.string().min(8, "Senha precisa de no mínimo 8 caracteres").max(72);

/**
 * Card reutilizável para troca de senha do usuário logado.
 * Reautentica com a senha atual antes de atualizar.
 */
export function AlterarSenhaCard() {
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

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
    // Reautenticar com a senha atual
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;
    if (!email) {
      setBusy(false);
      toast({ title: "Sessão inválida", variant: "destructive" });
      return;
    }
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (signErr) {
      setBusy(false);
      toast({ title: "Senha atual incorreta", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      toast({ title: "Falha ao alterar", description: error.message, variant: "destructive" });
      return;
    }
    setCurrent("");
    setPw("");
    setPw2("");
    toast({ title: "Senha alterada com sucesso" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" /> Alterar senha
        </CardTitle>
        <CardDescription>
          Informe a senha atual para confirmar e escolha uma nova senha.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div>
            <Label htmlFor="cur">Senha atual</Label>
            <Input
              id="cur"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <Label htmlFor="np">Nova senha</Label>
            <Input
              id="np"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label htmlFor="np2">Confirmar nova senha</Label>
            <Input
              id="np2"
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar nova senha
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
