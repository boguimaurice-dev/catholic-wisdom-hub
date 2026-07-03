import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { format, addDays, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft, BookOpen, Loader2, CalendarIcon, Sparkles, VolumeX, AudioLines,
  ChevronLeft, ChevronRight, WifiOff, Type, Share2, Download, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTTS } from "@/hooks/useVoice";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { readCache, writeCache, prefetchWeek, refreshStaleCache } from "@/lib/liturgyCache";
import jsPDF from "jspdf";


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
  _cachedAt?: number;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/liturgy-meditation`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;


const FONT_SIZES = ["text-sm", "text-base", "text-lg", "text-xl"] as const;

export default function Liturgy() {
  const { language } = useLanguage();
  const { isSpeaking, speak, stop: stopSpeaking } = useTTS();
  const [data, setData] = useState<LiturgyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [date, setDate] = useState<Date>(new Date());
  const [fontIdx, setFontIdx] = useState<number>(() => {
    const s = Number(localStorage.getItem("liturgy-font-idx"));
    return Number.isFinite(s) && s >= 0 && s < FONT_SIZES.length ? s : 1;
  });

  const dateStr = format(date, "yyyy-MM-dd");

  const load = useCallback(async (target: Date) => {
    const key = format(target, "yyyy-MM-dd");
    const cached = readCache(key, language);
    if (cached) setData(cached);
    setLoading(true);
    stopSpeaking();
    try {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ date: key, language }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Erreur");
      setData(json);
      writeCache(key, language, json);
    } catch (e) {
      if (!cached) toast.error(e instanceof Error ? e.message : "Erreur de chargement");
      else toast.info("Mode hors-ligne : contenu en cache affiché.");
    } finally {
      setLoading(false);
    }
  }, [language, stopSpeaking]);

  useEffect(() => { load(date); }, [load, date]);

  // Prefetch the whole week for offline access; re-run when back online.
  useEffect(() => {
    const ctrl = new AbortController();
    prefetchWeek(language, 7, ctrl.signal);
    const onOnline = () => prefetchWeek(language, 7, ctrl.signal);
    window.addEventListener("online", onOnline);
    return () => { ctrl.abort(); window.removeEventListener("online", onOnline); };
  }, [language]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/liturgy`;
    const title = `Liturgie du ${format(date, "d MMMM yyyy", { locale: fr })}`;
    const text = data?.informations?.ligne1
      ? `${title} — ${data.informations.ligne1}`
      : title;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast.success("Lien copié dans le presse-papier");
      }
    } catch { /* user cancelled */ }
  }, [date, data]);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => { localStorage.setItem("liturgy-font-idx", String(fontIdx)); }, [fontIdx]);

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

  const fontClass = FONT_SIZES[fontIdx];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground py-3 px-4 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="font-serif text-base sm:text-2xl font-bold tracking-wide truncate">
                Liturgie du jour
              </h1>
              <p className="text-[11px] opacity-80 hidden sm:block">Textes & méditation homilétique</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {offline && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-primary-foreground/10 px-2 py-1 rounded-full">
                <WifiOff className="w-3 h-3" /> Hors-ligne
              </span>
            )}
            <LanguageSelector variant="ghost" />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              aria-label="Partager"
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Date navigation */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-3 shadow-sm">
          <Button size="icon" variant="outline" onClick={() => setDate(subDays(date, 1))} aria-label="Jour précédent">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex-1 justify-start gap-2 font-serif">
                <CalendarIcon className="w-4 h-4 text-secondary" />
                <span className="capitalize">
                  {format(date, "EEEE d MMMM yyyy", { locale: fr })}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
                locale={fr}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Button size="icon" variant="outline" onClick={() => setDate(addDays(date, 1))} aria-label="Jour suivant">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDate(new Date())} className="hidden sm:inline-flex">
            Aujourd'hui
          </Button>
        </div>

        {/* Reading controls */}
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <Type className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Taille du texte</span>
          <div className="flex items-center gap-1">
            {FONT_SIZES.map((_, i) => (
              <button
                key={i}
                onClick={() => setFontIdx(i)}
                aria-label={`Taille ${i + 1}`}
                className={cn(
                  "w-6 h-6 rounded border transition-colors",
                  i === fontIdx ? "bg-secondary/20 border-secondary text-secondary" : "border-border hover:bg-muted",
                )}
              >
                <span style={{ fontSize: 10 + i * 2 }}>A</span>
              </button>
            ))}
          </div>
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
              className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-secondary/30 rounded-xl p-5 shadow-sm text-center"
            >
              <p className="font-serif text-xl sm:text-2xl text-primary leading-snug">{data.informations?.ligne1}</p>
              {data.informations?.fete && (
                <p className="text-sm text-muted-foreground mt-1 italic">{data.informations.fete}</p>
              )}
              {data.informations?.couleur && (
                <span className="inline-block mt-3 text-xs px-3 py-1 rounded-full bg-secondary/15 text-secondary capitalize tracking-wide">
                  ✦ Couleur liturgique : {data.informations.couleur} ✦
                </span>
              )}
            </motion.div>

            {/* Lectures */}
            <section className="space-y-5">
              <h2 className="font-serif text-2xl text-primary flex items-center gap-2 border-b border-secondary/30 pb-2">
                <BookOpen className="w-5 h-5 text-secondary" />
                Textes du jour
              </h2>
              {data.lectures.map((l, i) => (
                <motion.article
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card border border-border rounded-xl p-5 sm:p-7 shadow-sm"
                >
                  <header className="mb-4 pb-3 border-b border-border/60 text-center">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-secondary font-semibold">
                      ✦ {labelFor(l.type)} ✦
                    </p>
                    {l.reference && (
                      <p className="text-sm text-muted-foreground mt-1 font-medium">{l.reference}</p>
                    )}
                    {l.titre && (
                      <p className="font-serif text-base sm:text-lg text-primary mt-2 italic">« {l.titre} »</p>
                    )}
                  </header>
                  {l.refrain && (
                    <p className={cn("font-medium text-primary/85 italic mb-4 text-center border-l-2 border-secondary/50 pl-3", fontClass)}>
                      R/ {l.refrain}
                    </p>
                  )}
                  <div
                    className={cn(
                      "leading-[1.85] whitespace-pre-line text-foreground/90 first-letter:font-serif first-letter:text-3xl first-letter:sm:text-4xl first-letter:text-secondary first-letter:font-bold first-letter:mr-1 first-letter:float-left first-letter:leading-none first-letter:pt-1",
                      fontClass,
                    )}
                    style={{ fontFamily: "'Crimson Text', Georgia, serif", textAlign: "justify", hyphens: "auto" }}
                  >
                    {l.contenu}
                  </div>
                </motion.article>
              ))}
            </section>

            {/* Méditation */}
            {data.meditation && (
              <section>
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap border-b border-secondary/30 pb-2">
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
                  className="bg-card border border-secondary/30 rounded-xl p-5 sm:p-8 shadow-sm"
                >
                  <p
                    className={cn("leading-[1.9] whitespace-pre-line text-foreground/90", fontClass)}
                    style={{ fontFamily: "'Crimson Text', Georgia, serif", textAlign: "justify", hyphens: "auto" }}
                  >
                    {data.meditation}
                  </p>
                </motion.div>
              </section>
            )}

            {data._cachedAt && offline && (
              <p className="text-center text-xs text-muted-foreground italic">
                Contenu en cache — dernière mise à jour {new Date(data._cachedAt).toLocaleString("fr-FR")}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
