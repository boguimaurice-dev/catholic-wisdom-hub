import { registerSW } from "virtual:pwa-register";
import { toast } from "sonner";

export function registerAppUpdates() {
  const isPreview = window.self !== window.top || /id-preview--|preview--|lovableproject\.|localhost|beta\.lovable\.dev/.test(location.hostname);
  if (!import.meta.env.PROD || isPreview || new URLSearchParams(location.search).get("sw") === "off") return;
  if (!("serviceWorker" in navigator)) return;

  const updateSW = registerSW({
    onNeedRefresh() {
      toast("Une mise à jour est disponible", {
        id: "pwa-update", duration: Infinity,
        action: { label: "Actualiser", onClick: () => { void updateSW(true); } },
      });
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine && document.visibilityState === "visible") void registration.update().catch(() => {});
      };
      window.addEventListener("online", check);
      window.addEventListener("focus", check);
      document.addEventListener("visibilitychange", check);
      window.setInterval(check, 60 * 60 * 1000);
      check();
    },
  });
}