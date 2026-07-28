import type { Source } from "@/types/consultation";

const SOURCES_BLOCK_RE = /```sources\s*\n([\s\S]*?)\n```/i;

export function parseSources(markdown: string): { body: string; sources: Source[] } {
  if (!markdown) return { body: "", sources: [] };
  const match = markdown.match(SOURCES_BLOCK_RE);
  if (!match) return { body: markdown, sources: [] };
  let sources: Source[] = [];
  try {
    const parsed = JSON.parse(match[1].trim());
    if (Array.isArray(parsed)) {
      sources = parsed
        .filter((s) => s && typeof s === "object" && typeof s.n === "number" && s.title)
        .map((s) => ({
          n: s.n,
          type: (s.type as Source["type"]) || "autre",
          title: String(s.title),
          reference: s.reference ? String(s.reference) : undefined,
          url: s.url || null,
        }));
    }
  } catch {
    // ignore malformed block
  }
  const body = markdown.replace(SOURCES_BLOCK_RE, "").trim();
  return { body, sources };
}

/** Rewrite [n] markers into clickable superscript anchors targeting #source-n. */
export function linkifyFootnotes(markdown: string, sources: Source[]): string {
  if (!sources.length) return markdown;
  const valid = new Set(sources.map((s) => s.n));
  return markdown.replace(/\[(\d+)\]/g, (full, num) => {
    const n = Number(num);
    if (!valid.has(n)) return full;
    return ` <sup><a href="#source-${n}" class="footnote-ref">[${n}]</a></sup>`;
  });
}
