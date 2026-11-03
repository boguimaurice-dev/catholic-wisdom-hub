import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Star, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_amount: number;
  currency: string;
  features: string[];
  max_consultations_per_day: number;
}

const planIcons: Record<string, React.ReactNode> = {
  basique: <Zap className="w-6 h-6" />,
  premium: <Star className="w-6 h-6" />,
  elite: <Crown className="w-6 h-6" />,
};

export function LandingPricing() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    const { data } = await supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("price_amount");

    setPlans(
      (data || []).map((p: any) => ({
        ...p,
        features: Array.isArray(p.features) ? p.features : JSON.parse(p.features || "[]"),
      }))
    );
    setLoading(false);
  };

  const handleSubscribe = async (plan: Plan) => {
    // Free plan → go to auth
    if (plan.price_amount === 0) {
      navigate("/auth");
      return;
    }

    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.info(t("landing.loginToSubscribe") || "Connectez-vous pour souscrire");
      navigate("/auth");
      return;
    }

    setProcessingPlan(plan.slug);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-initialize", {
        body: {
          planSlug: plan.slug,
          callbackUrl: `${window.location.origin}/pricing`,
        },
      });

      if (error) throw error;
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error(data?.error || t("common.error"));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.error") || "Erreur";
      toast.error(message);
    } finally {
      setProcessingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
      {plans.map((plan, i) => {
        const isPopular = plan.slug === "premium";
        return (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <Card
              className={`relative h-full border-border/50 bg-card transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer ${
                isPopular ? "ring-2 ring-secondary shadow-lg" : ""
              }`}
              onClick={() => handleSubscribe(plan)}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {t("plans.popular") || "Populaire"}
                </div>
              )}
              <CardContent className="p-6 flex flex-col h-full">
                <div className="text-center mb-4">
                  <div
                    className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
                      isPopular ? "bg-secondary/15 text-secondary" : "bg-accent/10 text-accent"
                    }`}
                  >
                    {planIcons[plan.slug]}
                  </div>
                  <h3 className="font-serif text-lg font-bold text-foreground">{plan.name}</h3>
                  <div className="mt-2">
                    {plan.price_amount === 0 ? (
                      <span className="text-2xl font-bold text-foreground">
                        {t("plans.free") || "Gratuit"}
                      </span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-foreground">
                          {plan.price_amount.toLocaleString(
                            language === "fr" ? "fr-FR" : language === "pt" ? "pt-BR" : language
                          )}
                        </span>
                        <span className="text-muted-foreground ml-1 text-sm">
                          {plan.currency}/{language === "en" ? "mo" : "mois"}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.slice(0, 4).map((feature, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm">
                      <Check
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          isPopular ? "text-secondary" : "text-accent"
                        }`}
                      />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubscribe(plan);
                  }}
                  disabled={processingPlan === plan.slug}
                  variant={isPopular ? "default" : "outline"}
                  className={`w-full ${
                    isPopular ? "bg-secondary text-secondary-foreground hover:bg-secondary/90" : ""
                  }`}
                >
                  {processingPlan === plan.slug ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : plan.price_amount === 0 ? (
                    t("landing.startFree") || "Commencer gratuitement"
                  ) : (
                    t("plans.subscribe") || "S'abonner"
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
