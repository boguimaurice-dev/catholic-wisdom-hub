import { motion } from "framer-motion";
import { BookOpen, Scale, Church, Heart, Scroll, Clock, Landmark } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const THEME_KEYS = [
  { icon: <BookOpen className="w-6 h-6" />, key: "theology", gradient: "from-primary/20 to-primary/5" },
  { icon: <Church className="w-6 h-6" />, key: "liturgy", gradient: "from-secondary/20 to-secondary/5" },
  { icon: <Scroll className="w-6 h-6" />, key: "scripture", gradient: "from-accent/20 to-accent/5" },
  { icon: <Heart className="w-6 h-6" />, key: "spiritual", gradient: "from-primary/15 to-secondary/10" },
  { icon: <Scale className="w-6 h-6" />, key: "moral", gradient: "from-accent/15 to-primary/10" },
  { icon: <Clock className="w-6 h-6" />, key: "historyTheme", gradient: "from-secondary/15 to-accent/10" },
];

interface ThemeCardsProps {
  onSelectSuggestion: (suggestion: string) => void;
}

export function ThemeCards({ onSelectSuggestion }: ThemeCardsProps) {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="mt-10 max-w-3xl mx-auto px-4"
    >
      <div className="flex items-center justify-center gap-2 mb-6">
        <Landmark className="w-4 h-4 text-secondary" />
        <h3 className="font-serif text-sm uppercase tracking-[0.2em] text-muted-foreground">
          {t("themes.exploreByTheme")}
        </h3>
        <Landmark className="w-4 h-4 text-secondary" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {THEME_KEYS.map((theme, idx) => {
          const suggestions = [t(`themes.${theme.key}.s1`), t(`themes.${theme.key}.s2`)];
          return (
            <motion.div
              key={theme.key}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.08 }}
              className={`group relative rounded-xl border border-border/60 bg-gradient-to-br ${theme.gradient} backdrop-blur-sm overflow-hidden hover:shadow-lg hover:border-secondary/40 transition-all duration-300 cursor-pointer`}
            >
              <div className="p-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="text-primary/70 group-hover:text-secondary transition-colors">
                    {theme.icon}
                  </div>
                  <h4 className="font-serif text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {t(`themes.${theme.key}.title`)}
                  </h4>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                  {t(`themes.${theme.key}.desc`)}
                </p>
                <div className="space-y-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => onSelectSuggestion(s)}
                      className="w-full text-left text-[11px] sm:text-xs px-2.5 py-1.5 rounded-lg bg-background/60 hover:bg-background border border-transparent hover:border-secondary/30 text-foreground/80 hover:text-foreground transition-all group/btn"
                    >
                      <span className="text-secondary/70 group-hover/btn:text-secondary mr-1">›</span>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="absolute top-0 right-0 w-8 h-8 overflow-hidden opacity-20 group-hover:opacity-40 transition-opacity">
                <div className="absolute -top-4 -right-4 w-8 h-8 rotate-45 bg-secondary" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
