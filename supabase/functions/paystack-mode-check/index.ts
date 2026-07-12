import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Diagnostic endpoint: confirms which Paystack mode (live/test) the configured
// secret key is in, without ever revealing the key itself. Safe to call publicly:
// it only pings Paystack's /balance endpoint and reports the mode + a status.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const key = Deno.env.get("PaystackliveAPI");
    if (!key) {
      return new Response(
        JSON.stringify({ success: false, error: "PaystackliveAPI not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const declaredMode = key.startsWith("sk_live_")
      ? "live"
      : key.startsWith("sk_test_")
      ? "test"
      : "unknown_prefix";

    // /balance is a lightweight authenticated endpoint that returns a clear
    // "Invalid key" if the key is malformed or revoked.
    const res = await fetch("https://api.paystack.co/balance", {
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = await res.json().catch(() => ({}));

    return new Response(
      JSON.stringify({
        success: res.ok && data?.status === true,
        http_status: res.status,
        declared_mode: declaredMode,
        paystack_status: data?.status ?? null,
        paystack_message: data?.message ?? null,
        // /balance returns a `currency` field per business — surfaced to confirm
        // the account is reachable but never any sensitive amount details.
        balance_currencies: Array.isArray(data?.data)
          ? data.data.map((b: { currency?: string }) => b.currency).filter(Boolean)
          : null,
        webhook_url_to_configure_in_paystack:
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/paystack-webhook`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
