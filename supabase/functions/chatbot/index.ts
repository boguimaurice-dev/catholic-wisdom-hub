import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { streamClaude, type ChatMessage } from "../_shared/claude.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es un assistant catholique bienveillant et érudit. Tu aides les fidèles avec leurs questions sur la foi, la prière, les sacrements, la Bible, la vie chrétienne et la tradition de l'Église catholique.

Tu réponds toujours en français, avec charité et respect. Tu cites les Écritures et le Catéchisme quand c'est pertinent. Tu ne te proclames jamais avec des titres ecclésiaux (évêque, prêtre, etc.) — tu es simplement un assistant.

Sois concis mais complet. Utilise le markdown pour structurer tes réponses.`;

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
    const claudeStream = await streamClaude(gatewayMessages as ChatMessage[], {}, "Chatbot");
    if (claudeStream) {
      return new Response(toOpenAISse(claudeStream), {
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
