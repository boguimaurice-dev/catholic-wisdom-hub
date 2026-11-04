import "@testing-library/jest-dom/vitest";
import { webcrypto } from "node:crypto";

/* jsdom n'expose pas WebCrypto : on utilise l'implémentation de Node. */
if (!globalThis.crypto || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}
if (typeof window !== "undefined" && (!window.crypto || !window.crypto.subtle)) {
  Object.defineProperty(window, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}

/* jsdom n'implémente pas matchMedia. */
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

/* Pas de presse-papiers en environnement de test. */
if (typeof navigator !== "undefined" && !navigator.clipboard) {
  Object.defineProperty(navigator, "clipboard", {
    value: {
      writeText: async () => {},
      readText: async () => "",
    },
    configurable: true,
  });
}
