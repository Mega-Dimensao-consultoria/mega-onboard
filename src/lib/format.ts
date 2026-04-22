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

export function waLink(phone: string | null | undefined, message: string) {
  const num = onlyDigits(phone);
  const withCountry = num.length <= 11 ? `55${num}` : num;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
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
