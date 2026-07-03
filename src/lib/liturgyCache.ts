// Shared helpers to prefetch & cache liturgy data offline for a whole week.
import { addDays, format } from "date-fns";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/liturgy-meditation`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const CACHE_PREFIX = "liturgy-cache-v1:";

export function cacheKey(date: string, lang: string) {
  return `${CACHE_PREFIX}${lang}:${date}`;
}

export function readCache(date: string, lang: string): any | null {
  try {
    const raw = localStorage.getItem(cacheKey(date, lang));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function writeCache(date: string, lang: string, data: any) {
  try {
    localStorage.setItem(cacheKey(date, lang), JSON.stringify({ ...data, _cachedAt: Date.now() }));
  } catch { /* quota */ }
}

async function fetchDay(date: string, lang: string, signal?: AbortSignal) {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ date, language: lang }),
    signal,
  });
  const json = await res.json();
  if (json?.success) writeCache(date, lang, json);
  return json;
}

/**
 * Prefetch liturgy for the next `days` days (including today) if not already cached,
 * or if the cache entry is older than 24h. Runs sequentially to be gentle on the API.
 * Optional onProgress callback receives (done, total).
 */
export async function prefetchWeek(
  lang: string,
  days = 7,
  signal?: AbortSignal,
  onProgress?: (done: number, total: number) => void,
) {
  if (!navigator.onLine) return;
  const now = Date.now();
  let done = 0;
  for (let i = 0; i < days; i++) {
    if (signal?.aborted) return;
    const day = format(addDays(new Date(), i), "yyyy-MM-dd");
    const cached = readCache(day, lang);
    const fresh = cached?._cachedAt && now - cached._cachedAt < 24 * 60 * 60 * 1000;
    if (!fresh) {
      try { await fetchDay(day, lang, signal); } catch { /* ignore */ }
    }
    done++;
    onProgress?.(done, days);
  }
}

/**
 * Force refresh of all cached days for a language (background auto-update).
 * Only refreshes entries older than `maxAgeMs`.
 */
export async function refreshStaleCache(lang: string, maxAgeMs = 6 * 60 * 60 * 1000, signal?: AbortSignal) {
  if (!navigator.onLine) return;
  const now = Date.now();
  const prefix = `${CACHE_PREFIX}${lang}:`;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(prefix)) keys.push(k);
  }
  for (const k of keys) {
    if (signal?.aborted) return;
    const date = k.slice(prefix.length);
    try {
      const raw = JSON.parse(localStorage.getItem(k) || "{}");
      if (raw?._cachedAt && now - raw._cachedAt < maxAgeMs) continue;
      await fetchDay(date, lang, signal);
    } catch { /* ignore */ }
  }
}

