import { type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GLOSSARY_REGEX, lookupGlossary, type GlossaryEntry } from "@/lib/glossary";
import { BookOpen } from "lucide-react";

export function GlossaryTerm({ label, entry }: { label: string; entry: GlossaryEntry }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline cursor-help border-b border-dotted border-primary/60 text-inherit decoration-primary/60 underline-offset-2 hover:border-primary hover:text-primary transition-colors"
          aria-label={`Définition : ${entry.term}`}
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 sm:w-80 text-sm leading-relaxed">
        <div className="flex items-start gap-2">
          <BookOpen className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
          <div>
            <div className="font-serif font-bold text-primary">{entry.term}</div>
            {entry.category && (
              <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1">{entry.category}</div>
            )}
            <p className="text-foreground/90">{entry.definition}</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Découpe une chaîne en injectant les appels de note [n] et les termes du glossaire. */
export function renderRichText(
  children: ReactNode,
  validFootnotes: Set<number>,
  seen: Set<string> = new Set(),
): ReactNode {
  if (children == null || typeof children === "boolean" || typeof children === "number") return children;

  if (typeof children === "string") return renderString(children, validFootnotes, seen);

  if (Array.isArray(children))
    return children.map((c, i) => <span key={i}>{renderRichText(c, validFootnotes, seen)}</span>);

  return children;
}

function renderString(text: string, validFootnotes: Set<number>, seen: Set<string>): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;

  // Fusionne les positions des notes [n] et des termes du glossaire
  type Hit = { start: number; end: number; node: ReactNode };
  const hits: Hit[] = [];

  const footRe = /\[(\d+)\]/g;
  let fm: RegExpExecArray | null;
  while ((fm = footRe.exec(text)) !== null) {
    const n = Number(fm[1]);
    if (!validFootnotes.has(n)) continue;
    hits.push({
      start: fm.index,
      end: fm.index + fm[0].length,
      node: (
        <sup key={`f${fm.index}`} className="mx-0.5">
          <a
            href={`#source-${n}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(`source-${n}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            className="text-primary font-semibold no-underline hover:underline"
          >
            [{n}]
          </a>
        </sup>
      ),
    });
  }

  const gRe = new RegExp(GLOSSARY_REGEX.source, GLOSSARY_REGEX.flags);
  let gm: RegExpExecArray | null;
  while ((gm = gRe.exec(text)) !== null) {
    const matched = gm[1];
    const entry = lookupGlossary(matched);
    if (!entry) continue;
    // Les sigles (majuscules) exigent une correspondance de casse exacte
    if (entry.term === entry.term.toUpperCase() && entry.term.length <= 5 && matched !== entry.term) continue;
    const id = entry.term.toLowerCase();
    if (seen.has(id)) continue; // une seule mise en évidence par terme
    if (hits.some((h) => gm!.index < h.end && gm!.index + matched.length > h.start)) continue;
    seen.add(id);
    hits.push({
      start: gm.index,
      end: gm.index + matched.length,
      node: <GlossaryTerm key={`g${gm.index}`} label={matched} entry={entry} />,
    });
  }

  if (!hits.length) return text;
  hits.sort((a, b) => a.start - b.start);

  for (const hit of hits) {
    if (hit.start < last) continue;
    if (hit.start > last) parts.push(text.slice(last, hit.start));
    parts.push(<span key={`h${key++}`}>{hit.node}</span>);
    last = hit.end;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** Renderers react-markdown enrichis (notes de bas de page + glossaire). */
export function makeRichRenderers(validFootnotes: Set<number>) {
  const seen = new Set<string>();
  const wrap = (Tag: keyof JSX.IntrinsicElements) =>
    ({ children, node, ...props }: { children?: ReactNode; node?: unknown }) => {
      void node;
      return <Tag {...props}>{renderRichText(children, validFootnotes, seen)}</Tag>;
    };
  return {
    p: wrap("p"), li: wrap("li"),
    strong: wrap("strong"), em: wrap("em"),
    h1: wrap("h1"), h2: wrap("h2"), h3: wrap("h3"), h4: wrap("h4"),
    td: wrap("td"), blockquote: wrap("blockquote"),
  };
}
