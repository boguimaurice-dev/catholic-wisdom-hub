import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const admin = createClient(url, service);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 3600_000).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 3600_000).toISOString();

    // Parallel queries
    const [
      usersList,
      consultTotal,
      consult24h,
      consult7d,
      consult30d,
      subsActive,
      subsAll,
      plansList,
      usageToday,
      recentConsults,
      recentSubs,
      allRoles,
    ] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
      admin.from("consultations").select("id", { count: "exact", head: true }),
      admin.from("consultations").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
      admin.from("consultations").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
      admin.from("consultations").select("id", { count: "exact", head: true }).gte("created_at", monthAgo),
      admin.from("user_subscriptions").select("*, plans(*)").eq("status", "active"),
      admin.from("user_subscriptions").select("id, status, created_at, plan_id, plans(name, price_amount, currency)").order("created_at", { ascending: false }).limit(50),
      admin.from("plans").select("*").order("price_amount", { ascending: true }),
      admin.from("daily_usage").select("user_id, consultation_count").eq("usage_date", now.toISOString().slice(0, 10)),
      admin.from("consultations").select("id, user_id, question, created_at, selected_experts").order("created_at", { ascending: false }).limit(20),
      admin.from("user_subscriptions").select("id, user_id, status, current_period_start, current_period_end, plans(name, price_amount, currency)").order("created_at", { ascending: false }).limit(20),
      admin.from("user_roles").select("user_id, role"),
    ]);

    const totalUsers = usersList.data?.users.length ?? 0;
    const users = (usersList.data?.users || []).map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      confirmed: !!u.email_confirmed_at,
      provider: u.app_metadata?.provider,
    }));

    const newUsers24h = users.filter((u) => u.created_at && u.created_at >= dayAgo).length;
    const newUsers7d = users.filter((u) => u.created_at && u.created_at >= weekAgo).length;
    const newUsers30d = users.filter((u) => u.created_at && u.created_at >= monthAgo).length;
    const activeUsers7d = users.filter((u) => u.last_sign_in_at && u.last_sign_in_at >= weekAgo).length;

    // Revenue estimation from active subs
    const revenueByCurrency: Record<string, number> = {};
    const subsByPlan: Record<string, number> = {};
    for (const s of subsActive.data || []) {
      const p: any = (s as any).plans;
      if (p) {
        revenueByCurrency[p.currency] = (revenueByCurrency[p.currency] || 0) + (p.price_amount || 0);
        subsByPlan[p.name] = (subsByPlan[p.name] || 0) + 1;
      }
    }

    // Consultations per day (last 14 days)
    const { data: consultTimeseries } = await admin
      .from("consultations")
      .select("created_at")
      .gte("created_at", new Date(now.getTime() - 14 * 24 * 3600_000).toISOString());
    const dailySeries: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600_000).toISOString().slice(0, 10);
      dailySeries[d] = 0;
    }
    for (const c of consultTimeseries || []) {
      const d = (c.created_at as string).slice(0, 10);
      if (d in dailySeries) dailySeries[d]++;
    }

    return new Response(
      JSON.stringify({
        generated_at: now.toISOString(),
        business: {
          totalUsers,
          newUsers24h,
          newUsers7d,
          newUsers30d,
          activeUsers7d,
          consultations: {
            total: consultTotal.count ?? 0,
            last24h: consult24h.count ?? 0,
            last7d: consult7d.count ?? 0,
            last30d: consult30d.count ?? 0,
          },
          activeSubscriptions: (subsActive.data || []).length,
          revenueByCurrency,
          subsByPlan,
          dailySeries,
        },
        users,
        roles: allRoles.data || [],
        plans: plansList.data || [],
        usageToday: usageToday.data || [],
        recent: {
          consultations: recentConsults.data || [],
          subscriptions: recentSubs.data || [],
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("admin-metrics error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
