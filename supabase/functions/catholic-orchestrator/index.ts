import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
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

const CLAUDE_MODEL = Deno.env.get("CLAUDE_MODEL") || "claude-3-5-sonnet-20241022";
const CLAUDE_ROUTER_MODEL = Deno.env.get("CLAUDE_ROUTER_MODEL") || CLAUDE_MODEL;
const CLAUDE_MAX_TOKENS = 8192;
const CLAUDE_MAX_HISTORY = 40;

function claudeApiKey(): string | null {
  return Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("claude_api") || null;
}
