import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

// Experts accessibles au plan gratuit (basique)
const BASE_EXPERTS = ["theologien", "bibliste", "liturgiste"];

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

async function callDeepSeek(messages: Message[]): Promise<string | null> {
  const key = Deno.env.get("deeseek_api_key") || Deno.env.get("DEEPSEEK_API_KEY");
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
      console.warn("DeepSeek unavailable:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.warn("DeepSeek call failed:", e);
    return null;
  }
}

async function callClaude(messages: Message[]): Promise<string | null> {
  const key = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("claude_api");
  if (!key) return null;

  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const rest = messages.filter((m) => m.role !== "system");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: system || undefined,
        messages: rest.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      console.warn("Claude unavailable:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const text = (data.content || []).map((c: { text?: string }) => c.text || "").join("");
    return text || null;
  } catch (e) {
    console.warn("Claude call failed:", e);
    return null;
  }
}

async function callLovableAI(messages: Message[], model = "google/gemini-2.5-pro"): Promise<string> {
  // Priorité : DeepSeek -> Claude -> Lovable AI Gateway
  const deepseek = await callDeepSeek(messages);
  if (deepseek) return deepseek;

  const claude = await callClaude(messages);
  if (claude) return claude;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new HttpError(500, "Aucun fournisseur IA disponible");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 429) {
      console.warn("Lovable AI rate limit:", error);
      throw new HttpError(429, "Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.");
    }
    if (response.status === 402) {
      console.warn("Lovable AI payment error:", error);
      throw new HttpError(402, "Crédits épuisés. Veuillez recharger votre compte.");
    }
    console.error("Lovable AI error:", response.status, error);
    throw new HttpError(response.status, `Erreur IA: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
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

    // ---- Authentification + quota côté serveur ----
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData } = await admin.auth.getUser(jwt);
    const user = userData?.user;

    if (!user) {
      return jsonResponse({ error: "Authentification requise", errorType: "unauthenticated", success: false }, 401);
    }

    const { data: adminRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!adminRole;

    let maxPerDay = 3;
    let planSlug = "basique";

    if (!isAdmin) {
      const { data: sub } = await admin
        .from("user_subscriptions")
        .select("plan_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let plan = null;
      if (sub?.plan_id) {
        const { data } = await admin.from("plans").select("slug, max_consultations_per_day").eq("id", sub.plan_id).maybeSingle();
        plan = data;
      }
      if (!plan) {
        const { data } = await admin.from("plans").select("slug, max_consultations_per_day").eq("slug", "basique").maybeSingle();
        plan = data;
      }
      if (plan) {
        planSlug = plan.slug;
        maxPerDay = plan.max_consultations_per_day;
      }

      const today = new Date().toISOString().split("T")[0];
      const { data: usage } = await admin
        .from("daily_usage")
        .select("id, consultation_count")
        .eq("user_id", user.id)
        .eq("usage_date", today)
        .maybeSingle();

      const used = usage?.consultation_count ?? 0;
      if (used >= maxPerDay) {
        return jsonResponse({
          error: `Limite quotidienne atteinte (${maxPerDay} consultations par jour). Passez à un plan supérieur pour continuer.`,
          errorType: "quota_exceeded",
          success: false,
        }, 403);
      }
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

    const analyseResponse = await callLovableAI([
      { role: "system", content: analysePrompt },
      { role: "user", content: question }
    ], "google/gemini-3-flash-preview");

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

    // Restriction des experts avancés pour le plan gratuit
    if (!isAdmin && planSlug === "basique") {
      const filtered = selectedExperts.filter((k) => BASE_EXPERTS.includes(k));
      selectedExperts = filtered.length ? filtered : ["theologien"];
    }

    // Phase 2: Consultation des experts (parallèle)
    const contextMessages: Message[] = conversationHistory.map((msg: { role: string; content: string }) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content
    }));

    const expertPromises = selectedExperts.map(async (expertKey) => {
      const expert = EXPERTS[expertKey as keyof typeof EXPERTS];
      if (!expert) return null;

      const expertResponse = await callLovableAI([
        { role: "system", content: expert.systemPrompt },
        ...contextMessages,
        { role: "user", content: question }
      ], "google/gemini-3-flash-preview");

      return {
        expert: expertKey,
        name: expert.name,
        title: expert.title,
        response: expertResponse
      };
    });

    const expertResponses = (await Promise.all(expertPromises)).filter(Boolean) as { expert: string; name: string; title: string; response: string }[];

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

    const syntheseResponse = await callLovableAI([
      { role: "system", content: synthesePrompt },
      { role: "user", content: "Crée la synthèse" }
    ]);

    // Comptabilisation serveur de la consultation
    if (!isAdmin) {
      const today = new Date().toISOString().split("T")[0];
      const { data: usage } = await admin
        .from("daily_usage")
        .select("id, consultation_count")
        .eq("user_id", user.id)
        .eq("usage_date", today)
        .maybeSingle();

      if (usage) {
        await admin.from("daily_usage").update({ consultation_count: usage.consultation_count + 1 }).eq("id", usage.id);
      } else {
        await admin.from("daily_usage").insert({ user_id: user.id, usage_date: today, consultation_count: 1 });
      }
    }

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
