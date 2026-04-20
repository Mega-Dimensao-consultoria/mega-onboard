import jsPDF from "jspdf";
import type { Brand } from "@/hooks/useBrand";

type Lead = {
  id: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_whatsapp: string | null;
  solution_type: string | null;
  created_at: string;
};

type Answer = { question_label: string; answer: string | null };

export function generateBRD(brand: Brand | null, lead: Lead, answers: Answer[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;

  // Header band
  doc.setFillColor(20, 35, 80);
  doc.rect(0, 0, W, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(brand?.nome_fantasia || "Mega Dimensão", M, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const headerLines = [
    brand?.razao_social || "",
    brand?.cnpj ? `CNPJ: ${brand.cnpj}` : "",
    brand?.endereco || "",
    [brand?.telefone, brand?.email].filter(Boolean).join(" · "),
  ].filter(Boolean);
  let hy = 56;
  headerLines.forEach((l) => { doc.text(l, M, hy); hy += 12; });

  y = 120;
  doc.setTextColor(20, 35, 80);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Business Requirements Document (BRD)", M, y);
  y += 22;

  doc.setTextColor(110, 110, 110);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, M, y);
  y += 24;

  // Lead info
  doc.setDrawColor(220);
  doc.setFillColor(245, 247, 252);
  doc.roundedRect(M, y, W - M * 2, 80, 6, 6, "F");
  doc.setTextColor(20, 35, 80);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Identificação do Lead", M + 14, y + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(40);
  const info = [
    `Contato: ${lead.contact_name || "—"}`,
    `E-mail: ${lead.contact_email || "—"}    ·    WhatsApp: ${lead.contact_whatsapp || "—"}`,
    `Solução: ${lead.solution_type || "—"}    ·    Criado: ${new Date(lead.created_at).toLocaleString("pt-BR")}`,
  ];
  let iy = y + 38;
  info.forEach((l) => { doc.text(l, M + 14, iy); iy += 14; });
  y += 100;

  // Answers
  doc.setTextColor(20, 35, 80);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Respostas do briefing", M, y);
  y += 18;

  doc.setFontSize(10);
  for (const a of answers) {
    const labelLines = doc.splitTextToSize(a.question_label, W - M * 2);
    const answerLines = doc.splitTextToSize(a.answer || "—", W - M * 2);
    const block = labelLines.length * 13 + answerLines.length * 13 + 14;
    if (y + block > H - M) { doc.addPage(); y = M; }

    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 35, 80);
    doc.text(labelLines, M, y);
    y += labelLines.length * 13 + 2;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    doc.text(answerLines, M, y);
    y += answerLines.length * 13 + 12;
  }

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(`${brand?.nome_fantasia || "Mega Dimensão"} · Prospekta BRD`, M, H - 20);
    doc.text(`Página ${i}/${pageCount}`, W - M, H - 20, { align: "right" });
  }

  doc.save(`BRD-${(lead.contact_name || lead.id).replace(/\s+/g, "_")}.pdf`);
}
