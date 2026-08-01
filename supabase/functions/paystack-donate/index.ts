import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PaystackliveAPI") ?? Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("Paystack API key not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const body = await req.json().catch(() => ({}));
    const { amount, callbackUrl, currency, email: emailInput } = body ?? {};

    // Donations are open to everyone: authentication is optional.
    let email: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data } = await supabase.auth.getUser();
        email = data?.user?.email ?? null;
      } catch (_) {
        email = null;
      }
    }
    if (!email && typeof emailInput === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailInput)) {
      email = emailInput;
    }
    if (!email) email = "dons@mbbm.tech";

    const selectedCurrency = ["XOF", "USD", "GHS", "NGN", "ZAR", "KES"].includes(currency) ? currency : "XOF";
    const numericAmount = Number(amount);
    const minAmount = selectedCurrency === "USD" ? 1 : 100;
    if (!Number.isFinite(numericAmount) || numericAmount < minAmount) {
      throw new Error(`Montant minimum: ${minAmount} ${selectedCurrency}`);
    }
    if (!callbackUrl || typeof callbackUrl !== "string") throw new Error("Missing callbackUrl");

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: Math.round(numericAmount) * 100,
        currency: selectedCurrency,
        callback_url: callbackUrl,
        metadata: {
          type: "donation",
          description: "Don libre - Monastère Sainte Marie de Bouaké",
        },
      }),
    });

    const paystackData = await paystackRes.json();
    if (!paystackRes.ok || !paystackData.status) {
      throw new Error(paystackData.message || "Paystack initialization failed");
    }

    return new Response(JSON.stringify({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    // Return 200 so the client can read the message instead of a generic non-2xx error.
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

