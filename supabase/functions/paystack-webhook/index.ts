import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PaystackliveAPI");
    if (!PAYSTACK_SECRET_KEY) throw new Error("Paystack key not configured");

    const body = await req.text();

    // Verify signature — MANDATORY
    const signature = req.headers.get("x-paystack-signature");
    if (!signature) {
      return new Response("Missing signature", { status: 401 });
    }
    const hash = createHmac("sha512", PAYSTACK_SECRET_KEY).update(body).digest("hex");
    if (hash !== signature) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (event.event === "charge.success") {
      const { metadata, customer } = event.data;
      if (!metadata?.user_id || !metadata?.plan_id) {
        return new Response("OK - no metadata", { status: 200 });
      }

      // Deactivate old subscriptions
      await supabase
        .from("user_subscriptions")
        .update({ status: "inactive", updated_at: new Date().toISOString() })
        .eq("user_id", metadata.user_id)
        .eq("status", "active");

      // Create new subscription
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30);

      await supabase.from("user_subscriptions").insert({
        user_id: metadata.user_id,
        plan_id: metadata.plan_id,
        status: "active",
        paystack_subscription_code: event.data.reference,
        paystack_customer_code: customer?.customer_code || null,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      });
    }

    if (event.event === "subscription.disable") {
      const { subscription_code } = event.data;
      if (subscription_code) {
        await supabase
          .from("user_subscriptions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("paystack_subscription_code", subscription_code);
      }
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Error", { status: 500, headers: corsHeaders });
  }
});
