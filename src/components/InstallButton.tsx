import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: BIPEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as BIPEvent; });
}

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;

export function InstallButton({ compact = false }: { compact?: boolean }) {
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const done = () => { deferred = null; setInstalled(true); };
    window.addEventListener("appinstalled", done);
    return () => window.removeEventListener("appinstalled", done);
  }, []);

  if (installed) return null;

  const onClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setInstalled(true);
      deferred = null;
      return;
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    toast(ios
      ? "Sur iPhone/iPad : touchez Partager, puis « Sur l'écran d'accueil »."
      : "Ouvrez le menu ⋮ de Chrome, puis « Installer l'application » ou « Ajouter à l'écran d'accueil ».",
      { duration: 8000 });
  };

  return (
    <Button variant="outline" size="sm" onClick={onClick} aria-label="Installer l'application"
      className="gap-1.5 border-primary/40 text-primary">
      <Download className="h-4 w-4" />
      {!compact && <span className="hidden sm:inline">Installer</span>}
    </Button>
  );
}
