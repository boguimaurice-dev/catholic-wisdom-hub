import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/* Service worker : application installable et fonctionnement hors ligne. */
if ("serviceWorker" in navigator) {
  const register = () =>
    registerSW({
      immediate: true,
      onRegisterError: (error) => {
        console.warn("Service worker indisponible", error);
      },
    });

  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
