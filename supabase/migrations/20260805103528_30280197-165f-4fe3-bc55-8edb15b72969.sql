CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.rag_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corpus text NOT NULL,
  title text NOT NULL,
  reference text,
  content text NOT NULL,
  source_url text,
  lang text NOT NULL DEFAULT 'fr',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(1536),
  model_version text NOT NULL DEFAULT 'openai/text-embedding-3-small',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rag_documents TO authenticated;
GRANT ALL ON public.rag_documents TO service_role;

ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read knowledge base"
  ON public.rag_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert knowledge base"
  ON public.rag_documents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update knowledge base"
  ON public.rag_documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete knowledge base"
  ON public.rag_documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS rag_documents_embedding_idx
  ON public.rag_documents USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS rag_documents_corpus_idx ON public.rag_documents (corpus);

CREATE OR REPLACE FUNCTION public.match_rag_documents(
  query_embedding vector(1536),
  match_count int DEFAULT 6,
  corpus_filter text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  corpus text,
  title text,
  reference text,
  content text,
  source_url text,
  similarity float
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT d.id, d.corpus, d.title, d.reference, d.content, d.source_url,
         1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.rag_documents d
  WHERE d.embedding IS NOT NULL
    AND (corpus_filter IS NULL OR d.corpus = ANY(corpus_filter))
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;

REVOKE ALL ON FUNCTION public.match_rag_documents(vector, int, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_rag_documents(vector, int, text[]) TO service_role;