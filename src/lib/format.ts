export const fmtMoney = (cents: number | null | undefined) =>
  ((cents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
};

export const fmtDateTime = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR");
};

export const onlyDigits = (s: string | null | undefined) => (s || "").replace(/\D/g, "");

export function waLink(phone: string | null | undefined, message: string): string | null {
  const num = onlyDigits(phone);
  if (!num) return null;
  const withCountry = num.length <= 11 ? `55${num}` : num;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

// Mensagens prontas para faturas — abre o WhatsApp com texto pré-preenchido.
type InvoiceMsg = {
  clientName?: string | null;
  amountCents: number;
  dueDate: string | Date;
  invoiceUrl: string;
  brandName?: string | null;
};

export function buildInvoiceCreatedMessage(i: InvoiceMsg): string {
  const name = i.clientName?.split(" ")[0] || "olá";
  const brand = i.brandName ? ` da ${i.brandName}` : "";
  return `Oi ${name}! Sua nova fatura${brand} no valor de ${fmtMoney(i.amountCents)} já está disponível. Vencimento: ${fmtDate(i.dueDate)}. Acesse: ${i.invoiceUrl}`;
}

export function buildInvoiceReminderMessage(i: InvoiceMsg & { overdue?: boolean }): string {
  const name = i.clientName?.split(" ")[0] || "olá";
  if (i.overdue) {
    return `Oi ${name}, identificamos que sua fatura de ${fmtMoney(i.amountCents)} venceu em ${fmtDate(i.dueDate)}. Por favor regularize: ${i.invoiceUrl}`;
  }
  return `Oi ${name}! Lembrete: sua fatura de ${fmtMoney(i.amountCents)} vence em ${fmtDate(i.dueDate)}. Acesse: ${i.invoiceUrl}`;
}

export function buildInvoicePaidMessage(i: Omit<InvoiceMsg, "dueDate"> & { paidAt: string | Date; method?: string }): string {
  const name = i.clientName?.split(" ")[0] || "olá";
  const m = i.method ? ` via ${i.method}` : "";
  return `Oi ${name}! Confirmamos o recebimento de ${fmtMoney(i.amountCents)}${m} em ${fmtDate(i.paidAt)}. Obrigado! ${i.invoiceUrl}`;
}

export const cycleLabel: Record<string, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  yearly: "Anual",
  one_time: "Único",
};

export const productTypeLabel: Record<string, string> = {
  plan: "Plano",
  service: "Serviço",
  addon: "Add-on",
  custom: "Customizado",
};

export const contractStatusLabel: Record<string, string> = {
  pending_setup: "Aguardando configuração",
  active: "Ativo",
  paused: "Pausado",
  cancelled: "Cancelado",
};

export const invoiceStatusLabel: Record<string, string> = {
  open: "Em aberto",
  paid: "Paga",
  overdue: "Vencida",
  cancelled: "Cancelada",
};

export function nextBillingDate(from: Date, cycle: string): Date | null {
  const d = new Date(from);
  switch (cycle) {
    case "monthly": d.setMonth(d.getMonth() + 1); return d;
    case "quarterly": d.setMonth(d.getMonth() + 3); return d;
    case "yearly": d.setFullYear(d.getFullYear() + 1); return d;
    case "one_time": return null;
    default: return null;
  }
}
