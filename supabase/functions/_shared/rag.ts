// Utilitaires RAG partagés : embeddings via Lovable AI Gateway + recherche sémantique.

export const EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const EMBEDDING_DIMS = 1536;

export const CORPORA = [
  "ecriture",
  "catechisme",
  "magistere",
  "peres_docteurs",
  "liturgie",
  "droit_canon",
  "lexiques",
  "histoire",
] as const;

export type Corpus = (typeof CORPORA)[number];

export interface RagMatch {
  id: string;
  corpus: string;
  title: string;
  reference: string | null;
  content: string;
  source_url: string | null;
  similarity: number;
}

/** Découpe un texte long en fragments d'environ `size` caractères, avec recouvrement. */
export function chunkText(text: string, size = 1200, overlap = 150): string[] {
  const clean = (text || "").replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const paragraphs = clean.split(/\n{2,}/);
  const chunks: string[] = [];
  let buffer = "";

  const push = () => {
    const t = buffer.trim();
    if (t) chunks.push(t);
    buffer = "";
  };

  for (const p of paragraphs) {
    if (p.length > size) {
      push();
      for (let i = 0; i < p.length; i += size - overlap) {
        chunks.push(p.slice(i, i + size).trim());
      }
      continue;
    }
    if ((buffer + "\n\n" + p).length > size) push();
    buffer = buffer ? `${buffer}\n\n${p}` : p;
  }
  push();
  return chunks.filter(Boolean);
}

/** Calcule les vecteurs pour un lot de textes (max ~100 par appel). */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY not configured");

  const vectors: number[][] = [];
  const batchSize = 64;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: batch }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Embeddings ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    const sorted = (data.data || []).sort((a: any, b: any) => a.index - b.index);
    for (const item of sorted) vectors.push(item.embedding as number[]);
  }

  return vectors;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [v] = await embedTexts([text.slice(0, 6000)]);
  return v;
}

/**
 * Recherche les passages les plus proches de la question.
 * `admin` doit être un client Supabase service_role.
 */
export async function searchKnowledge(
  admin: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> },
  question: string,
  matchCount = 8,
  corpusFilter: string[] | null = null,
): Promise<RagMatch[]> {
  try {
    const embedding = await embedQuery(question);
    const { data, error } = await admin.rpc("match_rag_documents", {
      query_embedding: embedding,
      match_count: matchCount,
      corpus_filter: corpusFilter,
    });
    if (error) {
      console.error("match_rag_documents error:", error);
      return [];
    }
    return ((data as RagMatch[]) || []).filter((m) => m.similarity > 0.25);
  } catch (e) {
    console.error("searchKnowledge failed:", e);
    return [];
  }
}

const CORPUS_LABELS: Record<string, string> = {
  ecriture: "Écriture Sainte",
  catechisme: "Catéchisme de l'Église catholique",
  magistere: "Magistère",
  peres_docteurs: "Pères et Docteurs de l'Église",
  liturgie: "Liturgie",
  droit_canon: "Droit canonique",
  lexiques: "Lexiques bibliques",
  histoire: "Histoire de l'Église",
};

/** Formate les passages retrouvés pour injection dans un prompt système. */
export function formatContext(matches: RagMatch[]): string {
  if (!matches.length) return "";
  const blocks = matches.map((m, i) => {
    const label = CORPUS_LABELS[m.corpus] ?? m.corpus;
    const ref = m.reference ? ` — ${m.reference}` : "";
    return `[S${i + 1}] (${label}) ${m.title}${ref}\n${m.content}`;
  });

  return `SOURCES DOCUMENTAIRES VÉRIFIÉES (base de connaissances Scriptorium).
Appuie-toi EN PRIORITÉ sur ces extraits authentiques. Cite-les explicitement sous la forme [S1], [S2]… et ne leur fais jamais dire autre chose que ce qu'ils disent. Si un extrait ne concerne pas la question, ignore-le. Si les extraits ne suffisent pas, complète avec ta science propre en le signalant.

${blocks.join("\n\n")}`;
}
