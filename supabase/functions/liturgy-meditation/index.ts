import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

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

    const systemPrompt = `Tu es l'orchestrateur assistant en chef, au service de la prière et de la méditation catholique. Tu rédiges une méditation homilétique profonde, fidèle à la Tradition de l'Église, à partir des lectures du jour. ${langInstruction}

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

    const callClaude = async (model: string) => {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Erreur IA: ${response.status} ${text.slice(0, 200)}`);
      }

      const data = await response.json();
      return data.content?.[0]?.text || "";
    };

    let meditation = "";
    try {
      meditation = await callClaude("claude-sonnet-4-20250514");
    } catch (e) {
      console.warn("Claude Sonnet 4 not available, falling back to Claude 3.7 Sonnet:", e);
      meditation = await callClaude("claude-3-7-sonnet-20250219");
    }

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
