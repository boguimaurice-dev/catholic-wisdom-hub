import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { ConsultationResult, EXPERTS_CONFIG } from "@/types/consultation";
import { Button } from "@/components/ui/button";
import { Download, Copy, FileText, Code, FileType, Check, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface ConsultationDocumentProps {
  result: ConsultationResult;
  question: string;
}

export function ConsultationDocument({ result, question }: ConsultationDocumentProps) {
  const [showExpertDetails, setShowExpertDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatePlainText = () => {
    let text = `CONSULTATION THÉOLOGIQUE\n`;
    text += `${"=".repeat(50)}\n\n`;
    text += `Question: ${question}\n\n`;
    text += `Experts consultés: ${result.analysis.selectedExperts.map(e => e.name).join(", ")}\n`;
    text += `Raison: ${result.analysis.reason}\n\n`;
    text += `${"=".repeat(50)}\n`;
    text += `SYNTHÈSE\n`;
    text += `${"=".repeat(50)}\n\n`;
    text += result.synthesis;
    
    if (showExpertDetails) {
      text += `\n\n${"=".repeat(50)}\n`;
      text += `CONTRIBUTIONS DÉTAILLÉES\n`;
      text += `${"=".repeat(50)}\n\n`;
      result.expertContributions.forEach(contrib => {
        text += `\n--- ${contrib.name} (${contrib.title}) ---\n\n`;
        text += contrib.response + "\n";
      });
    }
    return text;
  };

  const generateHTML = () => {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Consultation Théologique</title>
  <style>
    body { font-family: 'Crimson Text', Georgia, serif; max-width: 800px; margin: 0 auto; padding: 2rem; background: #FFF8DC; color: #3E2723; }
    h1 { font-family: 'Cinzel', serif; color: #8B4513; border-bottom: 2px solid #DAA520; padding-bottom: 0.5rem; }
    h2 { color: #8B4513; margin-top: 2rem; }
    .question { background: #F5F5DC; padding: 1rem; border-left: 4px solid #8B4513; margin: 1rem 0; font-style: italic; }
    .experts { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1rem 0; }
    .expert-badge { background: #8B4513; color: white; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.9rem; }
    .synthesis { background: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .contribution { margin-top: 2rem; padding: 1rem; border: 1px solid #DAA520; border-radius: 0.5rem; }
    .contribution-header { font-weight: bold; color: #8B4513; margin-bottom: 0.5rem; }
  </style>
</head>
<body>
  <h1>✝️ Consultation Théologique</h1>
  <div class="question"><strong>Question:</strong> ${question}</div>
  <div class="experts">
    ${result.analysis.selectedExperts.map(e => `<span class="expert-badge">${e.icon || "📚"} ${e.name}</span>`).join("")}
  </div>
  <p><em>${result.analysis.reason}</em></p>
  <h2>Synthèse</h2>
  <div class="synthesis">${result.synthesis.replace(/\n/g, "<br>")}</div>
  ${result.expertContributions.map(c => `
  <div class="contribution">
    <div class="contribution-header">${c.name} - ${c.title}</div>
    <div>${c.response.replace(/\n/g, "<br>")}</div>
  </div>`).join("")}
</body>
</html>`;
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Document téléchargé: ${filename}`);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatePlainText());
    setCopied(true);
    toast.success("Copié dans le presse-papiers");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-cream rounded-xl border-2 border-primary/30 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-bold flex items-center gap-2">
              ✝️ Synthèse de la Consultation
            </h3>
            <p className="text-xs sm:text-sm opacity-90 mt-1">
              {result.analysis.selectedExperts.length} expert(s) consulté(s)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={copyToClipboard}
              className="text-xs"
            >
              {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
              Copier
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => downloadFile(generatePlainText(), "consultation.txt", "text/plain")}
              className="text-xs"
            >
              <FileText className="w-3 h-3 mr-1" />
              TXT
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => downloadFile(generateHTML(), "consultation.html", "text/html")}
              className="text-xs"
            >
              <Code className="w-3 h-3 mr-1" />
              HTML
            </Button>
          </div>
        </div>
      </div>

      {/* Experts consultés */}
      <div className="p-3 sm:p-4 border-b border-primary/20 bg-primary/5">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs sm:text-sm font-medium text-primary">Experts:</span>
          {result.analysis.selectedExperts.map((expert) => {
            const config = EXPERTS_CONFIG[expert.key];
            return (
              <span
                key={expert.key}
                className={`px-2 py-1 rounded-full text-xs font-medium border ${config?.color || "bg-gray-100"}`}
              >
                {config?.icon} {expert.name}
              </span>
            );
          })}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 italic">
          {result.analysis.reason}
        </p>
      </div>

      {/* Synthèse */}
      <div className="p-4 sm:p-6">
        <div className="prose prose-sm sm:prose max-w-none prose-headings:font-serif prose-headings:text-primary prose-p:text-foreground prose-strong:text-primary">
          <ReactMarkdown>{result.synthesis}</ReactMarkdown>
        </div>
      </div>

      {/* Toggle détails experts */}
      <div className="border-t border-primary/20">
        <button
          onClick={() => setShowExpertDetails(!showExpertDetails)}
          className="w-full p-3 flex items-center justify-center gap-2 text-sm text-primary hover:bg-primary/5 transition-colors"
        >
          {showExpertDetails ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Masquer les contributions détaillées
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Voir les contributions de chaque expert
            </>
          )}
        </button>

        {showExpertDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="border-t border-primary/20"
          >
            {result.expertContributions.map((contrib, idx) => {
              const config = EXPERTS_CONFIG[contrib.expert];
              return (
                <div
                  key={idx}
                  className="p-4 border-b border-primary/10 last:border-b-0"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{config?.icon}</span>
                    <div>
                      <h4 className="font-serif font-bold text-primary">
                        {contrib.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {contrib.title}
                      </p>
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none text-foreground/90">
                    <ReactMarkdown>{contrib.response}</ReactMarkdown>
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
