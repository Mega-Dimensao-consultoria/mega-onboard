// Helpers para gerar links wa.me com mensagem pré-preenchida.
// Não usamos API oficial do WhatsApp — apenas links que abrem o app.

import { fmtMoney, fmtDate } from "./format";

export function onlyDigitsPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  // se vier sem código do país, assume Brasil (55)
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d;
}

export function waLink(phone: string | null | undefined, message: string): string | null {
  const p = onlyDigitsPhone(phone);
  if (!p) return null;
  return `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
}

type InvoiceMsgInput = {
  clientName?: string | null;
  amountCents: number;
  dueDate: string | Date;
  invoiceUrl: string;
  brandName?: string | null;
};

export function buildInvoiceCreatedMessage(i: InvoiceMsgInput): string {
  const name = (i.clientName?.split(" ")[0]) || "olá";
  const brand = i.brandName ? ` da ${i.brandName}` : "";
  return `Oi ${name}! Sua nova fatura${brand} no valor de ${fmtMoney(i.amountCents)} já está disponível. Vencimento: ${fmtDate(i.dueDate)}. Acesse: ${i.invoiceUrl}`;
}

export function buildInvoiceReminderMessage(i: InvoiceMsgInput & { overdue?: boolean }): string {
  const name = (i.clientName?.split(" ")[0]) || "olá";
  if (i.overdue) {
    return `Oi ${name}, identificamos que sua fatura de ${fmtMoney(i.amountCents)} venceu em ${fmtDate(i.dueDate)}. Por favor regularize o pagamento: ${i.invoiceUrl}`;
  }
  return `Oi ${name}! Lembrete amigável: sua fatura de ${fmtMoney(i.amountCents)} vence em ${fmtDate(i.dueDate)}. Acesse: ${i.invoiceUrl}`;
}

export function buildInvoicePaidMessage(i: Omit<InvoiceMsgInput, "dueDate"> & { paidAt: string | Date; method?: string }): string {
  const name = (i.clientName?.split(" ")[0]) || "olá";
  const m = i.method ? ` via ${i.method}` : "";
  return `Oi ${name}! Confirmamos o recebimento do pagamento de ${fmtMoney(i.amountCents)}${m} em ${fmtDate(i.paidAt)}. Obrigado! ${i.invoiceUrl}`;
}
