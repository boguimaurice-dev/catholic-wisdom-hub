import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Cross, Heart } from "lucide-react";

export function LandingFooter() {
  const { t } = useLanguage();

  return (
    <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border/40 bg-card/30">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <Cross className="h-4 w-4 text-accent" />
            </div>
            <span className="font-serif font-bold text-lg">{t("header.title")}</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/donation" className="hover:text-foreground transition-colors flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              {t("landing.donate") || "Faire un don"}
            </Link>
            <Link to="/auth" className="hover:text-foreground transition-colors">
              {t("landing.login")}
            </Link>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border/20 text-center">
          <p className="text-xs text-muted-foreground/70">
            © {new Date().getFullYear()} {t("landing.copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
