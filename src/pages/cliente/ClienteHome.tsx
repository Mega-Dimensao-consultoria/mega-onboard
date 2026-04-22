import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function ClienteHome() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Bem-vindo</div>
        <h1 className="font-display text-4xl">{user?.user_metadata?.full_name || "Cliente"}</h1>
        <p className="text-muted-foreground mt-1">Acompanhe seus contratos, faturas e serviços contratados.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-sm font-normal text-muted-foreground">Contratos ativos</CardTitle></CardHeader><CardContent className="text-3xl font-display">—</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm font-normal text-muted-foreground">Faturas em aberto</CardTitle></CardHeader><CardContent className="text-3xl font-display">—</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm font-normal text-muted-foreground">Próximo vencimento</CardTitle></CardHeader><CardContent className="text-3xl font-display">—</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Em breve</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          As seções de contratos, faturas, serviços a la carte e troca de plano estão sendo entregues em ondas. Esta área já está pronta para receber seus dados assim que você aceitar uma proposta.
        </CardContent>
      </Card>
    </div>
  );
}
