import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Star, Zap, ArrowLeft, Loader2, Heart, RefreshCw, Smartphone, CreditCard, Send, Bell, ShieldCheck, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function detectProvider(phone: string): "orange" | "mtn" | "moov" | null {
  const d = phone.replace(/\D/g, "");
  const local = d.startsWith("225") ? d.slice(3) : d;
  const p = local.slice(0, 2);
  if (["07", "08", "09"].includes(p)) return "orange";
  if (["05", "04", "06"].includes(p)) return "mtn";
  if (["01", "02", "03"].includes(p)) return "moov";
  return null;
}

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
  const [momoOpen, setMomoOpen] = useState(false);
  const [momoPlanSlug, setMomoPlanSlug] = useState<string | null>(null);
  const [momoPhone, setMomoPhone] = useState("");
  const [momoProvider, setMomoProvider] = useState<"orange" | "mtn" | "moov" | "">("");
  const [momoLoading, setMomoLoading] = useState(false);
  const [momoStatus, setMomoStatus] = useState<string | null>(null);
  type MomoStep = "idle" | "requesting" | "notified" | "awaiting" | "confirmed" | "failed";
  const [momoStep, setMomoStep] = useState<MomoStep>("idle");
  const [momoErrorMsg, setMomoErrorMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, language } = useLanguage();

  useEffect(() => {
    const reference = searchParams.get("reference");
    if (reference) verifyPayment(reference);
  }, [searchParams]);

  useEffect(() => {
    const guessed = detectProvider(momoPhone);
    if (guessed) setMomoProvider(guessed);
  }, [momoPhone]);

  const verifyPayment = async (reference: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase.functions.invoke("paystack-verify", { body: { reference } });
      if (error) throw error;
      if (data?.success) {
        toast.success(t("plans.currentPlan"));
        await refresh();
        navigate("/pricing", { replace: true });
      }
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleSyncSubscriptions = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-sync-subscription", { body: {} });
      if (error) throw error;
      if (data?.success) {
        toast.success(
          data.subscriptions_added > 0
            ? `${data.subscriptions_added} abonnement(s) mis à jour`
            : "Vos abonnements sont à jour"
        );
        await refresh();
      } else {
        throw new Error(data?.error || "Erreur");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSyncing(false);
    }
  };

  const handleSubscribe = async (planSlug: string) => {
    if (planSlug === "basique") return;
    setProcessingPlan(planSlug);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-initialize", {
        body: { planSlug, callbackUrl: `${window.location.origin}/pricing` },
      });
      if (error) throw error;
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error(data?.error || t("common.error"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setProcessingPlan(null);
    }
  };

  const openMomo = (planSlug: string) => {
    setMomoPlanSlug(planSlug);
    setMomoPhone("");
    setMomoProvider("");
    setMomoStatus(null);
    setMomoOpen(true);
  };

  const submitMomo = async () => {
    if (!momoPlanSlug) return;
    if (momoPhone.replace(/\D/g, "").length < 8) return toast.error("Numéro invalide");
    const provider = momoProvider || detectProvider(momoPhone);
    if (!provider) return toast.error("Choisissez votre opérateur");

    setMomoLoading(true);
    setMomoStatus("Envoi de la notification à votre opérateur…");
    try {
      const { data, error } = await supabase.functions.invoke("paystack-charge-momo", {
        body: { planSlug: momoPlanSlug, phone: momoPhone, provider },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Échec");
      setMomoStatus(
        data.display_text ||
          `Notification envoyée à ${provider.toUpperCase()}. Autorisez le paiement sur votre téléphone.`
      );
      toast.success("Vérifiez votre téléphone pour autoriser le paiement");
      const ref = data.reference;
      if (ref) {
        for (let i = 0; i < 12; i++) {
          await new Promise((r) => setTimeout(r, 5000));
          const { data: v } = await supabase.functions.invoke("paystack-verify", { body: { reference: ref } });
          if (v?.success) {
            toast.success("Paiement confirmé !");
            setMomoOpen(false);
            await refresh();
            return;
          }
        }
        setMomoStatus("En attente de confirmation. Utilisez « Actualiser » plus tard.");
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : "Erreur";
      toast.error(m);
      setMomoStatus(m);
    } finally {
      setMomoLoading(false);
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
            <h1 className="font-serif text-lg sm:text-2xl font-bold">{t("plans.choosePlan")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSyncSubscriptions}
              disabled={syncing}
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              title="Actualiser mes abonnements depuis Paystack"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline ml-1">Actualiser</span>
            </Button>
            <Link to="/donation">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">{t("header.support")}</span>
              </Button>
            </Link>
            <LanguageSelector variant="ghost" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-10">
          <h2 className="font-serif text-2xl sm:text-3xl text-primary mb-2">
            {t("plans.choosePlan")}
          </h2>
          <div className="ornament" />
          <p className="text-muted-foreground max-w-md mx-auto">
            {t("plans.choosePlanDesc")}
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
                    {t("plans.popular")}
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className={`w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center ${isPopular ? "bg-secondary/15 text-secondary" : "bg-primary/10 text-primary"}`}>
                    {planIcons[plan.slug]}
                  </div>
                  <h3 className="font-serif text-xl font-bold text-foreground">{plan.name}</h3>
                  <div className="mt-2">
                    {plan.price_amount === 0 ? (
                      <span className="text-3xl font-bold text-foreground">{t("plans.free")}</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-foreground">
                          {plan.price_amount.toLocaleString(language === "fr" ? "fr-FR" : language === "pt" ? "pt-BR" : language)}
                        </span>
                        <span className="text-muted-foreground ml-1">
                          {plan.currency}/{language === "en" ? "mo" : "mois"}
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

                <div className="space-y-2">
                  <Button
                    onClick={() => handleSubscribe(plan.slug)}
                    disabled={isCurrentPlan || processingPlan === plan.slug}
                    variant={isPopular ? "default" : "outline"}
                    className={`w-full ${isPopular ? "bg-secondary text-secondary-foreground hover:bg-secondary/90" : ""}`}
                  >
                    {processingPlan === plan.slug ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrentPlan ? (
                      t("plans.currentPlan")
                    ) : plan.price_amount === 0 ? (
                      t("plans.currentPlan")
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Carte bancaire
                      </>
                    )}
                  </Button>
                  {plan.price_amount > 0 && !isCurrentPlan && (
                    <Button
                      onClick={() => openMomo(plan.slug)}
                      variant="outline"
                      className="w-full"
                    >
                      <Smartphone className="w-4 h-4 mr-2" />
                      Mobile Money
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {subscription && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              {t("plans.activeUntil")}{" "}
              <span className="font-semibold text-foreground">
                {new Date(subscription.current_period_end).toLocaleDateString(language === "fr" ? "fr-FR" : language === "pt" ? "pt-BR" : language === "es" ? "es-ES" : "en-US")}
              </span>
            </p>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link to="/donation">
            <Button variant="outline" size="lg" className="gap-2">
              <Heart className="w-5 h-5 text-destructive" />
              {t("plans.supportMonastery")}
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground mt-2">
            {t("plans.supportMonasteryDesc")}
          </p>
        </div>
      </main>

      <Dialog open={momoOpen} onOpenChange={(o) => !momoLoading && setMomoOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Paiement Mobile Money
            </DialogTitle>
            <DialogDescription>
              Entrez votre numéro. Votre opérateur vous enverra une notification pour
              autoriser le débit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="momo-phone">Numéro de téléphone</Label>
              <Input
                id="momo-phone"
                type="tel"
                placeholder="07 XX XX XX XX"
                value={momoPhone}
                onChange={(e) => setMomoPhone(e.target.value)}
                disabled={momoLoading}
                autoFocus
              />
            </div>

            <div>
              <Label>Opérateur</Label>
              <RadioGroup
                value={momoProvider}
                onValueChange={(v) => setMomoProvider(v as any)}
                className="grid grid-cols-3 gap-2 mt-2"
                disabled={momoLoading}
              >
                {[
                  { v: "orange", label: "Orange" },
                  { v: "mtn", label: "MTN" },
                  { v: "moov", label: "Moov" },
                ].map((o) => (
                  <label
                    key={o.v}
                    className={`flex items-center justify-center gap-2 rounded-md border p-2 cursor-pointer text-sm ${
                      momoProvider === o.v ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <RadioGroupItem value={o.v} />
                    {o.label}
                  </label>
                ))}
              </RadioGroup>
            </div>

            {momoStatus && (
              <div className="text-sm bg-muted/50 border border-border rounded-md p-3">
                {momoLoading && <Loader2 className="w-4 h-4 animate-spin inline mr-2" />}
                {momoStatus}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setMomoOpen(false)} disabled={momoLoading}>
              Annuler
            </Button>
            <Button onClick={submitMomo} disabled={momoLoading || !momoPhone}>
              {momoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Payer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
