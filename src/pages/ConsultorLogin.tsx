import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { consultor } from "@/lib/api";
import { BrandHeader } from "@/components/BrandHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";

export default function ConsultorLogin() {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await consultor.login(pw);
      navigate("/consultor");
    } catch (err) {
      toast({ title: "Acesso negado", description: err instanceof Error ? err.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <BrandHeader />
      <main className="flex-1 grid place-items-center px-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm bg-card border border-border/60 rounded-2xl p-8 shadow-elegant">
          <div className="h-12 w-12 rounded-xl bg-primary/10 grid place-items-center mb-5">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-display text-2xl mb-1">Área do consultor</h1>
          <p className="text-sm text-muted-foreground mb-6">Acesse com a senha configurada.</p>
          <div className="space-y-2 mb-6">
            <Label htmlFor="pw">Senha</Label>
            <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Verificando..." : "Entrar"}
          </Button>
        </form>
      </main>
    </div>
  );
}
