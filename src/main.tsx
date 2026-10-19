import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerAppUpdates } from "./lib/pwaUpdates";

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);

// Service worker only on the real published site (never in preview iframes / dev)
const isPreview =
  window.self !== window.top ||
  /id-preview--|lovableproject\.com|localhost/.test(location.hostname);

if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD && !isPreview) {
    registerAppUpdates();
  } else {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => {
      const worker = r.active ?? r.waiting ?? r.installing;
      if (worker && new URL(worker.scriptURL).pathname === "/sw.js") void r.unregister();
    })).catch(() => {});
  }
}
