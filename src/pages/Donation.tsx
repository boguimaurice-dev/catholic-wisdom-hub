import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, ArrowLeft, Loader2, Church } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const suggestedAmounts = [500, 1000, 2000, 5000, 10000];

export default function Donation() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [processing, setProcessing] = useState(false);

  const finalAmount = selectedAmount ?? (customAmount ? parseInt(customAmount) : 0);

  const handleDonate = async () => {
    if (!finalAmount || finalAmount < 100) {
      toast.error("Le montant minimum est de 100 XOF");
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-donate", {
        body: {
          amount: finalAmount,
          callbackUrl: `${window.location.origin}/donation?success=true`,
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
            <h1 className="font-serif text-lg sm:text-2xl font-bold">Soutenir le Monastère</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Church className="w-10 h-10 text-primary" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-primary mb-3">
            Libre don pour le Monastère
          </h2>
          <div className="ornament" />
          <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
            Participez librement aux œuvres et à la vie du Monastère Sainte Marie de Bouaké.
            Votre générosité soutient la communauté monastique et ses missions.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-6 sm:p-8"
        >
          <h3 className="font-serif text-lg font-semibold text-foreground mb-4 text-center">
            Choisissez un montant ou entrez le vôtre
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
              Ou entrez un montant libre (XOF)
            </label>
            <Input
              type="number"
              min="100"
              placeholder="Montant en XOF"
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
              <span className="text-muted-foreground">Votre don : </span>
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
                Faire un don
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
          Paiement sécurisé via Paystack. L'application reste entièrement gratuite.
        </motion.p>
      </main>
    </div>
  );
}
