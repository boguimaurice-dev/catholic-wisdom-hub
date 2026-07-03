import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft, BookOpen, Loader2, CalendarIcon, Sparkles, VolumeX, AudioLines,
  ChevronLeft, ChevronRight, WifiOff, Type, Share2, Download, FileText, ArrowUp,
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

  const [showTopButton, setShowTopButton] = useState(false);

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

  // Auto-update cached liturgies silently on mount and each time we come back online.
  useEffect(() => {
    const ctrl = new AbortController();
    prefetchWeek(language, 7, ctrl.signal);
    refreshStaleCache(language, 6 * 60 * 60 * 1000, ctrl.signal).then(() => {
      // If current visible date got refreshed in the background, reload silently.
      const fresh = readCache(dateStr, language);
      if (fresh && (!data?._cachedAt || (fresh._cachedAt ?? 0) > (data._cachedAt ?? 0))) {
        setData(fresh);
      }
    });
    const onOnline = () => {
      prefetchWeek(language, 7, ctrl.signal);
      refreshStaleCache(language, 0, ctrl.signal);
    };
    window.addEventListener("online", onOnline);
    return () => { ctrl.abort(); window.removeEventListener("online", onOnline); };
  }, [language, dateStr, data?._cachedAt]);

  const [downloading, setDownloading] = useState<null | "week" | "month">(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const downloadRange = useCallback(async (days: number, label: "week" | "month") => {
    if (!navigator.onLine) { toast.error("Connexion internet requise pour télécharger."); return; }
    setDownloading(label);
    setProgress({ done: 0, total: days });
    const t = toast.loading(`Téléchargement de ${days} jours…`);
    try {
      await prefetchWeek(language, days, undefined, (done, total) => setProgress({ done, total }));
      toast.success(`${days} jours disponibles hors-ligne.`, { id: t });
    } catch {
      toast.error("Téléchargement interrompu.", { id: t });
    } finally {
      setDownloading(null);
      setProgress(null);
    }
  }, [language]);

  const buildPdf = useCallback(() => {
    if (!data) return null;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 48;
    const maxW = pageW - margin * 2;
    let y = margin;

    const ensureSpace = (h: number) => {
      if (y + h > pageH - margin) { doc.addPage(); y = margin; }
    };
    const writeBlock = (text: string, opts: { size: number; bold?: boolean; italic?: boolean; align?: "left" | "center" | "justify"; color?: [number, number, number]; gap?: number }) => {
      if (!text) return;
      doc.setFont("times", opts.bold ? (opts.italic ? "bolditalic" : "bold") : opts.italic ? "italic" : "normal");
      doc.setFontSize(opts.size);
      const [r, g, b] = opts.color ?? [20, 20, 40];
      doc.setTextColor(r, g, b);
      const lines = doc.splitTextToSize(text, maxW);
      const lh = opts.size * 1.35;
      for (const line of lines) {
        ensureSpace(lh);
        const x = opts.align === "center" ? pageW / 2 : margin;
        doc.text(line, x, y, { align: opts.align === "center" ? "center" : "left", maxWidth: maxW });
        y += lh;
      }
      y += opts.gap ?? 6;
    };

    // Header
    writeBlock(`Liturgie du ${format(date, "EEEE d MMMM yyyy", { locale: fr })}`, { size: 18, bold: true, align: "center", color: [26, 26, 46], gap: 4 });
    if (data.informations?.ligne1) writeBlock(data.informations.ligne1, { size: 12, italic: true, align: "center", color: [90, 90, 110], gap: 2 });
    if (data.informations?.fete) writeBlock(data.informations.fete, { size: 11, italic: true, align: "center", color: [120, 120, 140] });
    if (data.informations?.couleur) writeBlock(`Couleur liturgique : ${data.informations.couleur}`, { size: 10, align: "center", color: [201, 168, 76], gap: 10 });

    // Separator
    ensureSpace(12);
    doc.setDrawColor(201, 168, 76);
    doc.line(margin, y, pageW - margin, y);
    y += 14;

    // Lectures
    writeBlock("Textes du jour", { size: 14, bold: true, color: [26, 26, 46], gap: 6 });
    for (const l of data.lectures) {
      writeBlock(labelFor(l.type).toUpperCase(), { size: 10, bold: true, color: [201, 168, 76], gap: 2 });
      if (l.reference) writeBlock(l.reference, { size: 10, italic: true, color: [110, 110, 130], gap: 2 });
      if (l.titre) writeBlock(`« ${l.titre} »`, { size: 11, italic: true, color: [26, 26, 46], gap: 4 });
      if (l.refrain) writeBlock(`R/ ${l.refrain}`, { size: 11, italic: true, color: [60, 60, 90], gap: 6 });
      writeBlock(l.contenu, { size: 11, color: [30, 30, 50], gap: 12 });
    }

    // Méditation
    if (data.meditation) {
      ensureSpace(24);
      doc.setDrawColor(201, 168, 76);
      doc.line(margin, y, pageW - margin, y);
      y += 14;
      writeBlock("Méditation homilétique", { size: 14, bold: true, color: [26, 26, 46], gap: 8 });
      writeBlock(data.meditation, { size: 11, color: [30, 30, 50], gap: 6 });
    }

    // Footer page numbers
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont("times", "italic");
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 160);
      doc.text(`${i} / ${pages}`, pageW / 2, pageH - 20, { align: "center" });
    }
    return doc;
  }, [data, date]);

  const handleShare = useCallback(async () => {
    if (!data) return;
    const doc = buildPdf();
    if (!doc) return;
    const fileName = `liturgie-${format(date, "yyyy-MM-dd")}.pdf`;
    const blob = doc.output("blob");
    const file = new File([blob], fileName, { type: "application/pdf" });
    const title = `Liturgie du ${format(date, "d MMMM yyyy", { locale: fr })}`;
    const text = data.informations?.ligne1 ? `${title} — ${data.informations.ligne1}` : title;
    try {
      // Prefer sharing the PDF file when supported (mobile).
      const navAny = navigator as any;
      if (navAny.canShare && navAny.canShare({ files: [file] })) {
        await navAny.share({ title, text, files: [file] });
        return;
      }
    } catch { /* fallback below */ }
    // Fallback: download the PDF.
    doc.save(fileName);
    toast.success("Homélie enregistrée en PDF.");
  }, [data, date, buildPdf]);


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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Télécharger pour hors-ligne"
                  disabled={!!downloading}
                  className="text-primary-foreground hover:bg-primary-foreground/10"
                >
                  {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => downloadRange(7, "week")}>
                  <Download className="w-4 h-4 mr-2" /> Télécharger la semaine
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadRange(31, "month")}>
                  <Download className="w-4 h-4 mr-2" /> Télécharger le mois
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  Mise à jour auto dès la connexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              aria-label="Partager en PDF"
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <FileText className="w-4 h-4" />
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

        {progress && (
          <div className="text-xs text-muted-foreground">
            <div className="flex justify-between mb-1">
              <span>Téléchargement hors-ligne…</span>
              <span>{progress.done}/{progress.total}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary transition-all"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}



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
