import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useClientId } from "@/hooks/useClientId";
import { useBrand } from "@/hooks/useBrand";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtMoney, fmtDate, invoiceStatusLabel } from "@/lib/format";
import { buildPixPayload } from "@/lib/pix";
import { ArrowLeft, Copy, ExternalLink, CheckCircle2, QrCode } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Invoice = {
  id: string; total_cents: number; subtotal_cents: number; status: string; due_date: string;
  period_start: string | null; period_end: string | null;
  payment_method: string | null; paid_at: string | null; payment_proof_url: string | null;
  contract_id: string;
};
type Item = { id: string; description: string; amount_cents: number; quantity: number };

export default function FaturaDetalhe() {
  const { id } = useParams();
  const { clientId, isImpersonating } = useClientId();
  const { brand } = useBrand();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const refresh = async () => {
    if (!id) return;
    const [{ data: i }, { data: its }] = await Promise.all([
      supabase.from("invoices").select("*").eq("id", id).maybeSingle(),
      supabase.from("invoice_items").select("*").eq("invoice_id", id).order("created_at"),
    ]);
    setInv(i as Invoice);
    setItems((its as Item[]) || []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [id]);

  const pixPayload = useMemo(() => {
    if (!brand?.pix_key || !inv?.total_cents) return null;
    try {
      return buildPixPayload({
        pixKey: brand.pix_key,
        amountCents: inv.total_cents,
        merchantName: brand.razao_social || brand.nome_fantasia || "RECEBEDOR",
        merchantCity: "BRASIL",
        txid: inv.id.replace(/-/g, "").slice(0, 25),
        description: `Fatura ${inv.id.slice(0, 8).toUpperCase()}`,
      });
    } catch {
      return null;
    }
  }, [brand, inv]);

  const [pixQrDataUrl, setPixQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!pixPayload) { setPixQrDataUrl(null); return; }
    QRCode.toDataURL(pixPayload, { width: 256, margin: 1 }).then(setPixQrDataUrl).catch(() => setPixQrDataUrl(null));
  }, [pixPayload]);

  const paypalUrl = brand?.paypal_username
    ? `https://www.paypal.com/paypalme/${brand.paypal_username}/${(inv?.total_cents || 0) / 100}`
    : null;

  const copyPix = async () => {
    if (!pixPayload) {
      if (!brand?.pix_key) return toast({ title: "Chave Pix não configurada", variant: "destructive" });
      await navigator.clipboard.writeText(brand.pix_key);
      return toast({ title: "Chave Pix copiada" });
    }
    await navigator.clipboard.writeText(pixPayload);
    toast({ title: "Pix copia-e-cola copiado", description: "Cole no app do seu banco para pagar." });
  };

  const uploadProof = async (file: File) => {
    if (!inv || !clientId) return;
    if (isImpersonating) return toast({ title: "Modo visualização", description: "Saia do modo visualização para enviar comprovante.", variant: "destructive" });
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${clientId}/${inv.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("payment-proofs").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60 * 60 * 24 * 365);
      await supabase.from("invoices").update({
        payment_proof_url: signed?.signedUrl || path,
        notes: "Comprovante enviado pelo cliente, aguardando confirmação.",
      }).eq("id", inv.id);
      toast({ title: "Comprovante enviado", description: "Aguarde a confirmação do consultor." });
      refresh();
    } catch (e) {
      toast({ title: "Erro ao enviar", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setUploading(false); }
  };

  if (loading) return <div className="text-muted-foreground">Carregando…</div>;
  if (!inv) return <Card><CardContent className="py-10 text-center text-muted-foreground">Fatura não encontrada.</CardContent></Card>;

  const variant = inv.status === "paid" ? "default" : inv.status === "overdue" ? "destructive" : "secondary";

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm"><Link to="/cliente/faturas"><ArrowLeft className="h-4 w-4 mr-1" /> Faturas</Link></Button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Fatura #{inv.id.slice(0, 8).toUpperCase()}</div>
          <h1 className="font-display text-4xl mt-1">{fmtMoney(inv.total_cents)}</h1>
          <p className="text-muted-foreground mt-1">
            Vencimento {fmtDate(inv.due_date)}
            {inv.period_start && inv.period_end && ` · Período ${fmtDate(inv.period_start)} – ${fmtDate(inv.period_end)}`}
          </p>
        </div>
        <Badge variant={variant} className="text-sm">{invoiceStatusLabel[inv.status]}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>Itens</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? <p className="text-sm text-muted-foreground">Sem itens cadastrados.</p> : (
            <ul className="divide-y divide-border/60">
              {items.map((it) => (
                <li key={it.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{it.description}</div>
                    {it.quantity > 1 && <div className="text-xs text-muted-foreground">Quantidade: {it.quantity}</div>}
                  </div>
                  <div className="font-medium">{fmtMoney(it.amount_cents * it.quantity)}</div>
                </li>
              ))}
              <li className="py-3 flex items-center justify-between font-semibold">
                <div>Total</div>
                <div className="font-display text-xl">{fmtMoney(inv.total_cents)}</div>
              </li>
            </ul>
          )}
        </CardContent>
      </Card>

      {inv.status === "paid" ? (
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <div>
              <div className="font-medium">Fatura paga</div>
              <p className="text-sm text-muted-foreground">{inv.paid_at ? `Quitada em ${fmtDate(inv.paid_at)}` : ""}{inv.payment_method ? ` · via ${inv.payment_method}` : ""}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" /> Pagar com Pix</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {brand?.pix_key ? (
                <>
                  {pixQrDataUrl && (
                    <div className="flex justify-center bg-white p-3 rounded-lg border border-border/60">
                      <img src={pixQrDataUrl} alt="QR Code Pix" className="w-48 h-48" />
                    </div>
                  )}
                  <p className="text-xs text-center text-muted-foreground">
                    {pixPayload ? "Escaneie o QR Code ou copie o código abaixo. Valor já incluído." : "Chave Pix:"}
                  </p>
                  {pixPayload ? (
                    <div className="font-mono text-[10px] break-all bg-secondary/50 p-2 rounded max-h-24 overflow-y-auto">{pixPayload}</div>
                  ) : (
                    <div className="font-mono text-xs break-all bg-secondary/50 p-2 rounded">{brand.pix_key}</div>
                  )}
                  <Button onClick={copyPix} variant="outline" className="w-full">
                    <Copy className="h-4 w-4 mr-2" /> {pixPayload ? "Copiar Pix copia-e-cola" : "Copiar chave"}
                  </Button>
                  <p className="text-xs text-muted-foreground">Após o pagamento, anexe o comprovante abaixo.</p>
                </>
              ) : <p className="text-sm text-muted-foreground">Chave Pix ainda não configurada pelo consultor.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Pagar com PayPal</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {paypalUrl ? (
                <>
                  <p className="text-sm text-muted-foreground">Você será redirecionado para o PayPal já com o valor preenchido.</p>
                  <Button asChild className="w-full"><a href={paypalUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-2" /> Abrir PayPal</a></Button>
                </>
              ) : <p className="text-sm text-muted-foreground">PayPal ainda não configurado pelo consultor.</p>}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Comprovante</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {inv.payment_proof_url ? (
                <p className="text-sm text-muted-foreground">Comprovante enviado. Aguardando confirmação do consultor.</p>
              ) : (
                <>
                  <Label htmlFor="proof">Anexe o comprovante (PDF, PNG, JPG)</Label>
                  <Input id="proof" type="file" accept="image/*,.pdf" disabled={uploading}
                    onChange={(e) => e.target.files?.[0] && uploadProof(e.target.files[0])} />
                  <p className="text-xs text-muted-foreground">{uploading ? "Enviando…" : "Após o consultor confirmar, a fatura será marcada como paga automaticamente."}</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
