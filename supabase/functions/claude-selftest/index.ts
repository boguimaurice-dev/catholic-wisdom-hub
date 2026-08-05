import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async () => {
  const key = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("claude_api");
  if (!key) return new Response(JSON.stringify({ ok: false, error: "no key" }), { status: 200 });
  const res = await fetch("https://api.anthropic.com/v1/models", {
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
  });
  const body = await res.text();
  return new Response(JSON.stringify({ ok: res.ok, status: res.status, body: body.slice(0, 1500) }), {
    headers: { "Content-Type": "application/json" },
  });
});
