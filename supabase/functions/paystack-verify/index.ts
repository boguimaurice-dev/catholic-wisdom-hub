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

    const { reference } = await req.json();
    if (!reference) throw new Error("Missing reference");

    // Verify with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });

    const verifyData = await verifyRes.json();
    const txStatus = verifyData?.data?.status ?? "unknown";

    // Return HTTP 200 with pending status so client can poll without a runtime error
    if (!verifyRes.ok || !verifyData.status || txStatus !== "success") {
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          status: txStatus,
          message:
            txStatus === "pending" || txStatus === "ongoing"
              ? "Payment pending — awaiting user authorization"
              : `Payment not verified (status: ${txStatus})`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { metadata } = verifyData.data;


    // Check if subscription already exists for this reference
    const { data: existing } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("paystack_subscription_code", reference)
      .single();

    if (!existing && metadata?.plan_id) {
      // Deactivate old subscriptions
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminClient = createClient(supabaseUrl, serviceKey);

      await adminClient
        .from("user_subscriptions")
        .update({ status: "inactive", updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("status", "active");

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30);

      await adminClient.from("user_subscriptions").insert({
        user_id: user.id,
        plan_id: metadata.plan_id,
        status: "active",
        paystack_subscription_code: reference,
        paystack_customer_code: verifyData.data.customer?.customer_code || null,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      });
    }

    return new Response(JSON.stringify({ success: true, verified: true }), {
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
