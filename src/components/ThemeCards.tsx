import { motion } from "framer-motion";
import { BookOpen, Scale, Church, Heart, Scroll, Clock, Landmark } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";

const THEME_KEYS = [
  { icon: <BookOpen className="h-5 w-5" />, key: "theology", gradient: "from-primary/20 to-primary/5" },
  { icon: <Church className="h-5 w-5" />, key: "liturgy", gradient: "from-secondary/20 to-secondary/5" },
  { icon: <Scroll className="h-5 w-5" />, key: "scripture", gradient: "from-accent/20 to-accent/5" },
  { icon: <Heart className="h-5 w-5" />, key: "spiritual", gradient: "from-primary/15 to-secondary/10" },
  { icon: <Scale className="h-5 w-5" />, key: "moral", gradient: "from-accent/15 to-primary/10" },
  { icon: <Clock className="h-5 w-5" />, key: "historyTheme", gradient: "from-secondary/15 to-accent/10" },
];

interface ThemeCardsProps {
  onSelectSuggestion: (suggestion: string) => void;
}

export function ThemeCards({ onSelectSuggestion }: ThemeCardsProps) {
  const { t } = useLanguage();

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      aria-labelledby="theme-heading"
      className="mx-auto mt-8 w-full max-w-4xl px-0 sm:mt-10 sm:px-2"
    >
      <div className="mb-4 flex items-center justify-center gap-2 sm:mb-6">
        <Landmark className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
        <h3 id="theme-heading" className="font-serif text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-base sm:tracking-[0.2em]">
          {t("themes.exploreByTheme")}
        </h3>
        <Landmark className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
      </div>

      {/* On phones, expand one topic at a time so the questions stay easy to read. */}
      <div className="rounded-2xl border border-border/70 bg-card/70 px-4 shadow-sm md:hidden">
        <Accordion type="single" collapsible className="w-full">
          {THEME_KEYS.map((theme) => {
            const suggestions = [t(`themes.${theme.key}.s1`), t(`themes.${theme.key}.s2`)];
            return (
              <AccordionItem key={theme.key} value={theme.key} className="border-border/60 last:border-b-0">
                <AccordionTrigger className="min-h-14 py-3 text-left hover:no-underline [&>svg]:h-5 [&>svg]:w-5">
                  <span className="flex min-w-0 items-center gap-3 pr-2">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">
                      {theme.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-serif text-base font-semibold leading-snug text-foreground">
                        {t(`themes.${theme.key}.title`)}
                      </span>
                      <span className="mt-0.5 block text-sm font-normal leading-snug text-muted-foreground">
                        {t(`themes.${theme.key}.desc`)}
                      </span>
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pb-4 pl-[3.25rem]">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => onSelectSuggestion(suggestion)}
                      className="flex min-h-12 w-full items-start gap-2 rounded-xl border border-border/60 bg-background px-3 py-3 text-left text-base leading-relaxed text-foreground transition-colors hover:border-secondary/50 hover:bg-secondary/5"
                    >
                      <span aria-hidden="true" className="mt-0.5 text-lg leading-none text-secondary">›</span>
                      <span>{suggestion}</span>
                    </button>
                  ))}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      <div className="hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">
        {THEME_KEYS.map((theme, idx) => {
          const suggestions = [t(`themes.${theme.key}.s1`), t(`themes.${theme.key}.s2`)];
          return (
            <motion.article
              key={theme.key}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + idx * 0.06 }}
              className={`group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br ${theme.gradient} backdrop-blur-sm transition-shadow duration-300 hover:shadow-lg`}
            >
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2.5">
                  <div className="text-primary/70 transition-colors group-hover:text-secondary">{theme.icon}</div>
                  <h4 className="font-serif text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                    {t(`themes.${theme.key}.title`)}
                  </h4>
                </div>
                <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                  {t(`themes.${theme.key}.desc`)}
                </p>
                <div className="space-y-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => onSelectSuggestion(suggestion)}
                      className="min-h-11 w-full rounded-lg border border-transparent bg-background/70 px-3 py-2 text-left text-sm leading-relaxed text-foreground transition-colors hover:border-secondary/30 hover:bg-background"
                    >
                      <span aria-hidden="true" className="mr-1 text-secondary">›</span>
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
              <div aria-hidden="true" className="absolute right-0 top-0 h-8 w-8 overflow-hidden opacity-20 transition-opacity group-hover:opacity-40">
                <div className="absolute -right-4 -top-4 h-8 w-8 rotate-45 bg-secondary" />
              </div>
            </motion.article>
          );
        })}
      </div>
    </motion.section>
  );
}
