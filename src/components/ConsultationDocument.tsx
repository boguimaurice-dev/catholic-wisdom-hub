import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { ConsultationResult, EXPERTS_CONFIG, Source, SourceType } from "@/types/consultation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download, Copy, FileText, Code, Check, ChevronDown, ChevronUp,
  BookOpen, Landmark, ScrollText, Church, Feather, Gavel, Clock, BookMarked, ExternalLink, Link as LinkIcon,
  Quote, FileDown, Library, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { parseSources } from "@/lib/parseSources";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { makeRichRenderers } from "@/components/GlossaryText";
import { QuillButton } from "@/components/QuillButton";
import {
  generateMarkdown, generateBibTeX, generateRIS, generateConsultationPdf, slugify,
} from "@/lib/exportConsultation";



interface ConsultationDocumentProps {
  result: ConsultationResult;
  question: string;
}

const SOURCE_META: Record<SourceType, { label: string; icon: typeof BookOpen; className: string }> = {
  bible:       { label: "Écriture Sainte",  icon: BookOpen,   className: "bg-red-50 border-red-300 text-red-900 dark:bg-red-950/40 dark:text-red-100 dark:border-red-800" },
  catechisme:  { label: "Catéchisme",       icon: BookMarked, className: "bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800" },
  concile:     { label: "Concile",          icon: Landmark,   className: "bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100 dark:border-blue-800" },
  encyclique:  { label: "Encyclique",       icon: ScrollText, className: "bg-purple-50 border-purple-300 text-purple-900 dark:bg-purple-950/40 dark:text-purple-100 dark:border-purple-800" },
  pere:        { label: "Père de l'Église", icon: Feather,    className: "bg-orange-50 border-orange-300 text-orange-900 dark:bg-orange-950/40 dark:text-orange-100 dark:border-orange-800" },
  docteur:     { label: "Docteur",          icon: Feather,    className: "bg-indigo-50 border-indigo-300 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100 dark:border-indigo-800" },
  liturgie:    { label: "Liturgie",         icon: Church,     className: "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800" },
  droit_canon: { label: "Droit canonique",  icon: Gavel,      className: "bg-slate-50 border-slate-300 text-slate-900 dark:bg-slate-900/40 dark:text-slate-100 dark:border-slate-700" },
  histoire:    { label: "Histoire",         icon: Clock,      className: "bg-stone-50 border-stone-300 text-stone-900 dark:bg-stone-900/40 dark:text-stone-100 dark:border-stone-700" },
  autre:       { label: "Source",           icon: LinkIcon,   className: "bg-muted border-border text-foreground" },
};

/** Renderers markdown : notes de bas de page cliquables + glossaire dynamique. */
function makeFootnoteRenderers(valid: Set<number>) {
  return makeRichRenderers(valid);
}


export function ConsultationDocument({ result, question }: ConsultationDocumentProps) {
  const { canExportPdf, canExportAdvanced } = usePlanAccess();
  const [showExpertDetails, setShowExpertDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [citationCopied, setCitationCopied] = useState(false);


  const { body: synthesisBody, sources: parsedSources } = parseSources(result.synthesis || "");
  const sources: Source[] = (result.sources && result.sources.length ? result.sources : parsedSources)
    .slice()
    .sort((a, b) => a.n - b.n);
  const validNums = new Set(sources.map((s) => s.n));
  const renderers = makeFootnoteRenderers(validNums);

  const sourcesPlainText = () => {
    if (!sources.length) return "";
    let s = `\n\n${"=".repeat(50)}\nSOURCES\n${"=".repeat(50)}\n\n`;
    sources.forEach((src) => {
      s += `[${src.n}] ${src.title}${src.reference ? ` (${src.reference})` : ""}`;
      if (src.url) s += ` — ${src.url}`;
      s += "\n";
    });
    return s;
  };

  const generatePlainText = () => {
    let text = `CONSULTATION THÉOLOGIQUE\n${"=".repeat(50)}\n\n`;
    text += `Question: ${question}\n\n`;
    text += `Experts consultés: ${result.analysis.selectedExperts.map(e => e.name).join(", ")}\n`;
    text += `Raison: ${result.analysis.reason}\n\n`;
    text += `${"=".repeat(50)}\nSYNTHÈSE\n${"=".repeat(50)}\n\n`;
    text += synthesisBody;
    text += sourcesPlainText();
    if (showExpertDetails) {
      text += `\n\n${"=".repeat(50)}\nCONTRIBUTIONS DÉTAILLÉES\n${"=".repeat(50)}\n\n`;
      result.expertContributions.forEach(contrib => {
        text += `\n--- ${contrib.name} (${contrib.title}) ---\n\n`;
        text += contrib.response + "\n";
      });
    }
    return text;
  };

  const generateHTML = () => {
    const sourcesHTML = sources.length ? `
  <h2>Sources</h2>
  <ol>
    ${sources.map(s => `<li id="source-${s.n}">${s.url ? `<a href="${s.url}" target="_blank" rel="noopener">${s.title}</a>` : s.title}${s.reference ? ` <em>(${s.reference})</em>` : ""}</li>`).join("")}
  </ol>` : "";
    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Consultation Théologique</title>
<style>body{font-family:'Crimson Text',Georgia,serif;max-width:800px;margin:0 auto;padding:2rem;background:#FFF8DC;color:#3E2723}h1,h2{font-family:'Cinzel',serif;color:#8B4513}.question{background:#F5F5DC;padding:1rem;border-left:4px solid #8B4513;margin:1rem 0;font-style:italic}sup a{color:#8B4513;text-decoration:none;font-weight:600}.contribution{margin-top:2rem;padding:1rem;border:1px solid #DAA520;border-radius:.5rem}</style>
</head><body>
<h1>✝️ Consultation Théologique</h1>
<div class="question"><strong>Question:</strong> ${question}</div>
<h2>Synthèse</h2>
<div>${synthesisBody.replace(/\n/g, "<br>")}</div>
${sourcesHTML}
${result.expertContributions.map(c => `<div class="contribution"><strong>${c.name} - ${c.title}</strong><div>${c.response.replace(/\n/g, "<br>")}</div></div>`).join("")}
</body></html>`;
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Document téléchargé: ${filename}`);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatePlainText());
    setCopied(true);
    toast.success("Copié dans le presse-papiers");
    setTimeout(() => setCopied(false), 2000);
  };

  const generateCitation = () => {
    const now = new Date();
    const dateFr = now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    const experts = result.analysis.selectedExperts.map((e) => e.name).join(", ");
    const url = typeof window !== "undefined" ? window.location.href : "";
    const srcList = sources.length
      ? ` Sources citées : ${sources.map((s) => `[${s.n}] ${s.title}${s.reference ? `, ${s.reference}` : ""}`).join(" ; ")}.`
      : "";
    return `Assistant Recherche Catholique (orchestrateur assistant en chef et experts : ${experts}), « ${question} », consultation théologique générée le ${dateFr}, ${url}.${srcList}`;
  };

  const copyCitation = async () => {
    await navigator.clipboard.writeText(generateCitation());
    setCitationCopied(true);
    toast.success("Citation académique copiée");
    setTimeout(() => setCitationCopied(false), 2000);
  };

  /* ---------------- Exports académiques (PDF / Markdown / Zotero) --------------- */

  const requireUpgrade = (label: string) => {
    toast.error(`${label} est réservé aux plans supérieurs.`, {
      action: { label: "Voir les plans", onClick: () => (window.location.href = "/pricing") },
    });
  };

  const exportPayload = {
    question,
    synthesis: synthesisBody,
    sources,
    result,
    includeContributions: showExpertDetails,
  };
  const baseName = `consultation-${slugify(question)}`;

  const downloadPdf = () => {
    const doc = generateConsultationPdf(exportPayload);
    doc.save(`${baseName}.pdf`);
    toast.success("Document téléchargé en PDF");
  };

  const downloadMarkdown = () =>
    downloadFile(generateMarkdown(exportPayload), `${baseName}.md`, "text/markdown;charset=utf-8");

  const downloadBibTeX = () =>
    downloadFile(generateBibTeX(exportPayload), `${baseName}.bib`, "application/x-bibtex;charset=utf-8");

  const downloadRIS = () =>
    downloadFile(generateRIS(exportPayload), `${baseName}.ris`, "application/x-research-info-systems;charset=utf-8");




  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-cream rounded-xl border-2 border-primary/30 overflow-hidden"
    >
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-bold flex items-center gap-2">
              ✝️ Synthèse de la Consultation
            </h3>
            <p className="text-xs sm:text-sm opacity-90 mt-1">
              {result.analysis.selectedExperts.length} expert(s) consulté(s)
              {sources.length ? ` · ${sources.length} source(s)` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={copyToClipboard} className="text-xs">
              {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}Copier
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => (canExportPdf ? downloadPdf() : requireUpgrade("L'export PDF"))}
              className="text-xs"
              aria-label={canExportPdf ? "Télécharger en PDF" : "Export PDF réservé aux plans supérieurs"}
            >
              {canExportPdf ? <FileDown className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}PDF
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => (canExportAdvanced ? downloadMarkdown() : requireUpgrade("L'export Markdown"))}
              className="text-xs"
              aria-label={canExportAdvanced ? "Télécharger en Markdown" : "Export Markdown réservé au plan Élite"}
            >
              {canExportAdvanced ? <FileText className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}Markdown
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="secondary" className="text-xs" aria-label="Autres formats d'exportation">
                  <Download className="w-3 h-3 mr-1" />Autres
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="text-xs">Gestion bibliographique</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => (canExportAdvanced ? downloadBibTeX() : requireUpgrade("L'export BibTeX"))}>
                  {canExportAdvanced ? <Library className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                  BibTeX (.bib) — Zotero, LaTeX
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => (canExportAdvanced ? downloadRIS() : requireUpgrade("L'export RIS"))}>
                  {canExportAdvanced ? <Library className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                  RIS (.ris) — Zotero, Mendeley
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs">Formats bruts</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => downloadFile(generatePlainText(), `${baseName}.txt`, "text/plain;charset=utf-8")}>
                  <FileText className="w-4 h-4 mr-2" />Texte brut (.txt)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => downloadFile(generateHTML(), `${baseName}.html`, "text/html;charset=utf-8")}>
                  <Code className="w-4 h-4 mr-2" />Page HTML (.html)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        </div>
      </div>

      <div className="p-3 sm:p-4 border-b border-primary/20 bg-primary/5">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs sm:text-sm font-medium text-primary">Experts:</span>
          {result.analysis.selectedExperts.map((expert) => {
            const config = EXPERTS_CONFIG[expert.key];
            return (
              <span key={expert.key} className={`px-2 py-1 rounded-full text-xs font-medium border ${config?.color || "bg-muted"}`}>
                {config?.icon} {expert.name}
              </span>
            );
          })}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 italic">{result.analysis.reason}</p>
      </div>

      <div className="p-4 sm:p-6">
        <div className="prose prose-base sm:prose-lg max-w-none leading-relaxed lettrine-prose prose-headings:font-serif prose-headings:text-primary prose-p:text-foreground prose-p:leading-relaxed prose-strong:text-primary prose-li:leading-relaxed">
          <ReactMarkdown components={renderers}>{synthesisBody}</ReactMarkdown>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={copyCitation} className="text-xs">
            {citationCopied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Quote className="w-3.5 h-3.5 mr-1.5" />}
            Copier la citation académique
          </Button>
          <QuillButton
            text={synthesisBody}
            source={`Synthèse — ${question}`}
            label="Ajouter au Scriptorium"
          />
          <span className="text-xs text-muted-foreground italic">
            Termes soulignés : cliquez pour la définition
          </span>
        </div>



        {sources.length > 0 && (
          <div className="mt-8 pt-6 border-t border-primary/20">
            <h4 className="font-serif text-lg sm:text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <BookMarked className="w-5 h-5" /> Sources
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {sources.map((src) => {
                const meta = SOURCE_META[src.type] || SOURCE_META.autre;
                const Icon = meta.icon;
                const Wrapper: React.ElementType = src.url ? "a" : "div";
                const wrapperProps = src.url
                  ? { href: src.url, target: "_blank", rel: "noopener noreferrer" }
                  : {};
                return (
                  <div key={src.n} className="relative">
                  <Wrapper
                    id={`source-${src.n}`}
                    {...wrapperProps}
                    className={`group relative flex items-start gap-3 rounded-xl border-2 p-3 sm:p-4 transition-all ${meta.className} ${src.url ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : ""}`}
                  >
                    <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-background/60 border border-current/20">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold opacity-70">[{src.n}]</span>
                        <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">{meta.label}</span>
                      </div>
                      <div className="font-serif font-semibold text-sm sm:text-base leading-snug">{src.title}</div>
                      {src.reference && src.reference !== src.title && (
                        <div className="text-xs opacity-75 mt-0.5">{src.reference}</div>
                      )}
                    </div>
                    {src.url && (
                      <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    )}
                  </Wrapper>
                  <div className="mt-1.5">
                    <QuillButton
                      text={`${src.title}${src.reference && src.reference !== src.title ? ` (${src.reference})` : ""}${src.url ? `\n${src.url}` : ""}`}
                      source={`Source [${src.n}] — ${meta.label}`}
                    />
                  </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-primary/20">
        <button
          onClick={() => setShowExpertDetails(!showExpertDetails)}
          className="w-full p-3 flex items-center justify-center gap-2 text-sm text-primary hover:bg-primary/5 transition-colors"
        >
          {showExpertDetails ? (
            <><ChevronUp className="w-4 h-4" />Masquer les contributions détaillées</>
          ) : (
            <><ChevronDown className="w-4 h-4" />Voir les contributions de chaque expert</>
          )}
        </button>

        {showExpertDetails && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-primary/20">
            {result.expertContributions.map((contrib, idx) => {
              const config = EXPERTS_CONFIG[contrib.expert];
              return (
                <div key={idx} className="p-4 border-b border-primary/10 last:border-b-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{config?.icon}</span>
                    <div>
                      <h4 className="font-serif font-bold text-primary">{contrib.name}</h4>
                      <p className="text-xs text-muted-foreground">{contrib.title}</p>
                    </div>
                    <QuillButton
                      className="ml-auto"
                      text={contrib.response}
                      source={`${contrib.name} — ${contrib.title}`}
                    />
                  </div>
                  <div className="prose prose-base max-w-none leading-relaxed text-foreground/90 prose-p:leading-relaxed">
                    <ReactMarkdown components={makeRichRenderers(new Set())}>{contrib.response}</ReactMarkdown>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
