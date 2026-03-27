import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Star, Zap, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

const planIcons: Record<string, React.ReactNode> = {
  basique: <Zap className="w-6 h-6" />,
  premium: <Star className="w-6 h-6" />,
  elite: <Crown className="w-6 h-6" />,
};

const planColors: Record<string, string> = {
  basique: "border-border",
  premium: "border-secondary ring-2 ring-secondary/20",
  elite: "border-primary ring-2 ring-primary/20",
};

export default function Pricing() {
  const { plans, currentPlan, subscription, loading, refresh } = useSubscription();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Verify payment on return from Paystack
  useEffect(() => {
    const reference = searchParams.get("reference");
    if (reference) {
      verifyPayment(reference);
    }
  }, [searchParams]);

  const verifyPayment = async (reference: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("paystack-verify", {
        body: { reference },
      });

      if (error) throw error;
      if (data?.success) {
        toast.success("Paiement confirmé ! Votre abonnement est actif.");
        await refresh();
        navigate("/pricing", { replace: true });
      }
    } catch (err) {
      toast.error("Erreur lors de la vérification du paiement.");
    }
  };

  const handleSubscribe = async (planSlug: string) => {
    if (planSlug === "basique") return;
    setProcessingPlan(planSlug);

    try {
      const { data, error } = await supabase.functions.invoke("paystack-initialize", {
        body: {
          planSlug,
          callbackUrl: `${window.location.origin}/pricing`,
        },
      });

      if (error) throw error;
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error(data?.error || "Erreur d'initialisation");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      toast.error(message);
    } finally {
      setProcessingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-serif text-lg sm:text-2xl font-bold">Abonnements</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-10">
          <h2 className="font-serif text-2xl sm:text-3xl text-primary mb-2">
            Choisissez votre plan
          </h2>
          <div className="ornament" />
          <p className="text-muted-foreground max-w-md mx-auto">
            Accédez à la sagesse de nos experts selon vos besoins
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => {
            const isCurrentPlan = currentPlan?.slug === plan.slug;
            const isPopular = plan.slug === "premium";

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative bg-card rounded-2xl border-2 p-6 flex flex-col ${planColors[plan.slug] || "border-border"}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    Populaire
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className={`w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center ${isPopular ? "bg-secondary/15 text-secondary" : "bg-primary/10 text-primary"}`}>
                    {planIcons[plan.slug]}
                  </div>
                  <h3 className="font-serif text-xl font-bold text-foreground">{plan.name}</h3>
                  <div className="mt-2">
                    {plan.price_amount === 0 ? (
                      <span className="text-3xl font-bold text-foreground">Gratuit</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-foreground">
                          {plan.price_amount.toLocaleString("fr-FR")}
                        </span>
                        <span className="text-muted-foreground ml-1">
                          {plan.currency}/mois
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${isPopular ? "text-secondary" : "text-primary"}`} />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSubscribe(plan.slug)}
                  disabled={isCurrentPlan || processingPlan === plan.slug}
                  variant={isPopular ? "default" : "outline"}
                  className={`w-full ${isPopular ? "bg-secondary text-secondary-foreground hover:bg-secondary/90" : ""}`}
                >
                  {processingPlan === plan.slug ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrentPlan ? (
                    "Plan actuel"
                  ) : plan.price_amount === 0 ? (
                    "Plan actuel"
                  ) : (
                    "S'abonner"
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {subscription && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              Abonnement actif jusqu'au{" "}
              <span className="font-semibold text-foreground">
                {new Date(subscription.current_period_end).toLocaleDateString("fr-FR")}
              </span>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
