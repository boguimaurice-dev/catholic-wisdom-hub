// ---------------------------------------------------------------------------
// Client Claude (Anthropic) — moteur principal de l'application.
// Module partagé par toutes les Edge Functions qui génèrent du texte :
//   - catholic-orchestrator
//   - chatbot
//   - liturgy-meditation
//
// L'API Anthropic est stricte : elle refuse (400) les conversations qui ne
// commencent pas par un message « user » et les rôles qui ne s'alternent pas.
// `normalizeForClaude` garantit ces invariants pour tout appel entrant.
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Modèle principal. Surchargeable par secret Supabase, sans redéploiement.
export const CLAUDE_MODEL = Deno.env.get("CLAUDE_MODEL") || "claude-sonnet-4-5-20250929";
// Modèle éventuellement plus rapide/économique pour le routage (réponse JSON courte).
export const CLAUDE_ROUTER_MODEL = Deno.env.get("CLAUDE_ROUTER_MODEL") || CLAUDE_MODEL;

const CLAUDE_MAX_TOKENS = 8192;
const CLAUDE_MAX_HISTORY = 40;

export function getAnthropicKey(): string | null {
  return Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("claude_api") || null;
}

export function hasClaude(): boolean {
  return !!getAnthropicKey();
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status === 500 || status === 502 || status === 503 || status === 529;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Met le dialogue en forme pour l'API Anthropic :
 * - un seul `system` (les consignes système sont concaténées) ;
 * - messages vides supprimés ;
 * - messages consécutifs de même rôle fusionnés (sinon 400 « roles must alternate ») ;
 * - le premier message est toujours `user` ;
 * - historique borné aux N derniers messages.
 */
export function normalizeForClaude(
  messages: ChatMessage[],
  maxHistory = CLAUDE_MAX_HISTORY,
): { system: string; messages: { role: "user" | "assistant"; content: string }[] } {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => (m.content || "").trim())
    .filter(Boolean)
    .join("\n\n");

  const merged: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const content = (m.content || "").trim();
    if (!content) continue;

    const last = merged[merged.length - 1];
    if (last && last.role === m.role) {
      last.content += `\n\n${content}`;
    } else {
      merged.push({ role: m.role, content });
    }
  }

  // Anthropic exige que la conversation commence par l'utilisateur.
  while (merged.length > 0 && merged[0].role !== "user") merged.shift();

  // La troncature peut faire réapparaître un « assistant » en tête : on nettoie à nouveau.
  const bounded = merged.slice(-maxHistory);
  while (bounded.length > 0 && bounded[0].role !== "user") bounded.shift();

  return { system, messages: bounded };
}

interface ClaudeOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

async function postClaude(
  messages: ChatMessage[],
  options: ClaudeOptions,
  label: string,
): Promise<Response | null> {
  const key = getAnthropicKey();
  if (!key) {
    console.warn(`${label} : Claude désactivé, ANTHROPIC_API_KEY (ou claude_api) n'est pas configurée.`);
    return null;
  }

  const { system, messages: dialogue } = normalizeForClaude(messages);
  if (dialogue.length === 0) {
    console.warn(`${label} : aucun message utilisateur exploitable, appel Claude ignoré.`);
    return null;
  }

  const body = JSON.stringify({
    model: options.model || CLAUDE_MODEL,
    max_tokens: options.maxTokens ?? CLAUDE_MAX_TOKENS,
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    ...(options.stream ? { stream: true } : {}),
    ...(system ? { system } : {}),
    messages: dialogue,
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body,
      });

      if (response.ok) return response;

      const detail = await response.text().catch(() => "");
      console.warn(`${label} : Claude a refusé l'appel.`, response.status, detail.slice(0, 300));

      // Une nouvelle tentative n'a de sens que sur une erreur transitoire.
      if (attempt === 0 && isRetryableStatus(response.status)) {
        await sleep(800);
        continue;
      }
      return null;
    } catch (e) {
      console.warn(`${label} : appel Claude impossible.`, e);
      if (attempt === 0) {
        await sleep(800);
        continue;
      }
      return null;
    }
  }

  return null;
}

function extractText(payload: unknown): string {
  const blocks = (payload as { content?: { type?: string; text?: string }[] })?.content || [];
  return blocks
    .map((b) => (b.type === "text" ? b.text || "" : ""))
    .join("")
    .trim();
}

/**
 * Appel Claude non-streaming. Retourne `null` si Claude est indisponible,
 * ce qui laisse l'appelant basculer sur un fournisseur de secours.
 */
export async function callClaude(
  messages: ChatMessage[],
  options: ClaudeOptions = {},
  label = "Claude",
): Promise<string | null> {
  const response = await postClaude(messages, options, label);
  if (!response) return null;

  try {
    const text = extractText(await response.json());
    if (!text) {
      console.warn(`${label} : réponse Claude vide.`);
      return null;
    }
    return text;
  } catch (e) {
    console.warn(`${label} : réponse Claude illisible.`, e);
    return null;
  }
}

/**
 * Appel Claude en streaming. Le flux retourné contient le TEXTE brut
 * (pas le format SSE d'Anthropic) : la conversion vers le format attendu
 * par le client est faite par l'appelant.
 * Retourne `null` si Claude est indisponible (avant tout envoi au client).
 */
export async function streamClaude(
  messages: ChatMessage[],
  options: ClaudeOptions = {},
  label = "Claude",
): Promise<ReadableStream<Uint8Array> | null> {
  const response = await postClaude(messages, { ...options, stream: true }, label);
  if (!response?.body) return null;

  const upstream = response.body;
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, newlineIndex).replace(/\r$/, "");
            buffer = buffer.slice(newlineIndex + 1);
            if (!line.startsWith("data:")) continue;

            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            try {
              const event = JSON.parse(payload);
              if (event.type === "content_block_delta" && event.delta?.text) {
                controller.enqueue(encoder.encode(event.delta.text));
              } else if (event.type === "error") {
                console.error(`${label} : erreur pendant le flux.`, event.error);
              }
            } catch {
              // Ligne non JSON : ignorée.
            }
          }
        }
      } catch (e) {
        console.error(`${label} : flux interrompu.`, e);
      } finally {
        try {
          controller.close();
        } catch {
          // Flux déjà fermé côté client.
        }
      }
    },
    cancel(reason) {
      upstream.cancel(reason).catch(() => {});
    },
  });
}
