import { useState, type ReactNode } from "react";
import { Heart, Loader2, Smartphone, Landmark, ExternalLink, Copy, Check } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const copy: Record<Language, Record<string, string>> = {
  fr: {
    title: "Faire un don",
    subtitle: "Soutenez l'Assistant Recherche Catholique et le Monastère Sainte Marie de Bouaké.",
    impact:
      "Chaque contribution, même minime, permet de maintenir les 3 consultations quotidiennes gratuites pour tous et de financer les serveurs des 8 experts IA.",
    chooseAmount: "Choisissez un montant",
    custom: "Autre montant (XOF)",
    momoTitle: "Mobile Money (zone XOF)",
    momoDesc: "Payez en quelques secondes depuis votre téléphone : validez la notification reçue de votre opérateur.",
    transferTitle: "Virement bancaire",
    transferDesc: "Vous préférez un virement ? Utilisez les coordonnées ci-dessous.",
    donate: "Donner par Mobile Money / Carte",
    fullPage: "Voir toutes les options de don",
    copied: "Copié",
    secure: "Paiement sécurisé par Paystack",
    min: "Montant minimum : 100 XOF",
  },
  en: {
    title: "Make a donation",
    subtitle: "Support the Catholic Research Assistant and the Monastery of Saint Mary of Bouaké.",
    impact:
      "Every contribution, however small, helps keep the 3 free daily consultations available to all and funds the servers of the 8 AI experts.",
    chooseAmount: "Choose an amount",
    custom: "Other amount (XOF)",
    momoTitle: "Mobile Money (XOF zone)",
    momoDesc: "Pay in seconds from your phone: approve the notification sent by your operator.",
    transferTitle: "Bank transfer",
    transferDesc: "Prefer a transfer? Use the details below.",
    donate: "Give with Mobile Money / Card",
    fullPage: "See all donation options",
    copied: "Copied",
    secure: "Secure payment by Paystack",
    min: "Minimum amount: 100 XOF",
  },
  es: {
    title: "Hacer una donación",
    subtitle: "Apoye el Asistente de Investigación Católica y el Monasterio Santa María de Bouaké.",
    impact:
      "Cada contribución, por pequeña que sea, permite mantener las 3 consultas diarias gratuitas para todos y financiar los servidores de los 8 expertos de IA.",
    chooseAmount: "Elija un importe",
    custom: "Otro importe (XOF)",
    momoTitle: "Mobile Money (zona XOF)",
    momoDesc: "Pague en segundos desde su teléfono: confirme la notificación de su operador.",
    transferTitle: "Transferencia bancaria",
    transferDesc: "¿Prefiere una transferencia? Utilice los datos siguientes.",
    donate: "Donar con Mobile Money / Tarjeta",
    fullPage: "Ver todas las opciones de donación",
    copied: "Copiado",
    secure: "Pago seguro con Paystack",
    min: "Importe mínimo: 100 XOF",
  },
  pt: {
    title: "Fazer um donativo",
    subtitle: "Apoie o Assistente de Pesquisa Católica e o Mosteiro Santa Maria de Bouaké.",
    impact:
      "Cada contribuição, mesmo pequena, permite manter as 3 consultas diárias gratuitas para todos e financiar os servidores dos 8 especialistas de IA.",
    chooseAmount: "Escolha um valor",
    custom: "Outro valor (XOF)",
    momoTitle: "Mobile Money (zona XOF)",
    momoDesc: "Pague em segundos pelo telemóvel: confirme a notificação do seu operador.",
    transferTitle: "Transferência bancária",
    transferDesc: "Prefere transferência? Utilize os dados abaixo.",
    donate: "Doar com Mobile Money / Cartão",
    fullPage: "Ver todas as opções de donativo",
    copied: "Copiado",
    secure: "Pagamento seguro via Paystack",
    min: "Valor mínimo: 100 XOF",
  },
};

const AMOUNTS = [500, 1000, 2000, 5000, 10000];

const OPERATORS = [
  { name: "Wave", color: "bg-[#1DC1FA]/15 text-[#0a7ea4] dark:text-[#5cd0f7]" },
  { name: "Orange Money", color: "bg-[#FF7900]/15 text-[#b35500] dark:text-[#ffa14d]" },
  { name: "MTN MoMo", color: "bg-[#FFCC00]/20 text-[#8a6d00] dark:text-[#ffdd55]" },
  { name: "Moov Money", color: "bg-[#00A0E3]/15 text-[#00648f] dark:text-[#5bc4f0]" },
];

const TRANSFER_DETAILS = "Monastère Sainte Marie de Bouaké — benedictinsbouake.com";

export function DonationDialog({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const c = copy[language] ?? copy.fr;
  const [amount, setAmount] = useState<number | null>(1000);
  const [customAmount, setCustomAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const finalAmount = amount ?? (customAmount ? parseInt(customAmount, 10) : 0);

  const handleDonate = async () => {
    if (!finalAmount || finalAmount < 100) {
      toast.error(c.min);
      return;
    }
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-donate", {
        body: {
          amount: finalAmount,
          currency: "XOF",
          callbackUrl: `${window.location.origin}/donation`,
        },
      });
      if (error) throw error;
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error(data?.error || "Error");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(TRANSFER_DETAILS);
    setCopied(true);
    toast.success(c.copied);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <Heart className="h-5 w-5 text-accent" />
            {c.title}
          </DialogTitle>
          <DialogDescription>{c.subtitle}</DialogDescription>
        </DialogHeader>

        <p className="text-sm leading-relaxed rounded-lg border border-accent/30 bg-accent/5 p-3 text-foreground">
          {c.impact}
        </p>

        <div>
          <p className="text-sm font-medium mb-2">{c.chooseAmount}</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {AMOUNTS.map((a) => (
              <Button
                key={a}
                size="sm"
                variant={amount === a ? "default" : "outline"}
                onClick={() => {
                  setAmount(a);
                  setCustomAmount("");
                }}
              >
                {a.toLocaleString("fr-FR")}
              </Button>
            ))}
          </div>
          <Input
            type="number"
            min={100}
            className="mt-3"
            placeholder={c.custom}
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              setAmount(null);
            }}
          />
        </div>

        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-accent" />
            {c.momoTitle}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{c.momoDesc}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {OPERATORS.map((op) => (
              <span
                key={op.name}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${op.color}`}
              >
                {op.name}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border p-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <Landmark className="h-4 w-4 text-accent" />
            {c.transferTitle}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{c.transferDesc}</p>
          <div className="flex items-center gap-2 mt-2">
            <Input readOnly value={TRANSFER_DETAILS} className="text-xs" />
            <Button size="icon" variant="outline" onClick={handleCopy} aria-label={c.copied}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Button onClick={handleDonate} disabled={processing || !finalAmount} className="w-full">
          {processing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Heart className="h-4 w-4 mr-2" />
              {c.donate}
              {finalAmount ? ` — ${finalAmount.toLocaleString("fr-FR")} XOF` : ""}
            </>
          )}
        </Button>

        <div className="text-center">
          <Link
            to="/donation"
            className="text-xs text-muted-foreground hover:text-foreground underline inline-flex items-center gap-1"
          >
            {c.fullPage}
            <ExternalLink className="h-3 w-3" />
          </Link>
          <p className="text-[11px] text-muted-foreground/70 mt-2">{c.secure}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
