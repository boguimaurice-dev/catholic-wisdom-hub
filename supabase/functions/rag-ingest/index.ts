import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chunkText, embedTexts, CORPORA, EMBEDDING_MODEL } from "../_shared/rag.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface IncomingDoc {
  corpus: string;
  title: string;
  reference?: string;
  content: string;
  source_url?: string;
  lang?: string;
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, service);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => null);
    const docs: IncomingDoc[] = Array.isArray(body?.documents) ? body.documents : [];
    if (!docs.length) return json({ error: "Aucun document fourni." }, 400);
    if (docs.length > 50) return json({ error: "Maximum 50 documents par envoi." }, 400);

    const rows: {
      corpus: string;
      title: string;
      reference: string | null;
      content: string;
      source_url: string | null;
      lang: string;
      metadata: Record<string, unknown>;
      model_version: string;
    }[] = [];

    for (const d of docs) {
      const corpus = String(d.corpus || "").trim();
      const title = String(d.title || "").trim();
      const content = String(d.content || "").trim();
      if (!CORPORA.includes(corpus as (typeof CORPORA)[number])) {
        return json({ error: `Corpus invalide: ${corpus}` }, 400);
      }
      if (!title || !content) return json({ error: "Titre et contenu obligatoires." }, 400);

      const parts = chunkText(content);
      parts.forEach((part, i) => {
        rows.push({
          corpus,
          title: parts.length > 1 ? `${title} (${i + 1}/${parts.length})` : title,
          reference: d.reference?.toString().trim() || null,
          content: part,
          source_url: d.source_url?.toString().trim() || null,
          lang: d.lang?.toString().trim() || "fr",
          metadata: d.metadata ?? {},
          model_version: EMBEDDING_MODEL,
        });
      });
    }

    if (rows.length > 400) {
      return json({ error: `Trop de fragments (${rows.length}). Découpez l'envoi.` }, 400);
    }

    const embeddings = await embedTexts(rows.map((r) => `${r.title}\n${r.reference ?? ""}\n${r.content}`));

    const payload = rows.map((r, i) => ({ ...r, embedding: embeddings[i] }));
    const { error: insertErr } = await admin.from("rag_documents").insert(payload);
    if (insertErr) {
      console.error("rag insert error:", insertErr);
      return json({ error: insertErr.message }, 500);
    }

    return json({ success: true, documents: docs.length, chunks: rows.length });
  } catch (e) {
    console.error("rag-ingest error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur inconnue" }, 500);
  }
});
