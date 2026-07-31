import { Feather } from "lucide-react";
import { toast } from "sonner";
import { addToScriptorium } from "@/hooks/useScriptorium";

interface QuillButtonProps {
  text: string;
  source?: string;
  className?: string;
  label?: string;
}

/** Petit bouton plume : envoie un extrait vers "Mon Scriptorium". */
export function QuillButton({ text, source, className = "", label }: QuillButtonProps) {
  if (!text?.trim()) return null;
  return (
    <button
      type="button"
      onClick={() => {
        addToScriptorium(text, source);
        toast.success("Ajouté à Mon Scriptorium");
      }}
      title="Ajouter à Mon Scriptorium"
      aria-label="Ajouter à Mon Scriptorium"
      className={`inline-flex items-center gap-1.5 rounded-full border border-secondary/40 bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary-foreground/90 transition-colors hover:bg-secondary/25 ${className}`}
    >
      <Feather className="h-3.5 w-3.5" />
      {label && <span>{label}</span>}
    </button>
  );
}
