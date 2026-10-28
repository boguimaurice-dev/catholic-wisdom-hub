import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// ===========================================================================
// Claude (Anthropic) — moteur IA principal
// ---------------------------------------------------------------------------
// Ce bloc est volontairement intégré au fichier, sans import local : l'éditeur
// web de Supabase ne gère qu'un seul fichier par fonction, ce qui rend tout
// import du type "../_shared/..." impossible à déployer depuis le tableau de bord.
// Il est identique dans catholic-orchestrator, chatbot et liturgy-meditation :
// toute correction doit être reportée dans les trois fichiers.
// ===========================================================================
type ClaudeMessage = { role: "user" | "assistant" | "system"; content: string };

type ClaudeOptions = {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
};

const CLAUDE_MODEL = Deno.env.get("CLAUDE_MODEL") || "claude-sonnet-4-5-20250929";
const CLAUDE_ROUTER_MODEL = Deno.env.get("CLAUDE_ROUTER_MODEL") || CLAUDE_MODEL;
const CLAUDE_MAX_TOKENS = 8192;
const CLAUDE_MAX_HISTORY = 40;

function claudeApiKey(): string | null {
  return Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY") || Deno.env.get("claude_api") || null;
}

function deepseekApiKey(): string | null {
  return Deno.env.get("DEEPSEEK_API_KEY") || Deno.env.get("deepseek_api_key") || Deno.env.get("DEESEEK_API_KEY") || Deno.env.get("deeseek_api_key") || null;
}

/**
 * Met le dialogue en forme pour l'API Anthropic, qui rejette (400) :
 * - une conversation dont le premier message n'est pas "user" ;
 * - des messages consécutifs de même rôle ;
 * - un contenu vide.
 */
function normalizeClaudeMessages(
  messages: ClaudeMessage[],
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

  while (merged.length > 0 && merged[0].role !== "user") merged.shift();

  // La troncature peut faire réapparaître un "assistant" en tête : on re-nettoie.
  const bounded = merged.slice(-maxHistory);
  while (bounded.length > 0 && bounded[0].role !== "user") bounded.shift();

  return { system, messages: bounded };
}

function claudeRetryable(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status === 500 ||
    status === 502 || status === 503 || status === 529;
}

/** Envoie la requête à Anthropic. Une seule nouvelle tentative, sur erreur transitoire. */
async function claudeRequest(
  messages: ClaudeMessage[],
  options: ClaudeOptions,
  label: string,
): Promise<Response | null> {
  const key = claudeApiKey();
  if (!key) {
    console.warn(`${label} : Claude désactivé, ANTHROPIC_API_KEY (ou CLAUDE_API_KEY / claude_api) n'est pas configurée.`);
    return null;
  }

  const { system, messages: dialogue } = normalizeClaudeMessages(messages);
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

      if (attempt === 0 && claudeRetryable(response.status)) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      return null;
    } catch (e) {
      console.warn(`${label} : appel Claude impossible.`, e);
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      return null;
    }
  }

  return null;
}

/**
 * Appel Claude classique. Retourne null si Claude est indisponible, ce qui
 * laisse l'appelant basculer sur un fournisseur de secours.
 */
async function callClaude(
  messages: ClaudeMessage[],
  options: ClaudeOptions = {},
  label = "Claude",
): Promise<string | null> {
  const response = await claudeRequest(messages, options, label);
  if (!response) return null;

  try {
    const data = await response.json();
    const text = (data.content || [])
      .map((c: { type?: string; text?: string }) => (c.type === "text" ? c.text || "" : ""))
      .join("")
      .trim();
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
 * Appel Claude en streaming : le flux produit contient le TEXTE brut, que
 * l'appelant convertit dans le format attendu par le client.
 * Retourne null si Claude est indisponible (avant tout envoi au client).
 */
async function streamClaude(
  messages: ClaudeMessage[],
  options: ClaudeOptions = {},
  label = "Claude",
): Promise<ReadableStream<Uint8Array> | null> {
  const response = await claudeRequest(messages, { ...options, stream: true }, label);
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

async function callDeepSeekText(messages: ClaudeMessage[], label: string): Promise<string | null> {
  const key = deepseekApiKey();
  if (!key) return null;

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      console.warn(`${label} : DeepSeek indisponible.`, response.status, await response.text().catch(() => ""));
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    return text.trim() || null;
  } catch (e) {
    console.warn(`${label} : DeepSeek a échoué.`, e);
    return null;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client",
};

const SYSTEM_PROMPT = `Tu es un assistant catholique bienveillant et érudit. Tu aides les fidèles avec leurs questions sur la foi, la prière, les sacrements, la Bible, la vie chrétienne et la spiritualité. Tu réponds toujours en français, avec charité et respect. Tu cites les Écritures et le Catéchisme quand c'est pertinent. Tu ne te proclames jamais avec des titres ecclésiaux (évêque, prêtre, cardinal...) et tu gardes une posture à la fois pastorale et doctrinale. Sois concis mais complet. Utilise le markdown pour structurer tes réponses.`;

/** Convertit un flux de texte brut en SSE au format attendu par le front (style OpenAI). */
function toOpenAISse(textStream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const event = (text: string) =>
    encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = textStream.getReader();
      let received = false;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          if (text) {
            received = true;
            controller.enqueue(event(text));
          }
        }
        if (!received) {
          controller.enqueue(event("⚠️ Réponse vide reçue du service IA. Veuillez réessayer."));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (e) {
        console.warn("Chatbot : flux interrompu.", e);
        try {
          controller.enqueue(event("\n\n⚠️ La connexion a été interrompue."));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch {
          // Flux déjà fermé.
        }
      }
    },
    cancel(reason) {
      textStream.cancel(reason).catch(() => {});
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();

    const gatewayMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.filter((m: { role: string; content: string }) => m.role !== "system"),
    ];

    // 1. Priorité absolue : Claude (Anthropic), en streaming
    const claudeStream = await streamClaude(gatewayMessages as ClaudeMessage[], {}, "Chatbot");
    if (claudeStream) {
      return new Response(toOpenAISse(claudeStream), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Provider-Used": "claude" },
      });
    }

    // 2. Secours : DeepSeek
    const deepseekText = await callDeepSeekText(gatewayMessages as ClaudeMessage[], "Chatbot");
    if (deepseekText) {
      return new Response(toOpenAISse(new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(deepseekText));
          controller.close();
        },
      })), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Provider-Used": "deepseek" },
      });
    }

    // 3. Dernier recours : Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Aucun fournisseur IA disponible (ANTHROPIC_API_KEY / CLAUDE_API_KEY ou LOVABLE_API_KEY requis)");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: gatewayMessages,
        stream: true,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Lovable AI error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez plus tard." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Provider-Used": "gemini" },
        });
      }
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Provider-Used": "gemini" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Provider-Used": "gemini" },
    });
  } catch (e) {
    console.error("chatbot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Provider-Used": "error" },
    });
  }
});
