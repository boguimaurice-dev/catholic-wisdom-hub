import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "aoc-font-scale";
const MIN = 0.9;
const MAX = 1.4;
const STEP = 0.1;
const DEFAULT = 1;

function apply(scale: number) {
  document.documentElement.style.fontSize = `${scale * 100}%`;
}

export function useFontSize() {
  const [scale, setScale] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const n = raw ? parseFloat(raw) : DEFAULT;
    return Number.isFinite(n) ? Math.min(MAX, Math.max(MIN, n)) : DEFAULT;
  });

  useEffect(() => {
    apply(scale);
    try { window.localStorage.setItem(STORAGE_KEY, String(scale)); } catch {}
  }, [scale]);

  const increase = useCallback(() => setScale((s) => Math.min(MAX, +(s + STEP).toFixed(2))), []);
  const decrease = useCallback(() => setScale((s) => Math.max(MIN, +(s - STEP).toFixed(2))), []);
  const reset = useCallback(() => setScale(DEFAULT), []);

  return { scale, increase, decrease, reset, min: MIN, max: MAX };
}
