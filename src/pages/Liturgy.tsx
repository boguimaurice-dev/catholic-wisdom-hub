import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Loader2, Calendar, Sparkles, Volume2, VolumeX, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTTS } from "@/hooks/useVoice";
import { TTSControls } from "@/components/TTSControls";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useReadingZoom } from "@/hooks/useReadingZoom";

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
  const { status: ttsStatus, speak, pause: pauseSpeaking, resume: resumeSpeaking, stop: stopSpeaking, skip, progress } = useTTS();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const play = (key: string, text: string) => { setActiveKey(key); speak(text, key); };
  const ttsFor = (key: string, text: string) => (
    <TTSControls
      status={activeKey === key ? ttsStatus : "idle"}
      active={activeKey === key}
      onListen={() => play(key, text)}
      onSkip={skip}
      progress={activeKey === key ? progress : undefined}
      listenLabel={localStorage.getItem(`tts-pos:${key}`) ? "Continuer" : "Écouter"}
      onPause={pauseSpeaking}
      onResume={resumeSpeaking}
      onStop={stopSpeaking}
    />
  );
  const { fontSize, changeFont, readingRef } = useReadingZoom();
  const tidy = (t: string) => (t || "").replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{2,}/g, "\n\n").trim();
  const [data, setData] = useState<LiturgyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const cacheKey = (d: string) => `liturgy:${language}:${d}`;
  const readCache = (d: string): LiturgyData | null => {
    try { const raw = localStorage.getItem(cacheKey(d)); return raw ? JSON.parse(raw) : null; } catch { return null; }
  };
  const writeCache = (d: string, v: LiturgyData) => {
    try {
      localStorage.setItem(cacheKey(d), JSON.stringify(v));
      // purge entries older than 7 days
      const limit = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
      Object.keys(localStorage).forEach((k) => {
        const m = k.match(/^liturgy:[a-z]+:(\d{4}-\d{2}-\d{2})$/);
        if (m && m[1] < limit) localStorage.removeItem(k);
      });
    } catch { /* quota */ }
  };

  const fetchDay = async (targetDate: string): Promise<LiturgyData> => {
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
    writeCache(targetDate, json);
    return json;
  };

  const prefetchNext = async (from: string) => {
    for (let i = 1; i <= 2; i++) {
      const d = new Date(new Date(from).getTime() + i * 864e5).toISOString().slice(0, 10);
      if (!readCache(d)) { try { await fetchDay(d); } catch { break; } }
    }
  };

  const load = async (targetDate: string, force = false) => {
    stopSpeaking();
    const cached = readCache(targetDate);
    if (cached) {
      setData(cached);
      setLoading(false);
      if (!force) { if (navigator.onLine) prefetchNext(targetDate); return; }
    }
    if (!navigator.onLine) {
      if (!cached) toast.error("Hors connexion : cette date n'a pas encore été enregistrée sur l'appareil.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setData(await fetchDay(targetDate));
      prefetchNext(targetDate);
    } catch (e) {
      if (!cached) toast.error(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

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
      <header className="sticky top-0 z-40 bg-primary/95 backdrop-blur-md text-primary-foreground py-3 sm:py-4 px-4 shadow-md border-b border-secondary/30">
        <div className="max-w-4xl mx-auto flex flex-wrap gap-2 items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/app">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
               <h1 className="font-serif text-lg sm:text-2xl font-bold break-words">
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

      <main ref={readingRef} className="liturgy-reading max-w-3xl mx-auto px-3 py-4 sm:p-6 space-y-6 min-w-0">
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
             className="bg-background border border-border rounded-md px-3 py-1.5 text-sm max-w-full min-w-0 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none"
          />
          <div className="flex items-center gap-1 sm:ml-auto" aria-label="Taille du texte">
            <Button size="sm" variant="outline" onClick={() => changeFont(-1)} aria-label="Réduire le texte">A−</Button>
            <Button size="sm" variant="outline" onClick={() => changeFont(1)} aria-label="Agrandir le texte">A+</Button>
          </div>
          <Button size="sm" onClick={() => load(date)} disabled={loading}>
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Tout écouter (lectures + méditation)</span>
                {ttsFor(`all:${language}:${data.date}`, data.lectures.map((l) => `${labelFor(l.type)}. ${l.reference || ""}. ${tidy(l.contenu)}`).join(" ") + " Méditation homilétique. " + data.meditation)}
              </div>
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
                  className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm min-w-0"
                >
                  <header className="mb-3 pb-3 border-b border-border/60 space-y-2">
                    <p className="text-xs uppercase tracking-wide text-secondary font-semibold">
                      {labelFor(l.type)}
                    </p>
                    {l.reference && (
                      <p className="text-sm text-muted-foreground mt-0.5">{l.reference}</p>
                    )}
                    {l.titre && (
                      <p className="font-serif text-base text-primary mt-1 italic">« {l.titre} »</p>
                    )}
                    {ttsFor(`lec:${language}:${data.date}:${i}`, `${labelFor(l.type)}. ${l.reference || ""}. ${l.refrain ? "Refrain : " + l.refrain + ". " : ""}${tidy(l.contenu)}`)}
                  </header>
                  {l.refrain && (
                     <p className="liturgy-text font-serif font-semibold text-primary/90 italic mb-3" style={{ fontSize }}>
                      R/ {l.refrain}
                    </p>
                  )}
                   <p className="liturgy-text font-serif leading-[1.5] whitespace-pre-line text-foreground" style={{ fontSize }}>
                    {tidy(l.contenu)}
                  </p>
                </motion.article>
              ))}
            </section>

            {/* Méditation */}
            <section>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="font-serif text-2xl text-primary flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-secondary" />
                  Méditation homilétique
                </h2>
                {ttsFor(`med:${language}:${data.date}`, data.meditation)}
              </div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-secondary/30 rounded-xl p-4 sm:p-6 shadow-sm min-w-0"
              >
                 <p className="liturgy-text font-serif leading-[1.5] whitespace-pre-line text-foreground" style={{ fontSize }}>
                  {tidy(data.meditation)}
                </p>
              </motion.div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
