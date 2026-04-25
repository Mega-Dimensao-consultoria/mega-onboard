// Gera o PDF do contrato assinado digitalmente no aceite da proposta.
import jsPDF from "jspdf";
import type { Brand } from "@/hooks/useBrand";

export type ContractItem = {
  custom_name?: string | null;
  product_name?: string | null;
  billing_cycle: string;
  quantity: number;
  custom_price_cents?: number | null;
  product_price_cents?: number | null;
};

export type ContractParty = {
  full_name: string;
  doc_type: "cpf" | "cnpj";
  doc_number: string;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  endereco?: string | null;
  email: string;
  telefone?: string | null;
};

export type ContractPdfInput = {
  brand: Brand | null;
  contractId: string;
  leadId: string;
  party: ContractParty;
  items: ContractItem[];
  acceptedAt: Date;
  acceptedIp?: string | null;
  technicalSolutionPlain?: string | null;
};

const cycleNames: Record<string, string> = {
  monthly: "mensal",
  quarterly: "trimestral",
  yearly: "anual",
  one_time: "única",
};

function fmtMoney(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function maskDoc(doc: string, type: "cpf" | "cnpj") {
  const d = doc.replace(/\D/g, "");
  if (type === "cpf" && d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (type === "cnpj" && d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  return doc;
}

export function generateContractPdf(input: ContractPdfInput): Blob {
  const { brand, contractId, party, items, acceptedAt, acceptedIp, technicalSolutionPlain } = input;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;

  const ensure = (h: number) => {
    if (y + h > H - M - 30) { doc.addPage(); y = M; }
  };

  // Header
  doc.setFillColor(20, 35, 80);
  doc.rect(0, 0, W, 80, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(brand?.nome_fantasia || "Contrato de Prestação de Serviços", M, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(brand?.razao_social || "", M, 54);
  if (brand?.cnpj) doc.text(`CNPJ: ${brand.cnpj}`, M, 66);

  y = 110;
  doc.setTextColor(20, 35, 80);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Contrato de Prestação de Serviços", M, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Contrato nº ${contractId.slice(0, 8).toUpperCase()} · Aceito em ${acceptedAt.toLocaleString("pt-BR")}`, M, y);
  y += 24;

  // Partes
  doc.setTextColor(20, 35, 80);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("CONTRATANTE", M, y); y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40);
  const contratanteLines = [
    party.doc_type === "cnpj"
      ? `${party.razao_social || party.full_name}${party.nome_fantasia ? ` (${party.nome_fantasia})` : ""}`
      : party.full_name,
    `${party.doc_type === "cnpj" ? "CNPJ" : "CPF"}: ${maskDoc(party.doc_number, party.doc_type)}`,
    party.endereco || "",
    `E-mail: ${party.email}${party.telefone ? ` · Telefone: ${party.telefone}` : ""}`,
  ].filter(Boolean);
  contratanteLines.forEach((l) => { ensure(14); doc.text(l, M, y); y += 14; });
  y += 8;

  doc.setTextColor(20, 35, 80);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  ensure(20);
  doc.text("CONTRATADA", M, y); y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40);
  const contratadaLines = [
    brand?.razao_social || brand?.nome_fantasia || "—",
    brand?.cnpj ? `CNPJ: ${brand.cnpj}` : "",
    brand?.endereco || "",
    [brand?.telefone, brand?.email].filter(Boolean).join(" · "),
  ].filter(Boolean);
  contratadaLines.forEach((l) => { ensure(14); doc.text(l, M, y); y += 14; });
  y += 16;

  // Objeto
  doc.setTextColor(20, 35, 80);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  ensure(40);
  doc.text("1. OBJETO", M, y); y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40);
  const objeto = "O presente contrato tem por objeto a prestação dos serviços listados abaixo, conforme proposta comercial aceita digitalmente pelo CONTRATANTE.";
  const oLines = doc.splitTextToSize(objeto, W - M * 2);
  ensure(oLines.length * 13);
  doc.text(oLines, M, y); y += oLines.length * 13 + 16;

  // Itens
  doc.setTextColor(20, 35, 80);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  ensure(40);
  doc.text("2. SERVIÇOS E VALORES", M, y); y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("Descrição", M, y);
  doc.text("Ciclo", M + 280, y);
  doc.text("Qtd", M + 360, y);
  doc.text("Valor", W - M, y, { align: "right" });
  y += 6;
  doc.setDrawColor(220);
  doc.line(M, y, W - M, y); y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40);
  let total = 0;
  for (const it of items) {
    const name = it.custom_name || it.product_name || "Item";
    const price = it.custom_price_cents ?? it.product_price_cents ?? 0;
    const subtotal = price * it.quantity;
    total += subtotal;
    const nameLines = doc.splitTextToSize(name, 260);
    const rowH = Math.max(14, nameLines.length * 13);
    ensure(rowH);
    doc.text(nameLines, M, y);
    doc.text(cycleNames[it.billing_cycle] || it.billing_cycle, M + 280, y);
    doc.text(String(it.quantity), M + 360, y);
    doc.text(fmtMoney(subtotal), W - M, y, { align: "right" });
    y += rowH + 4;
  }
  doc.setDrawColor(220);
  doc.line(M, y, W - M, y); y += 14;
  doc.setFont("helvetica", "bold");
  doc.text("Total", M, y);
  doc.text(fmtMoney(total), W - M, y, { align: "right" });
  y += 22;

  // Cláusulas
  const clauses: { title: string; body: string }[] = [
    {
      title: "3. VIGÊNCIA",
      body: "Este contrato passa a viger na data de aceite e permanece em vigor por prazo indeterminado para itens recorrentes, podendo ser cancelado por qualquer das partes com aviso prévio de 30 dias. Itens de cobrança única encerram-se com a entrega.",
    },
    {
      title: "4. PAGAMENTO",
      body: "As cobranças serão emitidas conforme o ciclo de cada item. O CONTRATANTE pagará via Pix ou PayPal, conforme opções disponibilizadas na área do cliente. O atraso superior a 15 dias autoriza a suspensão dos serviços.",
    },
    {
      title: "5. PROTEÇÃO DE DADOS (LGPD)",
      body: "As partes se comprometem a tratar dados pessoais conforme a Lei nº 13.709/2018 (LGPD), utilizando-os exclusivamente para a execução deste contrato.",
    },
    {
      title: "6. ACEITE ELETRÔNICO",
      body: `Este contrato foi aceito eletronicamente pelo CONTRATANTE em ${acceptedAt.toLocaleString("pt-BR")}${acceptedIp ? `, a partir do endereço IP ${acceptedIp}` : ""}, configurando manifestação inequívoca de vontade nos termos do art. 10, §2º da MP 2.200-2/2001 e da Lei 14.063/2020.`,
    },
    {
      title: "7. FORO",
      body: "Fica eleito o foro da comarca da sede da CONTRATADA para dirimir quaisquer dúvidas oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.",
    },
  ];

  for (const c of clauses) {
    ensure(40);
    doc.setTextColor(20, 35, 80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(c.title, M, y); y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40);
    const lines = doc.splitTextToSize(c.body, W - M * 2);
    ensure(lines.length * 13);
    doc.text(lines, M, y); y += lines.length * 13 + 12;
  }

  // Solução técnica (resumo)
  if (technicalSolutionPlain && technicalSolutionPlain.trim()) {
    doc.addPage(); y = M;
    doc.setTextColor(20, 35, 80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Anexo I — Escopo Técnico Aceito", M, y); y += 22;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40);
    const paragraphs = technicalSolutionPlain.split(/\n+/);
    for (const p of paragraphs) {
      if (!p.trim()) continue;
      const lines = doc.splitTextToSize(p, W - M * 2);
      if (y + lines.length * 13 > H - M) { doc.addPage(); y = M; }
      doc.text(lines, M, y);
      y += lines.length * 13 + 6;
    }
  }

  // Assinatura digital — bloco final
  ensure(110);
  y = Math.max(y, H - M - 110);
  doc.setDrawColor(220);
  doc.setFillColor(245, 247, 252);
  doc.roundedRect(M, y, W - M * 2, 90, 6, 6, "F");
  doc.setTextColor(20, 35, 80);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("ASSINATURA ELETRÔNICA", M + 14, y + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60);
  const sigLines = [
    `Assinado por: ${party.full_name} (${party.email})`,
    `Documento: ${party.doc_type.toUpperCase()} ${maskDoc(party.doc_number, party.doc_type)}`,
    `Data e hora: ${acceptedAt.toLocaleString("pt-BR")}`,
    acceptedIp ? `Endereço IP: ${acceptedIp}` : "",
    `Contrato: ${contractId}`,
  ].filter(Boolean);
  let sy = y + 38;
  sigLines.forEach((l) => { doc.text(l, M + 14, sy); sy += 12; });

  // Footer paginação
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(`${brand?.nome_fantasia || ""} · Contrato ${contractId.slice(0, 8).toUpperCase()}`, M, H - 20);
    doc.text(`Página ${i}/${pages}`, W - M, H - 20, { align: "right" });
  }

  return doc.output("blob") as Blob;
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
