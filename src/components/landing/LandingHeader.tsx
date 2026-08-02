import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { Cross, Heart, Menu, BookMarked, LogIn, Sparkles } from "lucide-react";
import { DonationDialog } from "@/components/DonationDialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function LandingHeader() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full z-50 bg-background/70 backdrop-blur-xl border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 shrink-0 rounded-full bg-accent/10 flex items-center justify-center">
            <Cross className="h-4 w-4 text-accent" />
          </div>
          <span className="font-serif text-lg sm:text-xl font-bold text-foreground tracking-wide truncate">
            {t("header.title")}
          </span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2 lg:gap-3">
          <Link to="/liturgy">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1.5">
              <BookMarked className="h-4 w-4" /> Liturgie du jour
            </Button>
          </Link>
          <LanguageSelector />
          <ThemeToggle />
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              {t("landing.login")}
            </Button>
          </Link>
          <DonationDialog>
            <Button
              variant="outline"
              size="sm"
              className="border-accent/60 text-accent hover:bg-accent/10 hover:text-accent gap-1.5"
            >
              <Heart className="h-3.5 w-3.5" />
              {t("landing.donate")}
            </Button>
          </DonationDialog>
          <Link to="/auth">
            <Button size="sm" className="shadow-md hover:shadow-lg transition-shadow">
              {t("landing.start")}
            </Button>
          </Link>
        </div>

        {/* Mobile nav */}
        <div className="flex md:hidden items-center gap-1">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm bg-background border-border/60 flex flex-col">
              <SheetHeader className="text-left">
                <SheetTitle className="font-serif tracking-wide flex items-center gap-2">
                  <Cross className="h-4 w-4 text-accent" />
                  {t("header.title")}
                </SheetTitle>
              </SheetHeader>

              <nav className="mt-6 flex flex-col gap-3">
                <Link to="/liturgy" onClick={() => setOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-base">
                    <BookMarked className="h-5 w-5 text-accent" /> Liturgie du jour
                  </Button>
                </Link>
                <Link to="/auth" onClick={() => setOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-base">
                    <LogIn className="h-5 w-5 text-accent" /> {t("landing.login")}
                  </Button>
                </Link>
                <DonationDialog>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-12 text-base border-accent/60 text-accent hover:bg-accent/10 hover:text-accent"
                  >
                    <Heart className="h-5 w-5" /> {t("landing.donate")}
                  </Button>
                </DonationDialog>
                <Link to="/auth" onClick={() => setOpen(false)}>
                  <Button className="w-full justify-start gap-3 h-12 text-base shadow-md">
                    <Sparkles className="h-5 w-5" /> {t("landing.start")}
                  </Button>
                </Link>
              </nav>

              <div className="mt-auto pt-6 border-t border-border/50 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Langue</span>
                <LanguageSelector />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
