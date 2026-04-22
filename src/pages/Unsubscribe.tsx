import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import BrandHeader from "@/components/BrandHeader";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type State = "loading" | "valid" | "invalid" | "already" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } }
        );
        const data = await res.json();
        if (!res.ok) {
          setState("invalid");
          return;
        }
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setState("already");
        } else if (data.valid === true) {
          setState("valid");
        } else {
          setState("invalid");
        }
      } catch {
        setState("error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) {
        setState("error");
      } else if (data?.success) {
        setState("done");
      } else if (data?.reason === "already_unsubscribed") {
        setState("already");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <BrandHeader />
      <main className="container mx-auto px-4 py-16 max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl">
              Cancelar inscrição
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {state === "loading" && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Validando link…
              </div>
            )}
            {state === "valid" && (
              <>
                <p className="text-muted-foreground">
                  Confirme abaixo para deixar de receber nossos emails.
                </p>
                <Button onClick={confirm} disabled={busy} className="w-full">
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirmar cancelamento
                </Button>
              </>
            )}
            {state === "done" && (
              <div className="flex items-start gap-3 text-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Inscrição cancelada</p>
                  <p className="text-sm text-muted-foreground">
                    Você não receberá mais emails desse tipo.
                  </p>
                </div>
              </div>
            )}
            {state === "already" && (
              <div className="flex items-start gap-3 text-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Você já havia cancelado a inscrição anteriormente.
                </p>
              </div>
            )}
            {(state === "invalid" || state === "error") && (
              <div className="flex items-start gap-3 text-foreground">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Link inválido ou expirado. Entre em contato com nosso suporte.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
