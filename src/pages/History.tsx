import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConsultationDocument } from "@/components/ConsultationDocument";
import { ConsultationResult, Expert, ExpertContribution } from "@/types/consultation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr, enUS, es, pt } from "date-fns/locale";
import { LanguageSelector } from "@/components/LanguageSelector";

const dateLocales = { fr, en: enUS, es, pt };

interface SavedConsultation {
  id: string;
  question: string;
  synthesis: string;
  expert_contributions: ExpertContribution[];
  selected_experts: Expert[];
  analysis_reason: string;
  created_at: string;
}

export default function History() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [consultations, setConsultations] = useState<SavedConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchConsultations = useCallback(async () => {
    const { data, error } = await supabase
      .from("consultations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(t("history.loadError"));
    } else {
      setConsultations((data || []).map((row) => ({
        ...row,
        analysis_reason: row.analysis_reason || "",
        expert_contributions: Array.isArray(row.expert_contributions)
          ? row.expert_contributions as unknown as ExpertContribution[]
          : [],
        selected_experts: Array.isArray(row.selected_experts)
          ? row.selected_experts as unknown as Expert[]
          : [],
      })));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    if (user) void fetchConsultations();
  }, [user, fetchConsultations]);

  const deleteConsultation = async (id: string) => {
    const { error } = await supabase.from("consultations").delete().eq("id", id);
    if (error) {
      toast.error(t("history.deleteError"));
    } else {
      setConsultations((prev) => prev.filter((c) => c.id !== id));
      toast.success(t("history.deleted"));
    }
  };

  const toConsultationResult = (c: SavedConsultation): ConsultationResult => ({
    success: true,
    analysis: {
      selectedExperts: c.selected_experts,
      reason: c.analysis_reason || "",
    },
    expertContributions: c.expert_contributions,
    synthesis: c.synthesis,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="w-4 h-4 mr-1" />
                {t("common.back")}
              </Button>
            </Link>
            <h1 className="font-serif text-xl font-bold">{t("history.title")}</h1>
          </div>
          <LanguageSelector variant="ghost" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : consultations.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">{t("history.empty")}</p>
            <Link to="/">
              <Button className="mt-4">{t("history.askQuestion")}</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {consultations.map((c) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {expandedId === c.id ? (
                    <div className="space-y-3">
                      <button
                        onClick={() => setExpandedId(null)}
                        className="text-sm text-accent hover:underline"
                      >
                        ← {t("history.collapse")}
                      </button>
                      <ConsultationDocument
                        result={toConsultationResult(c)}
                        question={c.question}
                      />
                    </div>
                  ) : (
                    <div className="bg-card border border-border rounded-xl p-4 hover:border-secondary/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          onClick={() => setExpandedId(c.id)}
                          className="flex-1 text-left"
                        >
                          <p className="font-medium text-foreground line-clamp-2">{c.question}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(c.created_at), "d MMMM yyyy 'à' HH:mm", { locale: dateLocales[language] })}
                            {" · "}
                            {c.selected_experts.length} {t("history.experts")}
                          </p>
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteConsultation(c.id)}
                          className="text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
