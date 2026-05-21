import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Loader2, Calendar, Sparkles, Volume2, VolumeX, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTTS } from "@/hooks/useVoice";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Lecture {
  type: string;
  titre: string;
  reference: string;
  contenu: string;
  refrain?: string;
}

interface LiturgyData {
  date: string;
  informations: any;
  lectures: Lecture[];
  meditation: string;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/liturgy-meditation`;

export default function Liturgy() {
  const { t, language } = useLanguage();
  const { isSpeaking, speak, stop: stopSpeaking } = useTTS();
  const [data, setData] = useState<LiturgyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const load = async (targetDate: string) => {
    setLoading(true);
    stopSpeaking();
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ date: targetDate, language }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Erreur");
      setData(json);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const labelFor = (type: string) => {
    const map: Record<string, string> = {
      lecture_1: "Première lecture",
      psaume: "Psaume",
      lecture_2: "Deuxième lecture",
      sequence: "Séquence",
      evangile: "Évangile",
      acclamation: "Acclamation",
      cantique: "Cantique",
    };
    return map[type] || type;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground py-4 px-4 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/app">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-serif text-lg sm:text-2xl font-bold tracking-wide">
                Liturgie du jour
              </h1>
              <p className="text-xs opacity-80 hidden sm:block">Textes & méditation homilétique</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector variant="ghost" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Date picker */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="w-4 h-4 text-secondary" />
            <span>Date liturgique</span>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
          />
          <Button size="sm" onClick={() => load(date)} disabled={loading} className="ml-auto">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Charger"}
          </Button>
        </div>

        {loading && !data && (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-secondary" />
            <p className="mt-4 text-muted-foreground">Préparation des lectures et de la méditation…</p>
          </div>
        )}

        {data && (
          <>
            {/* Info liturgique */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-secondary/30 rounded-xl p-5 shadow-sm"
            >
              <p className="font-serif text-xl text-primary">{data.informations?.ligne1}</p>
              {data.informations?.fete && (
                <p className="text-sm text-muted-foreground mt-1">{data.informations.fete}</p>
              )}
              {data.informations?.couleur && (
                <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-secondary/15 text-secondary capitalize">
                  Couleur : {data.informations.couleur}
                </span>
              )}
            </motion.div>

            {/* Lectures */}
            <section className="space-y-4">
              <h2 className="font-serif text-2xl text-primary flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-secondary" />
                Textes du jour
              </h2>
              {data.lectures.map((l, i) => (
                <motion.article
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-xl p-5 shadow-sm"
                >
                  <header className="mb-3 pb-3 border-b border-border/60">
                    <p className="text-xs uppercase tracking-wide text-secondary font-semibold">
                      {labelFor(l.type)}
                    </p>
                    {l.reference && (
                      <p className="text-sm text-muted-foreground mt-0.5">{l.reference}</p>
                    )}
                    {l.titre && (
                      <p className="font-serif text-base text-primary mt-1 italic">« {l.titre} »</p>
                    )}
                  </header>
                  {l.refrain && (
                    <p className="text-sm font-medium text-primary/80 italic mb-2">
                      R/ {l.refrain}
                    </p>
                  )}
                  <p className="text-sm sm:text-base leading-relaxed whitespace-pre-line">
                    {l.contenu}
                  </p>
                </motion.article>
              ))}
            </section>

            {/* Méditation */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-2xl text-primary flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-secondary" />
                  Méditation homilétique
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (isSpeaking ? stopSpeaking() : speak(data.meditation))}
                  className="gap-1.5"
                >
                  {isSpeaking ? <VolumeX className="w-4 h-4" /> : <AudioLines className="w-4 h-4" />}
                  {isSpeaking ? "Arrêter" : "Écouter"}
                </Button>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-secondary/30 rounded-xl p-6 shadow-sm prose prose-sm sm:prose-base max-w-none"
              >
                <p className="text-sm sm:text-base leading-relaxed whitespace-pre-line text-foreground">
                  {data.meditation}
                </p>
              </motion.div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
