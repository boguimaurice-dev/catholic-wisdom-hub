import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Service worker only on the real published site (never in preview iframes / dev)
const isPreview =
  window.self !== window.top ||
  /id-preview--|lovableproject\.com|localhost/.test(location.hostname);

if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD && !isPreview) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
  }
}
