import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClientId } from "@/hooks/useClientId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  full_name: z.string().trim().min(2).max(120),
  telefone: z.string().trim().max(40).optional().or(z.literal("")),
});

export default function Perfil() {
  const { user } = useAuth();
  const { clientId, isImpersonating } = useClientId();
  const [fullName, setFullName] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    supabase.from("profiles").select("full_name,telefone,email").eq("id", clientId).maybeSingle().then(({ data }) => {
      setFullName(data?.full_name || "");
      setTelefone(data?.telefone || "");
      setEmail(data?.email || (clientId === user?.id ? user?.email || "" : ""));
      setLoading(false);
    });
  }, [clientId, user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    if (isImpersonating) return toast({ title: "Modo visualização", description: "Saia do modo visualização para editar.", variant: "destructive" });
    const parsed = schema.safeParse({ full_name: fullName, telefone });
    if (!parsed.success) {
      toast({ title: "Dados inválidos", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, telefone }).eq("id", clientId);
    setBusy(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Perfil atualizado" });
  };

  if (loading) return <div className="text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="font-display text-3xl">Perfil</h1>
        <p className="text-muted-foreground mt-1">Seus dados cadastrais.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Dados básicos</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input value={email} disabled />
            </div>
            <div>
              <Label htmlFor="fn">Nome completo</Label>
              <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tel">Telefone</Label>
              <Input id="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy}>Salvar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
