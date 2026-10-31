import { useCallback, useEffect, useState } from "react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function useInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(isStandaloneMode);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIsIos(/iphone|ipad|ipod/i.test(ua) || (ua.includes("Mac") && "ontouchend" in document));

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setIsStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    const media = window.matchMedia("(display-mode: standalone)");
    const onMediaChange = () => setIsStandalone(isStandaloneMode());
    media.addEventListener?.("change", onMediaChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      media.removeEventListener?.("change", onMediaChange);
    };
  }, []);

  const install = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!installEvent) return "unavailable";
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      setInstallEvent(null);
      return choice.outcome;
    } catch {
      return "unavailable";
    }
  }, [installEvent]);

  return { canInstall: Boolean(installEvent), isStandalone, isIos, install };
}
