// Extraction et nettoyage de texte pour l'import en masse de la base de connaissances (RAG).

export interface ExtractedDoc {
  title: string;
  reference?: string;
  content: string;
  fileName: string;
}

/** Recolle les mots coupés par un tiret en fin de ligne et normalise les espaces. */
export function cleanExtractedText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/([a-zàâäéèêëîïôöùûüç])-\n([a-zàâäéèêëîïôöùûüç])/g, "$1$2")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Supprime les lignes répétées sur la majorité des pages (en-têtes / pieds de page / numéros). */
function stripRepeatedLines(pages: string[]): string {
  if (pages.length < 3) return pages.join("\n\n");
  const freq = new Map<string, number>();
  for (const page of pages) {
    const lines = new Set(
      page
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && l.length < 90),
    );
    for (const l of lines) freq.set(l, (freq.get(l) ?? 0) + 1);
  }
  const threshold = Math.max(3, Math.floor(pages.length * 0.6));
  const banned = new Set([...freq.entries()].filter(([, n]) => n >= threshold).map(([l]) => l));

  return pages
    .map((page) =>
      page
        .split("\n")
        .filter((l) => {
          const t = l.trim();
          if (!t) return true;
          if (banned.has(t)) return false;
          return !/^[-–—\s]*\d{1,4}[-–—\s]*$/.test(t); // numéros de page isolés
        })
        .join("\n"),
    )
    .join("\n\n");
}

/** Extrait le texte d'un PDF numérique (pdf.js, côté navigateur). */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let text = "";
    for (const item of content.items as { str: string; transform: number[] }[]) {
      const y = item.transform?.[5] ?? null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) text += "\n";
      text += item.str;
      lastY = y;
    }
    pages.push(text);
  }

  return cleanExtractedText(stripRepeatedLines(pages));
}

/** Aplatit un JSON arbitraire en texte lisible (bible, catéchisme, citations…). */
export function flattenJson(value: unknown, depth = 0): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map((v) => flattenJson(v, depth + 1)).filter(Boolean).join("\n");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => {
        const inner = flattenJson(v, depth + 1);
        if (!inner) return "";
        if (typeof v === "object") return `${k.replace(/_/g, " ")} :\n${inner}`;
        return `${k.replace(/_/g, " ")} : ${inner}`;
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

const titleFromName = (name: string) => name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();

/** Extrait le contenu textuel d'un fichier importé, quel que soit son format. */
export async function extractFile(file: File): Promise<ExtractedDoc> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const title = titleFromName(file.name);

  if (ext === "pdf") {
    const content = await extractPdfText(file);
    if (!content.trim()) {
      throw new Error("Aucun texte détecté (PDF probablement scanné — un OCR est nécessaire).");
    }
    return { title, content, fileName: file.name };
  }

  const raw = await file.text();

  if (ext === "json") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("JSON invalide.");
    }
    const obj = parsed as Record<string, unknown>;
    const content = cleanExtractedText(flattenJson(parsed));
    if (!content) throw new Error("JSON vide.");
    return {
      title: (typeof obj?.titre === "string" && obj.titre) || (typeof obj?.livre === "string" && obj.livre) || title,
      reference: typeof obj?.reference === "string" ? obj.reference : undefined,
      content,
      fileName: file.name,
    };
  }

  const content = cleanExtractedText(raw);
  if (!content) throw new Error("Fichier vide.");
  return { title, content, fileName: file.name };
}

/** Découpe un très gros document en tranches envoyables (limite de fragments côté serveur). */
export function splitForUpload(content: string, maxChars = 240_000): string[] {
  if (content.length <= maxChars) return [content];
  const parts: string[] = [];
  let cursor = 0;
  while (cursor < content.length) {
    let end = Math.min(cursor + maxChars, content.length);
    if (end < content.length) {
      const cut = content.lastIndexOf("\n\n", end);
      if (cut > cursor + maxChars * 0.5) end = cut;
    }
    parts.push(content.slice(cursor, end).trim());
    cursor = end;
  }
  return parts.filter(Boolean);
}
