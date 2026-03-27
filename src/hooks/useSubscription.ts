import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_amount: number;
  currency: string;
  features: string[];
  max_consultations_per_day: number;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  current_period_end: string;
  plan?: Plan;
}

export function useSubscription() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [dailyUsage, setDailyUsage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load plans
      const { data: plansData } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("price_amount");

      const parsedPlans = (plansData || []).map((p: any) => ({
        ...p,
        features: Array.isArray(p.features) ? p.features : JSON.parse(p.features || "[]"),
      }));
      setPlans(parsedPlans);

      // Load active subscription
      const { data: subData } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

      const activeSub = subData?.[0] || null;
      setSubscription(activeSub);

      if (activeSub && parsedPlans.length) {
        setCurrentPlan(parsedPlans.find((p: Plan) => p.id === activeSub.plan_id) || null);
      } else {
        // Default to free plan
        setCurrentPlan(parsedPlans.find((p: Plan) => p.slug === "basique") || null);
      }

      // Load daily usage
      const today = new Date().toISOString().split("T")[0];
      const { data: usageData } = await supabase
        .from("daily_usage")
        .select("consultation_count")
        .eq("user_id", user!.id)
        .eq("usage_date", today)
        .single();

      setDailyUsage(usageData?.consultation_count || 0);
    } catch (err) {
      console.error("Error loading subscription data:", err);
    } finally {
      setLoading(false);
    }
  };

  const canConsult = () => {
    if (!currentPlan) return true; // fallback allow
    return dailyUsage < currentPlan.max_consultations_per_day;
  };

  const incrementUsage = async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("daily_usage")
      .select("*")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .single();

    if (existing) {
      await supabase
        .from("daily_usage")
        .update({ consultation_count: existing.consultation_count + 1 })
        .eq("id", existing.id);
      setDailyUsage(existing.consultation_count + 1);
    } else {
      await supabase
        .from("daily_usage")
        .insert({ user_id: user.id, usage_date: today, consultation_count: 1 });
      setDailyUsage(1);
    }
  };

  const remainingConsultations = () => {
    if (!currentPlan) return 999;
    return Math.max(0, currentPlan.max_consultations_per_day - dailyUsage);
  };

  return {
    plans,
    subscription,
    currentPlan,
    dailyUsage,
    loading,
    canConsult,
    incrementUsage,
    remainingConsultations,
    refresh: loadData,
  };
}
