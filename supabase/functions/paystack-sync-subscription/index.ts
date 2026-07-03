import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PaystackliveAPI");
    if (!PAYSTACK_SECRET_KEY) throw new Error("Paystack API key not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch recent successful transactions for this customer email
    const txRes = await fetch(
      `https://api.paystack.co/transaction?customer=${encodeURIComponent(user.email!)}&status=success&perPage=20`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );
    const txData = await txRes.json();
    if (!txRes.ok || !txData.status) throw new Error(txData.message || "Paystack fetch failed");

    const transactions = txData.data || [];
    let updated = 0;
    let latestActive: any = null;

    for (const tx of transactions) {
      const meta = tx.metadata || {};
      const planId = meta.plan_id;
      if (!planId || meta.type === "donation") continue;
      const ref = tx.reference;

      const { data: existing } = await admin
        .from("user_subscriptions").select("id, status").eq("paystack_subscription_code", ref).maybeSingle();

      const paidAt = new Date(tx.paid_at || tx.created_at);
      const periodEnd = new Date(paidAt);
      periodEnd.setDate(periodEnd.getDate() + 30);
      const isActive = periodEnd > new Date();

      if (!existing && isActive) {
        // Deactivate other active subs
        await admin.from("user_subscriptions")
          .update({ status: "inactive", updated_at: new Date().toISOString() })
          .eq("user_id", user.id).eq("status", "active");

        await admin.from("user_subscriptions").insert({
          user_id: user.id,
          plan_id: planId,
          status: "active",
          paystack_subscription_code: ref,
          paystack_customer_code: tx.customer?.customer_code || null,
          current_period_start: paidAt.toISOString(),
          current_period_end: periodEnd.toISOString(),
        });
        updated++;
        if (!latestActive || paidAt > new Date(latestActive.paid_at)) latestActive = { paid_at: paidAt, ref };
      }
    }

    // Expire outdated active subs
    await admin.from("user_subscriptions")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("user_id", user.id).eq("status", "active")
      .lt("current_period_end", new Date().toISOString());

    return new Response(JSON.stringify({
      success: true,
      transactions_found: transactions.length,
      subscriptions_added: updated,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
