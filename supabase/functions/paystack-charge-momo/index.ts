import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Detect Mobile Money operator from phone number (Côte d'Ivoire + others)
function detectProvider(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  // Côte d'Ivoire (+225) - 10 digits after country code
  const local = digits.startsWith("225") ? digits.slice(3) : digits;
  const prefix = local.slice(0, 2);
  // Orange CI: 07, 08, 09 | MTN CI: 05, 04, 06 | Moov CI: 01, 02, 03
  if (["07", "08", "09"].includes(prefix)) return "orange";
  if (["05", "04", "06"].includes(prefix)) return "mtn";
  if (["01", "02", "03"].includes(prefix)) return "moov";
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    const { planSlug, phone, provider: providerInput } = await req.json();
    if (!planSlug || !phone) throw new Error("Missing planSlug or phone");

    const provider = providerInput || detectProvider(phone);
    if (!provider) throw new Error("Opérateur introuvable pour ce numéro. Précisez Orange, MTN ou Moov.");

    const { data: plan, error: planError } = await supabase
      .from("plans").select("*").eq("slug", planSlug).eq("is_active", true).single();
    if (planError || !plan) throw new Error("Plan not found");
    if (plan.price_amount === 0) throw new Error("Plan gratuit");

    // Normalize phone to local (Paystack CI expects local format e.g. 0700000000)
    const digits = phone.replace(/\D/g, "");
    const localPhone = digits.startsWith("225") ? digits.slice(3) : digits;

    // POST /charge — Paystack déclenche la notification USSD/push chez l'opérateur
    const chargeRes = await fetch("https://api.paystack.co/charge", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: plan.price_amount * 100,
        currency: plan.currency,
        mobile_money: { phone: localPhone, provider },
        metadata: {
          user_id: user.id,
          plan_id: plan.id,
          plan_slug: plan.slug,
          plan_name: plan.name,
          channel: "mobile_money",
        },
      }),
    });

    const chargeData = await chargeRes.json();
    if (!chargeRes.ok || !chargeData.status) {
      throw new Error(chargeData.message || "Échec de l'initialisation Mobile Money");
    }

    return new Response(JSON.stringify({
      success: true,
      status: chargeData.data?.status,
      reference: chargeData.data?.reference,
      display_text: chargeData.data?.display_text || "Confirmez le paiement sur votre téléphone",
      provider,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
