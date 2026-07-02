import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { Cross } from "lucide-react";

export function LandingHeader() {
  const { t } = useLanguage();

  return (
    <header className="fixed top-0 w-full z-50 bg-background/70 backdrop-blur-xl border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
            <Cross className="h-4 w-4 text-accent" />
          </div>
          <span className="font-serif text-xl font-bold text-foreground tracking-wide">
            {t("header.title")}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/liturgy" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5">
              📖 Liturgie du jour
            </Button>
          </Link>
          <LanguageSelector />
          <ThemeToggle />
          <Link to="/auth" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              {t("landing.login")}
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="sm" className="shadow-md hover:shadow-lg transition-shadow">
              {t("landing.start")}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
