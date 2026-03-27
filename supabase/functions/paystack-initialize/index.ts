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
    const PAYSTACK_SECRET_KEY = Deno.env.get("PaystackliveAPI");
    if (!PAYSTACK_SECRET_KEY) throw new Error("Paystack API key not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    const { planSlug, callbackUrl } = await req.json();
    if (!planSlug || !callbackUrl) throw new Error("Missing planSlug or callbackUrl");

    // Get plan
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("slug", planSlug)
      .eq("is_active", true)
      .single();

    if (planError || !plan) throw new Error("Plan not found");
    if (plan.price_amount === 0) throw new Error("Cannot subscribe to free plan via payment");

    // Initialize Paystack transaction
    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: plan.price_amount * 100, // Paystack uses kobo/centimes
        currency: plan.currency,
        callback_url: callbackUrl,
        metadata: {
          user_id: user.id,
          plan_id: plan.id,
          plan_slug: plan.slug,
          plan_name: plan.name,
        },
        plan: plan.paystack_plan_code || undefined,
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
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
