import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ArrowLeft, Loader2, Church, CheckCircle2, Sparkles, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useSearchParams } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Currency = "XOF" | "USD";

const currencyConfig: Record<Currency, { symbol: string; flag: string; suggestedAmounts: number[]; min: number }> = {
  XOF: { symbol: "XOF", flag: "🇨🇮", suggestedAmounts: [500, 1000, 2000, 5000, 10000], min: 100 },
  USD: { symbol: "$", flag: "🇺🇸", suggestedAmounts: [5, 10, 20, 50, 100], min: 1 },
};

const biblicalQuotes = [
  { text: "Chacun donne comme il l'a résolu en son cœur, sans tristesse ni contrainte ; car Dieu aime celui qui donne avec joie.", ref: "2 Corinthiens 9, 7" },
  { text: "Il y a plus de bonheur à donner qu'à recevoir.", ref: "Actes 20, 35" },
  { text: "Donnez, et l'on vous donnera : on versera dans votre sein une bonne mesure, serrée, secouée et qui déborde.", ref: "Luc 6, 38" },
  { text: "Que chacun de vous, au lieu de considérer ses propres intérêts, considère aussi ceux des autres.", ref: "Philippiens 2, 4" },
  { text: "Celui qui est fidèle dans les petites choses est fidèle aussi dans les grandes.", ref: "Luc 16, 10" },
  { text: "Ce que vous faites au plus petit d'entre les miens, c'est à moi que vous le faites.", ref: "Matthieu 25, 40" },
];

function getRandomQuote() {
  return biblicalQuotes[Math.floor(Math.random() * biblicalQuotes.length)];
}

export default function Donation() {
  const [currency, setCurrency] = useState<Currency>("XOF");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [quote] = useState(getRandomQuote);
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();

  const config = currencyConfig[currency];
  const finalAmount = selectedAmount ?? (customAmount ? parseInt(customAmount) : 0);

  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    if (reference) {
      verifyDonation(reference);
    }
  }, [searchParams]);

  const verifyDonation = async (reference: string) => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-verify", {
        body: { reference },
      });
      if (error) throw error;
      if (data?.success) {
        setShowThankYou(true);
      } else {
        toast.error(t("common.error"));
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setProcessing(false);
    }
  };

  const handleDonate = async () => {
    if (!finalAmount || finalAmount < config.min) {
      toast.error(t("donation.minAmount"));
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-donate", {
        body: {
          amount: finalAmount,
          currency,
          callbackUrl: `${window.location.origin}/donation`,
        },
      });

      if (error) throw error;
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error(data?.error || t("common.error"));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("common.error");
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

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
            <h1 className="font-serif text-lg sm:text-2xl font-bold">{t("donation.title")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector variant="ghost" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          {showThankYou ? (
            <motion.div
              key="thankyou"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <CheckCircle2 className="w-12 h-12 text-primary" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="font-serif text-2xl sm:text-3xl text-primary mb-3"
              >
                {t("donation.thankYou")}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-muted-foreground mb-8 max-w-md mx-auto"
              >
                {t("donation.thankYouDesc")}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-lg mx-auto mb-8"
              >
                <Sparkles className="w-6 h-6 text-secondary mx-auto mb-4" />
                <blockquote className="font-serif text-lg sm:text-xl text-foreground italic leading-relaxed mb-3">
                  « {quote.text} »
                </blockquote>
                <p className="text-sm text-muted-foreground font-medium">
                  — {quote.ref}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex flex-col sm:flex-row gap-3 justify-center"
              >
                <Link to="/">
                  <Button variant="default" className="bg-primary text-primary-foreground">
                    {t("donation.backToAssistant")}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => setShowThankYou(false)}
                >
                  <Heart className="w-4 h-4 mr-2" />
                  {t("donation.anotherDonation")}
                </Button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div key="form">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-10"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Church className="w-10 h-10 text-primary" />
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl text-primary mb-3">
                  {t("donation.heading")}
                </h2>
                <div className="ornament" />
                <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                  {t("donation.description")}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card border border-border rounded-2xl p-6 sm:p-8"
              >
                <h3 className="font-serif text-lg font-semibold text-foreground mb-4 text-center">
                  {t("donation.chooseAmount")}
                </h3>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
                  {suggestedAmounts.map((amount) => (
                    <Button
                      key={amount}
                      variant={selectedAmount === amount ? "default" : "outline"}
                      onClick={() => {
                        setSelectedAmount(amount);
                        setCustomAmount("");
                      }}
                      className={`text-sm font-semibold ${
                        selectedAmount === amount
                          ? "bg-primary text-primary-foreground"
                          : ""
                      }`}
                    >
                      {amount.toLocaleString("fr-FR")}
                    </Button>
                  ))}
                </div>

                <div className="mb-6">
                  <label className="text-sm text-muted-foreground mb-2 block">
                    {t("donation.customAmount")}
                  </label>
                  <Input
                    type="number"
                    min="100"
                    placeholder={t("donation.amountPlaceholder")}
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setSelectedAmount(null);
                    }}
                    className="text-lg"
                  />
                </div>

                {finalAmount > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center mb-4 p-3 bg-primary/5 rounded-lg"
                  >
                    <span className="text-muted-foreground">{t("donation.yourDonation")} </span>
                    <span className="text-2xl font-bold text-primary">
                      {finalAmount.toLocaleString("fr-FR")} XOF
                    </span>
                  </motion.div>
                )}

                <Button
                  onClick={handleDonate}
                  disabled={!finalAmount || finalAmount < 100 || processing}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-lg py-6"
                >
                  {processing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Heart className="w-5 h-5 mr-2" />
                      {t("donation.donate")}
                    </>
                  )}
                </Button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center text-xs text-muted-foreground mt-6"
              >
                {t("donation.securePayment")}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
