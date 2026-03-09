import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Cross, Loader2, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Email de réinitialisation envoyé !");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
            <Cross className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-serif text-2xl text-primary font-bold">Mot de passe oublié</h1>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          {sent ? (
            <div className="text-center">
              <p className="text-foreground mb-4">Un email de réinitialisation a été envoyé à <strong>{email}</strong>.</p>
              <Link to="/auth">
                <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Retour</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="votre@email.com" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Envoyer le lien
              </Button>
              <div className="text-center">
                <Link to="/auth" className="text-sm text-accent hover:underline">Retour à la connexion</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
