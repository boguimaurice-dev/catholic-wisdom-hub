import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es un assistant catholique bienveillant et érudit. Tu aides les fidèles avec leurs questions sur la foi, la prière, les sacrements, la Bible, la vie chrétienne et la tradition de l'Église catholique.

Tu réponds toujours en français, avec charité et respect. Tu cites les Écritures et le Catéchisme quand c'est pertinent. Tu ne te proclames jamais avec des titres ecclésiaux (évêque, prêtre, etc.) — tu es simplement un assistant.

Sois concis mais complet. Utilise le markdown pour structurer tes réponses.`;

// --- Claude (Anthropic) : moteur principal -----------------------------------
const CLAUDE_MODEL = Deno.env.get("CLAUDE_MODEL") || "claude-sonnet-4-5-20250929";
const CLAUDE_MAX_TOKENS = 4096;

function getAnthropicKey(): string | null {
  return Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("claude_api") || null;
}

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

/** Formate un morceau de texte au format SSE attendu par le front (style OpenAI). */
function sseEvent(text: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
}

/**
 * Diffusion Claude en streaming, traduite au format SSE OpenAI
 * pour rester compatible avec le composant Chatbot.
 * Retourne null si Claude est indisponible (le gateway Lovable prend alors le relais).
 */
async function streamClaude(messages: ChatMessage[]): Promise<ReadableStream<Uint8Array> | null> {
  const key = getAnthropicKey();
  if (!key) {
    console.warn("Chatbot : ANTHROPIC_API_KEY absente, repli sur le gateway.");
    return null;
  }

  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const rest = messages.filter((m) => m.role !== "system");

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: CLAUDE_MAX_TOKENS,
        stream: true,
        ...(system ? { system } : {}),
        messages: rest.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
  } catch (e) {
    console.warn("Chatbot : appel Claude impossible, repli sur le gateway.", e);
    return null;
  }

  if (!response.ok || !response.body) {
    console.warn("Chatbot : Claude indisponible, repli sur le gateway.", response.status, (await response.text().catch(() => "")).slice(0, 300));
    return null;
  }

  const upstream = response.body;
  const encoder = new TextEncoder();
  let readerRef: ReadableStreamDefaultReader<Uint8Array> | null = null;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      readerRef = reader;
      const decoder = new TextDecoder();
      let buffer = "";
      let emitted = false;

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
                emitted = true;
                controller.enqueue(encoder.encode(sseEvent(event.delta.text)));
              }
            } catch {
              // Événement non JSON : on l'ignore.
            }
          }
        }
        if (!emitted) {
          controller.enqueue(encoder.encode(sseEvent("⚠️ Réponse vide reçue du service IA. Veuillez réessayer.")));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (e) {
        console.warn("Chatbot : flux Claude interrompu.", e);
        controller.enqueue(encoder.encode(sseEvent("\n\n⚠️ La connexion a été interrompue.")));
      } finally {
        controller.close();
      }
    },
    cancel(reason) {
      readerRef?.cancel(reason).catch(() => {});
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

    // 1. Priorité absolue : Claude (Anthropic)
    const claudeStream = await streamClaude(gatewayMessages);
    if (claudeStream) {
      return new Response(claudeStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // 2. Secours : Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Aucun fournisseur IA disponible (ANTHROPIC_API_KEY ou LOVABLE_API_KEY requis)");

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
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chatbot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
