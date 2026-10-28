import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Claude (Anthropic) : moteur principal -----------------------------------
const CLAUDE_MODEL = Deno.env.get("CLAUDE_MODEL") || "claude-sonnet-4-5-20250929";

function getAnthropicKey(): string | null {
  return Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("claude_api") || null;
}

/** 1. Priorité absolue : Claude (Anthropic). Retourne null s'il est indisponible. */
async function callClaude(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const key = getAnthropicKey();
  if (!key) {
    console.warn("Méditation : ANTHROPIC_API_KEY absente, repli sur le gateway.");
    return null;
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 8192,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        console.warn("Méditation : Claude indisponible.", response.status, detail.slice(0, 300));
        const retryable = [408, 429, 500, 502, 503, 529].includes(response.status);
        if (attempt === 0 && retryable) {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        return null;
      }

      const data = await response.json();
      const text = (data.content || [])
        .map((c: { type?: string; text?: string }) => (c.type === "text" ? c.text || "" : ""))
        .join("")
        .trim();
      return text || null;
    } catch (e) {
      console.warn("Méditation : appel Claude impossible.", e);
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      return null;
    }
  }

  return null;
}

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
    const claudeText = await callClaude(systemPrompt, userPrompt);
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
