import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { searchKnowledge, formatContext } from "../_shared/rag.ts";

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

async function callLovableAI(messages: Message[], model = "google/gemini-2.5-pro"): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new HttpError(500, "LOVABLE_API_KEY not configured");

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
    // --- Authentication ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !userData?.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    // --- Administrator: full access to every plan feature, no quota ---
    const { data: adminRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    const isPlatformAdmin = !!adminRole;

    // --- Server-side quota check ---
    const today = new Date().toISOString().slice(0, 10);

    // Determine plan
    const { data: subs } = await admin
      .from("user_subscriptions")
      .select("plan_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    let planSlug = "basique";
    let maxPerDay = 3;
    if (subs && subs.length > 0) {
      const { data: plan } = await admin
        .from("plans")
        .select("slug, max_consultations_per_day")
        .eq("id", subs[0].plan_id)
        .single();
      if (plan?.max_consultations_per_day) maxPerDay = plan.max_consultations_per_day;
      if (plan?.slug) planSlug = plan.slug;
    } else {
      const { data: basic } = await admin
        .from("plans")
        .select("max_consultations_per_day")
        .eq("slug", "basique")
        .single();
      if (basic?.max_consultations_per_day) maxPerDay = basic.max_consultations_per_day;
    }

    const { data: usageRow } = await admin
      .from("daily_usage")
      .select("id, consultation_count")
      .eq("user_id", userId)
      .eq("usage_date", today)
      .maybeSingle();

    const currentCount = usageRow?.consultation_count ?? 0;
    if (!isPlatformAdmin && currentCount >= maxPerDay) {
      return jsonResponse({
        error: `Limite quotidienne atteinte (${maxPerDay} consultations/jour). Passez à un plan supérieur.`,
        errorType: "quota_exceeded",
        success: false,
      }, 403);
    }

    const body = await req.json();
    const { question, conversationHistory = [], level = "grand_public", filters = { periods: [], sources: [] } } = body;
    let expertKey = body.expertKey ?? null;

    // Plan Basique: seuls les experts de base sont accessibles en consultation directe
    const BASE_EXPERTS = ["bibliste", "theologien"];
    const restrictedToBaseExperts = !isPlatformAdmin && planSlug === "basique";
    if (restrictedToBaseExperts && expertKey && !BASE_EXPERTS.includes(expertKey)) {
      return jsonResponse({
        error: "Cet expert est réservé aux plans Premium et Élite.",
        errorType: "plan_restricted",
        success: false,
      }, 403);
    }

    if (!question) {
      return jsonResponse({ error: "Question requise" }, 400);
    }

    const PERIOD_LABELS: Record<string, string> = {
      antiquite: "Antiquité chrétienne et période patristique (Ier-VIIe siècle)",
      moyen_age: "Moyen-Âge et scolastique (VIIIe-XVe siècle)",
      moderne: "Époque moderne (XVIe-XIXe siècle : Trente, Vatican I)",
      contemporain: "Période contemporaine (XXe-XXIe siècle : Vatican II, papes récents)",
    };
    const SOURCE_LABELS: Record<string, string> = {
      magistere: "le Magistère (documents pontificaux, conciles, Catéchisme, Vatican)",
      ecriture: "l'Écriture Sainte (Ancien et Nouveau Testament)",
      tradition: "la Tradition et les Pères de l'Église",
    };

    const periodList: string[] = Array.isArray(filters?.periods) ? filters.periods : [];
    const sourceList: string[] = Array.isArray(filters?.sources) ? filters.sources : [];
    const filterParts: string[] = [];
    if (periodList.length) {
      filterParts.push(`PÉRIODES HISTORIQUES À PRIVILÉGIER: ${periodList.map((p) => PERIOD_LABELS[p] || p).join(" ; ")}. Ancre l'argumentation dans ces périodes.`);
    }
    if (sourceList.length) {
      filterParts.push(`TYPES DE SOURCES À PRIVILÉGIER: ${sourceList.map((s) => SOURCE_LABELS[s] || s).join(" ; ")}. Appuie prioritairement tes citations sur ces sources.`);
    }
    const filterInstruction = filterParts.length
      ? `\n\nFILTRES DE RECHERCHE DEMANDÉS PAR L'UTILISATEUR:\n${filterParts.join("\n")}\nRespecte ces filtres sans jamais trahir la doctrine catholique.`
      : "";

    const LEVEL_INSTRUCTIONS: Record<string, string> = {
      grand_public: `NIVEAU: GRAND PUBLIC. Adapte ta réponse à un fidèle sans formation théologique. Utilise un vocabulaire simple et accessible, explique les termes techniques, privilégie des exemples concrets et pastoraux. Reste court et édifiant.`,
      catechiste: `NIVEAU: CATÉCHISTE / FORMATION. Adapte ta réponse à un catéchiste ou animateur en formation. Structure pédagogiquement, cite le Catéchisme (numéros CEC), donne des références bibliques précises, propose des clefs pour transmettre.`,
      universitaire: `NIVEAU: UNIVERSITAIRE / THÉOLOGIEN. Adapte ta réponse à un lecteur formé en théologie. Utilise le vocabulaire technique précis, cite les sources primaires (Pères, Docteurs, conciles, encycliques, langues originales grec/hébreu/latin), développe l'argumentation avec rigueur académique et nuances doctrinales.`,
    };
    const levelInstruction = (LEVEL_INSTRUCTIONS[level] || LEVEL_INSTRUCTIONS.grand_public) + filterInstruction;


    // Mode Consultation Directe: un seul expert imposé par l'utilisateur
    const directExpertKey = typeof expertKey === "string" && expertKey in EXPERTS ? expertKey : null;

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

    let analyseResponse = "";
    if (!directExpertKey) analyseResponse = await callLovableAI([
      { role: "system", content: analysePrompt },
      { role: "user", content: question }
    ], "google/gemini-3-flash-preview");

    let selectedExperts: string[] = [];
    let analyseRaison = "";

    if (directExpertKey) {
      selectedExperts = [directExpertKey];
      analyseRaison = `Consultation directe demandée auprès de ${EXPERTS[directExpertKey as keyof typeof EXPERTS].name} (${EXPERTS[directExpertKey as keyof typeof EXPERTS].title}).`;
    } else try {
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

    // Plan Basique: l'orchestrateur ne mobilise que les experts de base
    if (restrictedToBaseExperts) {
      const filtered = selectedExperts.filter((k) => BASE_EXPERTS.includes(k));
      selectedExperts = filtered.length ? filtered : ["theologien"];
    }

    // Phase 1 bis: Récupération documentaire (RAG) dans la base de connaissances
    const ragMatches = await searchKnowledge(admin, question, 8);
    const ragContext = formatContext(ragMatches);
    const ragBlock = ragContext ? `\n\n${ragContext}` : "";

    // Phase 2: Consultation des experts (parallèle)
    const contextMessages: Message[] = conversationHistory.map((msg: { role: string; content: string }) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content
    }));

    const expertPromises = selectedExperts.map(async (expertKey) => {
      const expert = EXPERTS[expertKey as keyof typeof EXPERTS];
      if (!expert) return null;

      const directInstruction = directExpertKey
        ? `\n\nMODE CONSULTATION DIRECTE: l'utilisateur t'a choisi personnellement. Réponds EXCLUSIVEMENT avec ta casquette, ton style et ton domaine d'expertise hyper-spécialisé de ${expert.title} (${expert.name}). Ne parle pas au nom des autres experts et n'aborde les autres disciplines que si elles servent directement ton champ propre. Développe en profondeur, avec tes sources de prédilection.`
        : "";
      const expertResponse = await callLovableAI([
        { role: "system", content: `${expert.systemPrompt}\n\n${levelInstruction}${directInstruction}${ragBlock}` },
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
    const directSynthesisHeader = directExpertKey
      ? `Tu es ${EXPERTS[directExpertKey as keyof typeof EXPERTS].name}, ${EXPERTS[directExpertKey as keyof typeof EXPERTS].title}. L'utilisateur t'a consulté DIRECTEMENT: rédige la réponse finale à la première personne, exclusivement selon ta casquette, ton style et ton domaine hyper-spécialisé, sans mentionner d'autres experts ni d'orchestration.`
      : `Tu es l'orchestreur assistant en chef.`;

    const synthesePrompt = `${directSynthesisHeader} ${directExpertKey ? "Structure et approfondis ta réponse ci-dessous." : "Tu dois créer une synthèse harmonieuse et complète des contributions de tes experts."}

${levelInstruction}${ragBlock}

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
4. Cite les sources pertinentes (Catéchisme, Écritures, documents) selon le niveau demandé
5. Conclut de manière édifiante
6. RESPECTE STRICTEMENT le niveau de langue demandé ci-dessus

RÈGLES DE CITATION OBLIGATOIRES:
- Insère des appels de notes numérotés dans le corps du texte sous la forme [1], [2], [3] à la fin de chaque affirmation appuyée sur une source (Bible, Catéchisme, concile, encyclique, Père de l'Église, etc.).
- Numérote de façon continue à partir de [1], sans doublons.
- À la toute fin de ta réponse, ajoute UNIQUEMENT un bloc de code JSON balisé exactement comme ceci (aucun texte après) :

\`\`\`sources
[
  {"n": 1, "type": "bible", "title": "Jean 3,16", "reference": "Jn 3,16", "url": "https://www.aelf.fr/bible/Jn/3"},
  {"n": 2, "type": "catechisme", "title": "CEC §460", "reference": "CEC 460", "url": "https://www.vatican.va/archive/FRA0013/__P1J.HTM"},
  {"n": 3, "type": "concile", "title": "Lumen Gentium 8", "reference": "LG 8", "url": "https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_const_19641121_lumen-gentium_fr.html"}
]
\`\`\`

Types acceptés: "bible", "catechisme", "concile", "encyclique", "pere", "docteur", "liturgie", "droit_canon", "histoire", "autre". Fournis une \`url\` officielle si possible (vatican.va, aelf.fr, etc.), sinon \`"url": null\`.

Format ta réponse en markdown, puis termine impérativement par le bloc \`\`\`sources.`;

    const syntheseResponse = await callLovableAI([
      { role: "system", content: synthesePrompt },
      { role: "user", content: "Crée la synthèse" }
    ]);

    // --- Increment quota server-side ---
    if (usageRow) {
      await admin
        .from("daily_usage")
        .update({ consultation_count: currentCount + 1 })
        .eq("id", usageRow.id);
    } else {
      await admin.from("daily_usage").insert({
        user_id: userId,
        usage_date: today,
        consultation_count: 1,
      });
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
