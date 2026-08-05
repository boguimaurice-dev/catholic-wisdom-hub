import jsPDF from "jspdf";
import { ConsultationResult, Source } from "@/types/consultation";

export interface ExportPayload {
  question: string;
  synthesis: string;
  sources: Source[];
  result: ConsultationResult;
  includeContributions?: boolean;
}

const APP_NAME = "Scriptorium — Assistant Recherche Catholique";

const todayFr = () =>
  new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "consultation";
}

/* ---------------------------------- Markdown --------------------------------- */

export function generateMarkdown({ question, synthesis, sources, result, includeContributions }: ExportPayload) {
  const experts = result.analysis.selectedExperts.map((e) => e.name).join(", ");
  let md = `# Consultation théologique\n\n`;
  md += `> **Question :** ${question}\n\n`;
  md += `- **Date :** ${todayFr()}\n`;
  md += `- **Experts consultés :** ${experts}\n`;
  if (result.analysis.reason) md += `- **Motif de sélection :** ${result.analysis.reason}\n`;
  md += `\n## Synthèse\n\n${synthesis}\n`;

  if (sources.length) {
    md += `\n## Sources\n\n`;
    sources.forEach((s) => {
      md += `${s.n}. ${s.title}${s.reference && s.reference !== s.title ? ` — *${s.reference}*` : ""}`;
      md += s.url ? ` — <${s.url}>\n` : `\n`;
    });
  }

  if (includeContributions && result.expertContributions?.length) {
    md += `\n## Contributions détaillées\n\n`;
    result.expertContributions.forEach((c) => {
      md += `### ${c.name} — ${c.title}\n\n${c.response}\n\n`;
    });
  }

  md += `\n---\n\n*Généré par ${APP_NAME}, ${todayFr()}.*\n`;
  return md;
}

/* ----------------------------------- BibTeX ---------------------------------- */

const escapeBib = (s: string) => (s || "").replace(/[{}\\]/g, "").replace(/&/g, "\\&");

export function generateBibTeX({ question, sources, result }: ExportPayload) {
  const year = new Date().getFullYear();
  const key = `scriptorium_${slugify(question).replace(/-/g, "_").slice(0, 30)}_${year}`;
  const url = typeof window !== "undefined" ? window.location.href : "";
  const experts = result.analysis.selectedExperts.map((e) => e.name).join(" and ");

  let bib = `@misc{${key},
  title        = {${escapeBib(question)}},
  author       = {${escapeBib(APP_NAME)}},
  howpublished = {Consultation théologique assistée, orchestrateur assistant en chef et chaires : ${escapeBib(experts)}},
  year         = {${year}},
  note         = {Consulté le ${escapeBib(todayFr())}},
  url          = {${url}}
}
`;

  sources.forEach((s) => {
    const skey = `${key}_src${s.n}`;
    bib += `\n@misc{${skey},
  title = {${escapeBib(s.title)}},
  note  = {${escapeBib(s.reference || s.title)}${s.type ? ` — ${escapeBib(s.type)}` : ""}},
  year  = {${year}}${s.url ? `,\n  url   = {${s.url}}` : ""}
}
`;
  });

  return bib;
}

/* ------------------------------------- RIS ----------------------------------- */

export function generateRIS({ question, sources, result }: ExportPayload) {
  const now = new Date();
  const dateRis = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/`;
  const url = typeof window !== "undefined" ? window.location.href : "";

  let ris = `TY  - ELEC\nTI  - ${question}\nAU  - ${APP_NAME}\nPY  - ${now.getFullYear()}\nDA  - ${dateRis}\nUR  - ${url}\n`;
  result.analysis.selectedExperts.forEach((e) => {
    ris += `A2  - ${e.name}\n`;
  });
  ris += `N1  - Consultation théologique générée le ${todayFr()}\nER  - \n\n`;

  sources.forEach((s) => {
    ris += `TY  - GEN\nTI  - ${s.title}\n`;
    if (s.reference && s.reference !== s.title) ris += `N1  - ${s.reference}\n`;
    if (s.url) ris += `UR  - ${s.url}\n`;
    ris += `PY  - ${now.getFullYear()}\nER  - \n\n`;
  });

  return ris;
}

/* ------------------------------------- PDF ----------------------------------- */

/** Nettoie le markdown pour un rendu PDF lisible. */
function stripMarkdown(text: string) {
  return (text || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/`/g, "");
}

export function generateConsultationPdf(payload: ExportPayload) {
  const { question, synthesis, sources, result, includeContributions } = payload;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) { doc.addPage(); y = margin; }
  };

  const write = (
    text: string,
    opts: { size: number; bold?: boolean; italic?: boolean; center?: boolean; color?: [number, number, number]; gap?: number }
  ) => {
    if (!text) return;
    doc.setFont("times", opts.bold ? (opts.italic ? "bolditalic" : "bold") : opts.italic ? "italic" : "normal");
    doc.setFontSize(opts.size);
    const [r, g, b] = opts.color ?? [30, 30, 50];
    doc.setTextColor(r, g, b);
    const lh = opts.size * 1.35;
    for (const paragraph of text.split("\n")) {
      if (!paragraph.trim()) { y += lh * 0.5; continue; }
      for (const line of doc.splitTextToSize(paragraph, maxW)) {
        ensureSpace(lh);
        doc.text(line, opts.center ? pageW / 2 : margin, y, { align: opts.center ? "center" : "left", maxWidth: maxW });
        y += lh;
      }
    }
    y += opts.gap ?? 6;
  };

  const rule = () => {
    ensureSpace(14);
    doc.setDrawColor(201, 168, 76);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
  };

  write("Consultation théologique", { size: 19, bold: true, center: true, color: [26, 26, 46], gap: 4 });
  write(APP_NAME, { size: 10, italic: true, center: true, color: [201, 168, 76], gap: 12 });

  write(`Question : ${question}`, { size: 12, italic: true, color: [26, 26, 46], gap: 6 });
  write(
    `Date : ${todayFr()}   ·   Chaires : ${result.analysis.selectedExperts.map((e) => e.name).join(", ")}`,
    { size: 9.5, color: [110, 110, 130], gap: 4 }
  );
  if (result.analysis.reason) write(result.analysis.reason, { size: 9.5, italic: true, color: [130, 130, 150] });

  rule();
  write("Synthèse", { size: 14, bold: true, color: [26, 26, 46], gap: 8 });
  write(stripMarkdown(synthesis), { size: 11, color: [30, 30, 50], gap: 8 });

  if (sources.length) {
    rule();
    write("Sources", { size: 14, bold: true, color: [26, 26, 46], gap: 8 });
    sources.forEach((s) => {
      write(`[${s.n}] ${s.title}${s.reference && s.reference !== s.title ? ` — ${s.reference}` : ""}`, {
        size: 10.5, color: [40, 40, 60], gap: 2,
      });
      if (s.url) write(s.url, { size: 9, italic: true, color: [120, 120, 140], gap: 6 });
    });
  }

  if (includeContributions && result.expertContributions?.length) {
    rule();
    write("Contributions détaillées", { size: 14, bold: true, color: [26, 26, 46], gap: 8 });
    result.expertContributions.forEach((c) => {
      write(`${c.name} — ${c.title}`, { size: 11.5, bold: true, color: [201, 168, 76], gap: 4 });
      write(stripMarkdown(c.response), { size: 10.5, color: [30, 30, 50], gap: 10 });
    });
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("times", "italic");
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 160);
    doc.text(`${i} / ${pages}`, pageW / 2, pageH - 20, { align: "center" });
  }

  return doc;
}
