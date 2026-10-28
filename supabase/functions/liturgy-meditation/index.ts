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
  return Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("claude_api") || null;
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
    console.warn(`${label} : Claude désactivé, ANTHROPIC_API_KEY (ou claude_api) n'est pas configurée.`);
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { date, language = "fr" } = await req.json().catch(() => ({}));
    const today = date || new Date().toISOString().slice(0, 10);

    // Fetch AELF readings
    const aelfRes = await fetch(`https://api.aelf.org/v1/messes/${today}/france`);
    if (!aelfRes.ok) throw new Error("Impossible de récupérer les textes liturgiques");
    const aelf = await aelfRes.json();

    const info = aelf.informations || {};
    const messe = (aelf.messes && aelf.messes[0]) || {};
    const lectures = (messe.lectures || []).map((l: any) => ({
      type: l.type,
      titre: l.titre,
      reference: l.ref || l.intro_lue || "",
      contenu: stripHtml(l.contenu || ""),
      refrain: l.refrain_psalmique ? stripHtml(l.refrain_psalmique) : "",
    }));

    const lecturesText = lectures
      .map(
        (l: any) =>
          `### ${l.type.toUpperCase()} — ${l.reference}\n${l.titre ? `*${l.titre}*\n\n` : ""}${l.contenu}`
      )
      .join("\n\n---\n\n");

    const langInstruction =
      language === "en"
        ? "Respond in English."
        : language === "es"
        ? "Responde en español."
        : language === "pt"
        ? "Responda em português."
        : "Réponds en français.";

    const systemPrompt = `Tu es l'orchestreur assistant en chef, au service de la prière et de la méditation catholique. Tu rédiges une méditation homilétique profonde, fidèle à la Tradition de l'Église, à partir des lectures du jour. ${langInstruction}

Structure ta méditation ainsi :
1. Une introduction qui situe le jour liturgique
2. Une exégèse brève de chaque lecture (sens littéral et spirituel)
3. Le fil théologique qui unit les lectures
4. Une application spirituelle pour la vie quotidienne
5. Une prière finale courte

Style : pastoral, chaleureux, enraciné dans les Pères de l'Église et la Tradition. Cite les Pères ou les saints quand c'est pertinent. N'utilise PAS d'astérisques (*) ni de dièses (#) pour la mise en forme — utilise du texte fluide avec des titres en majuscules suivis de deux points.`;

    const userPrompt = `Jour liturgique : ${info.ligne1 || ""}
${info.fete ? `Fête : ${info.fete}` : ""}
Couleur liturgique : ${info.couleur || ""}

Voici les lectures du jour :

${lecturesText}

Rédige une méditation homilétique complète pour aider le fidèle à approfondir ces textes.`;

    // 1. Priorité absolue : Claude (Anthropic)
    const claudeMessages: ClaudeMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
    const claudeText = await callClaude(claudeMessages, {}, "Méditation");
    if (claudeText) {
      return new Response(
        JSON.stringify({
          success: true,
          date: today,
          informations: info,
          lectures,
          meditation: claudeText,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Secours : Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Aucun fournisseur IA disponible (ANTHROPIC_API_KEY ou LOVABLE_API_KEY requis)",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(
        JSON.stringify({
          success: false,
          error: aiRes.status === 429
            ? "Limite de requêtes atteinte. Réessayez dans quelques instants."
            : aiRes.status === 402
            ? "Crédits épuisés. Veuillez recharger votre compte."
            : `Erreur IA: ${errText.slice(0, 200)}`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiRes.json();
    const meditation = aiData.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        informations: info,
        lectures,
        meditation,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
