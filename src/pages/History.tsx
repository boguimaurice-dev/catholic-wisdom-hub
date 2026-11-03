import { useHideOnScroll } from "@/hooks/useHideOnScroll";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConsultationDocument } from "@/components/ConsultationDocument";
import { ConsultationResult } from "@/types/consultation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr, enUS, es, pt } from "date-fns/locale";
import { LanguageSelector } from "@/components/LanguageSelector";
import { TTSControls } from "@/components/TTSControls";
import { useTTS } from "@/hooks/useVoice";
import { useSubscription } from "@/hooks/useSubscription";
import { consultOrchestrator } from "@/services/orchestrator";

const dateLocales = { fr, en: enUS, es, pt };

interface SavedConsultation {
  id: string;
  question: string;
  synthesis: string;
  expert_contributions: any[];
  selected_experts: any[];
  analysis_reason: string;
  created_at: string;
}

export default function History() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [consultations, setConsultations] = useState<SavedConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const tts = useTTS();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const { canConsult, incrementUsage, currentPlan } = useSubscription();
  const [deepening, setDeepening] = useState(false);
  const [deepeningId, setDeepeningId] = useState<string | null>(null);
  const [deepenings, setDeepenings] = useState<Record<string, { point: string; result: ConsultationResult }[]>>({});

  useEffect(() => {
    if (user) fetchConsultations();
  }, [user]);

  const fetchConsultations = async () => {
    const { data, error } = await supabase
      .from("consultations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(t("history.loadError"));
    } else {
      setConsultations((data || []).map((d: any) => ({
        ...d,
        expert_contributions: d.expert_contributions as any[],
        selected_experts: d.selected_experts as any[],
      })));
    }
    setLoading(false);
  };

  const deleteConsultation = async (id: string) => {
    const { error } = await supabase.from("consultations").delete().eq("id", id);
    if (error) {
      toast.error(t("history.deleteError"));
    } else {
      setConsultations((prev) => prev.filter((c) => c.id !== id));
      toast.success(t("history.deleted"));
    }
  };

  const handleDeepen = async (c: SavedConsultation, point: string) => {
    if (!point.trim() || deepening) return;
    if (!canConsult()) {
      toast.error(t("index.limitReached").replace("{limit}", String(currentPlan?.max_consultations_per_day || 3)));
      return;
    }
    const enriched = `Approfondissement de la synthèse précédente.\n\nQuestion d'origine : ${c.question}\n\nExtrait de la synthèse déjà donnée :\n${c.synthesis.slice(0, 4000)}\n\nPoint à approfondir : ${point.trim()}\n\nApprofondis précisément ce point, sans répéter toute la synthèse.`;
    setDeepening(true);
    setDeepeningId(c.id);
    try {
      const result = await consultOrchestrator(enriched, []);
      if (!result.success) throw new Error(result.error || t("common.error"));
      setDeepenings((prev) => ({ ...prev, [c.id]: [...(prev[c.id] || []), { point: point.trim(), result }] }));
      if (user) {
        await supabase.from("consultations").insert({
          user_id: user.id,
          question: `🔎 Approfondir : ${point.trim()} (sur : ${c.question})`.slice(0, 1000),
          synthesis: result.synthesis,
          expert_contributions: result.expertContributions as any,
          selected_experts: result.analysis.selectedExperts as any,
          analysis_reason: result.analysis.reason,
        });
      }
      await incrementUsage();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setDeepening(false);
      setDeepeningId(null);
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

  const headerHidden = useHideOnScroll();
  return (
    <div className="min-h-screen bg-background">
      <header className={`sticky top-0 transition-transform duration-300 ${headerHidden ? "-translate-y-full" : ""} z-40 bg-primary/95 backdrop-blur-md text-primary-foreground py-3 sm:py-4 px-4 shadow-md border-b border-secondary/30`}>
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
                        deepenDisabled={deepening}
                        stickyDeepen
                        onDeepen={(point) => handleDeepen(c, point)}
                      />
                      {(deepenings[c.id] || []).map((d, i) => (
                        <div key={i} className="space-y-2 pl-2 border-l-2 border-secondary/40">
                          <p className="text-sm font-medium text-primary">🔎 Approfondir : {d.point}</p>
                          <ConsultationDocument
                            result={d.result}
                            question={d.point}
                            deepenDisabled={deepening}
                            stickyDeepen
                            onDeepen={(p) => handleDeepen({ ...c, synthesis: d.result.synthesis }, p)}
                          />
                        </div>
                      ))}
                      {deepening && deepeningId === c.id && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                          <Loader2 className="w-4 h-4 animate-spin" /> Les experts approfondissent ce point…
                        </div>
                      )}

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
                      <TTSControls
                        className="mt-3"
                        size="xs"
                        status={tts.status}
                        active={playingId === c.id}
                        onListen={() => { setPlayingId(c.id); tts.speak(c.synthesis); }}
                        onPause={tts.pause}
                        onResume={tts.resume}
                        onStop={() => { tts.stop(); setPlayingId(null); }}
                      />
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
