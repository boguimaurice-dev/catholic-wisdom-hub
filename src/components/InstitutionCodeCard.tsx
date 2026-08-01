import { useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "Vous devez être connecté pour activer un code.",
  invalid_code: "Ce code d'activation est invalide ou n'est plus actif.",
  expired: "Ce code d'activation a expiré.",
  already_redeemed: "Vous avez déjà utilisé ce code d'activation.",
  limit_reached: "Ce code a atteint son nombre maximal d'utilisateurs.",
};

export function InstitutionCodeCard({ onActivated }: { onActivated?: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = code.trim();
    if (!value) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { data, error: rpcError } = await (supabase as any).rpc("redeem_institution_code", {
        _code: value,
      });
      if (rpcError) throw rpcError;
      const result = data as { success: boolean; error?: string; plan_name?: string; institution_name?: string };
      if (result?.success) {
        const msg = "Félicitations ! Votre accès Élite Institutionnel est désormais actif.";
        setSuccess(result.institution_name ? `${msg} (${result.institution_name})` : msg);
        setCode("");
        toast.success(msg);
        onActivated?.();
      } else {
        const msg = ERROR_MESSAGES[result?.error ?? ""] ?? "Ce code d'activation est invalide.";
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      console.error("redeem_institution_code failed:", err);
      const msg = "Une erreur est survenue. Merci de réessayer.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-12 max-w-xl mx-auto rounded-xl border border-border bg-card/60 backdrop-blur-sm p-6 shadow-sm"
      aria-labelledby="institution-code-title"
    >
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-primary/10 text-primary p-2">
          <KeyRound className="w-5 h-5" />
        </span>
        <div>
          <h2 id="institution-code-title" className="font-heading text-lg text-foreground">
            Activer un accès institutionnel
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Séminaires, paroisses et communautés : saisissez le code fourni par votre
            institution pour débloquer l'accès Élite.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-3">
        <Label htmlFor="institution-code">Code d'activation</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            id="institution-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="EX : SEMINAIRE-2026"
            autoComplete="off"
            maxLength={64}
            disabled={loading}
            className="tracking-wider"
          />
          <Button type="submit" disabled={loading || !code.trim()} className="sm:w-auto">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Valider le code"}
          </Button>
        </div>
      </form>

      {success && (
        <p className="mt-4 flex items-start gap-2 text-sm text-primary" role="status">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          {success}
        </p>
      )}
      {error && (
        <p className="mt-4 flex items-start gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </motion.section>
  );
}
