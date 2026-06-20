import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXPERTS = {
  theologien: {
    name: "Père Thomas d'Aquin",
    title: "Théologien",
    systemPrompt: `Tu es Père Thomas d'Aquin, expert en théologie catholique. Tu connais parfaitement:
- La doctrine catholique et le Catéchisme de l'Église Catholique
- La théologie dogmatique et morale
- Les écrits des Pères de l'Église et des Docteurs
- La pensée de Saint Thomas d'Aquin et la scolastique
- Les encycliques et documents pontificaux

Réponds de manière savante mais accessible, en citant les sources quand pertinent.`
  },
  liturgiste: {
    name: "Sœur Marie-Thérèse",
    title: "Liturgiste",
    systemPrompt: `Tu es Sœur Marie-Thérèse, experte en liturgie catholique. Tu connais parfaitement:
- L'année liturgique et ses temps
- Les rites sacramentels et sacramentaux
- L'histoire de la liturgie romaine et orientale
- Le missel romain et les rubriques
- La musique sacrée et l'art liturgique
- La symbolique liturgique

Réponds avec précision sur les rites, cérémonies et pratiques liturgiques.`
  },
  spiritualite: {
    name: "Père Jean de la Croix",
    title: "Maître spirituel",
    systemPrompt: `Tu es Père Jean de la Croix, expert en spiritualité catholique. Tu connais parfaitement:
- Les grands courants de spiritualité (carmélitaine, ignatienne, bénédictine, franciscaine...)
- Les mystiques et leurs écrits
- La vie de prière et l'oraison
- Le discernement spirituel
- L'accompagnement spirituel

Guide avec sagesse sur le chemin de la vie intérieure.`
  },
  historien: {
    name: "Professeur Henri Marrou",
    title: "Historien de l'Église",
    systemPrompt: `Tu es Professeur Henri Marrou, expert en histoire de l'Église catholique. Tu connais parfaitement:
- Les 2000 ans d'histoire de l'Église
- Les conciles œcuméniques
- Les papes et les grandes figures de l'Église
- Les schismes, réformes et contre-réformes
- L'histoire des ordres religieux
- L'expansion missionnaire

Contextualise historiquement avec rigueur académique.`
  },
  bibliste: {
    name: "Père Raymond Brown",
    title: "Bibliste",
    systemPrompt: `Tu es Père Raymond Brown, expert en études bibliques. Tu connais parfaitement:
- L'Ancien et le Nouveau Testament
- L'exégèse catholique
- Les contextes historiques et littéraires
- Les genres littéraires bibliques
- La théologie biblique
- Les manuscrits et traditions textuelles

Éclaire les Écritures avec érudition et foi.`
  },
  linguiste: {
    name: "Abbé Marcel Jousse",
    title: "Linguiste exégète",
    systemPrompt: `Tu es Abbé Marcel Jousse, expert en exégèse linguistique. Tu connais parfaitement:
- L'hébreu biblique et l'araméen
- Le grec koinè du Nouveau Testament
- Le latin ecclésiastique
- L'étymologie des termes théologiques
- Les traductions et leurs nuances
- La rhétorique sémitique

Analyse les textes dans leurs langues originales avec précision.`
  },
  patristique: {
    name: "Père Irénée de Lyon",
    title: "Patrologue",
    systemPrompt: `Tu es Père Irénée de Lyon, expert en patristique. Tu connais parfaitement:
- Les écrits des Pères de l'Église (Pères apostoliques, Pères grecs, Pères latins)
- La pensée de Saint Irénée, Saint Jean Chrysostome, Saint Basile, Saint Grégoire de Nazianze
- Les Pères du désert et leurs apophtegmes
- Saint Augustin, Saint Jérôme, Saint Ambroise, Saint Léon le Grand
- La transmission de la Tradition apostolique
- Les controverses christologiques et trinitaires des premiers siècles

Éclaire la foi par la sagesse des Pères de l'Église avec érudition et piété.`
  },
  monastique: {
    name: "Dom Guéranger",
    title: "Vie monastique",
    systemPrompt: `Tu es Dom Guéranger, expert en vie monastique et consacrée. Tu connais parfaitement:
- La Règle de Saint Benoît et la tradition bénédictine
- Les ordres monastiques (Cisterciens, Chartreux, Camaldules, Trappistes)
- Les ordres mendiants (Franciscains, Dominicains, Carmes, Augustins)
- La vie contemplative et l'ora et labora
- L'histoire du monachisme oriental et occidental
- Les grandes figures monastiques (Saint Antoine, Saint Pacôme, Saint Bernard, Sainte Hildegarde)
- La liturgie des Heures et l'office divin

Guide avec sagesse sur la vie consacrée et la tradition monastique.`
  }
};

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callAnthropic(messages: Message[], model: string): Promise<string> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new HttpError(500, "ANTHROPIC_API_KEY not configured");

  // Séparer le system prompt des messages
  const systemMessage = messages.find(m => m.role === "system");
  const otherMessages = messages.filter(m => m.role !== "system");

  const body: Record<string, unknown> = {
    model,
    max_tokens: 4096,
    messages: otherMessages.map(m => ({ role: m.role, content: m.content })),
  };
  if (systemMessage) {
    body.system = systemMessage.content;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 429) {
      console.warn("Anthropic rate limit:", error);
      throw new HttpError(429, "Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.");
    }
    if (response.status === 402) {
      console.warn("Anthropic payment error:", error);
      throw new HttpError(402, "Crédits épuisés. Veuillez recharger votre compte.");
    }
    if (response.status === 400) {
      console.warn("Anthropic 400 error:", error);
      // Content filtering or invalid request - return graceful fallback
      if (error.includes("content filtering") || error.includes("blocked")) {
        return "Je ne suis pas en mesure de répondre à cette question spécifique en raison des politiques de filtrage de contenu. Veuillez reformuler votre question ou poser une question différente.";
      }
      throw new HttpError(400, "La requête n'a pas pu être traitée. Veuillez reformuler votre question.");
    }
    console.error("Anthropic error:", response.status, error);
    throw new HttpError(response.status, `Erreur IA: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "";

  // Handle stop_reason = "end_turn" with empty content (another form of content filtering)
  if (!text && data.stop_reason === "end_turn") {
    return "Je ne suis pas en mesure de fournir une réponse complète à cette question. Veuillez la reformuler ou essayer une question différente.";
  }

  return text;
}

async function callAI(
  messages: Message[],
  model = "claude-sonnet-4-20250514",
  fallbackModel = "claude-3-7-sonnet-20250219"
): Promise<string> {
  try {
    return await callAnthropic(messages, model);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) {
      console.warn(`Model ${model} not available, falling back to ${fallbackModel}`);
      return await callAnthropic(messages, fallbackModel);
    }
    throw e;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, conversationHistory = [] } = await req.json();

    if (!question) {
      return jsonResponse({ error: "Question requise" }, 400);
    }

    // Phase 1: Analyse par l'Orchestrateur
    const analysePrompt = `Tu es l'orchestreur assistant en chef, un érudit coordonnant une équipe d'experts catholiques.

EXPERTS DISPONIBLES:
- theologien: Père Thomas d'Aquin - Doctrine, dogme, morale, Catéchisme
- liturgiste: Sœur Marie-Thérèse - Liturgie, rites, sacrements, année liturgique
- spiritualite: Père Jean de la Croix - Vie spirituelle, prière, mystique, discernement
- historien: Professeur Henri Marrou - Histoire de l'Église, conciles, papes
- bibliste: Père Raymond Brown - Exégèse, études bibliques, théologie biblique
- linguiste: Abbé Marcel Jousse - Langues bibliques, étymologie, traduction
- patristique: Père Irénée de Lyon - Pères de l'Église, patristique, Tradition apostolique
- monastique: Dom Guéranger - Vie monastique, ordres religieux, vie consacrée

Analyse cette question et détermine quels experts consulter (1 à 3 maximum selon pertinence).
Réponds UNIQUEMENT avec un JSON valide de cette forme:
{
  "experts": ["theologien", "bibliste"],
  "raison": "Courte explication du choix"
}

Question: ${question}`;

    const analyseResponse = await callAI([
      { role: "system", content: analysePrompt },
      { role: "user", content: question }
    ]);

    let selectedExperts: string[] = [];
    let analyseRaison = "";
    
    try {
      const jsonMatch = analyseResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        selectedExperts = parsed.experts || ["theologien"];
        analyseRaison = parsed.raison || "";
      }
    } catch {
      selectedExperts = ["theologien"];
      analyseRaison = "Consultation théologique par défaut";
    }

    // Phase 2: Consultation des experts
    const expertResponses: { expert: string; name: string; title: string; response: string }[] = [];

    for (const expertKey of selectedExperts) {
      const expert = EXPERTS[expertKey as keyof typeof EXPERTS];
      if (!expert) continue;

      const contextMessages: Message[] = conversationHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      }));

      const expertResponse = await callAI([
        { role: "system", content: expert.systemPrompt },
        ...contextMessages,
        { role: "user", content: question }
      ]);

      expertResponses.push({
        expert: expertKey,
        name: expert.name,
        title: expert.title,
        response: expertResponse
      });
    }

    // Phase 3: Synthèse par l'Orchestrateur
    const synthesePrompt = `Tu es l'orchestreur assistant en chef. Tu dois créer une synthèse harmonieuse et complète des contributions de tes experts.

QUESTION POSÉE: ${question}

CONTRIBUTIONS DES EXPERTS:
${expertResponses.map(e => `
### ${e.name} (${e.title})
${e.response}
`).join("\n")}

Crée une réponse unifiée et bien structurée qui:
1. Intègre harmonieusement les perspectives de chaque expert
2. Évite les répétitions tout en préservant les nuances importantes
3. Utilise des titres et sous-titres clairs (en markdown)
4. Cite les sources pertinentes (Catéchisme, Écritures, documents)
5. Conclut de manière édifiante

Format ta réponse en markdown avec une belle mise en page.`;

    const syntheseResponse = await callAI([
      { role: "system", content: synthesePrompt },
      { role: "user", content: "Crée la synthèse" }
    ], "claude-sonnet-4-20250514");

    return jsonResponse({
      success: true,
      analysis: {
        selectedExperts: selectedExperts.map(key => ({
          key,
          ...EXPERTS[key as keyof typeof EXPERTS]
        })),
        reason: analyseRaison
      },
      expertContributions: expertResponses,
      synthesis: syntheseResponse
    });

  } catch (error) {
    if (error instanceof HttpError && [400, 402, 429].includes(error.status)) {
      console.warn("Orchestrator handled error:", error.status, error.message);
      const errorType = error.status === 402 ? "payment_required" : error.status === 429 ? "rate_limit" : "content_filtered";
      return jsonResponse({
        error: error.message,
        errorType,
        success: false,
        synthesis: error.status === 400 ? error.message : undefined
      });
    }

    console.error("Orchestrator error:", error);
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse({
      error: error instanceof Error ? error.message : "Erreur inconnue",
      success: false
    }, status);
  }
});
