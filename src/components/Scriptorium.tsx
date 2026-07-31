import { useState } from "react";
import { Feather, X, Trash2, Copy, Download, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useScriptorium } from "@/hooks/useScriptorium";

function formatAll(notes: { text: string; source?: string; createdAt: number }[]) {
  return notes
    .map((n) => `${n.text}${n.source ? `\n— ${n.source}` : ""}`)
    .join("\n\n----------------\n\n");
}

/** Panneau latéral rétractable "Mon Scriptorium" (grands écrans). */
export function Scriptorium() {
  const { notes, open, toggle, remove, clear, update } = useScriptorium();
  const [editing, setEditing] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="hidden lg:flex fixed right-0 top-1/2 z-30 -translate-y-1/2 items-center gap-2 rounded-l-xl border border-r-0 border-secondary/40 bg-card px-3 py-4 shadow-lg hover:bg-accent"
        aria-label="Ouvrir Mon Scriptorium"
      >
        <PanelRightOpen className="h-4 w-4 text-secondary" />
        <span className="font-serif text-xs [writing-mode:vertical-rl] tracking-wider">Mon Scriptorium</span>
      </button>
    );
  }

  return (
    <aside className="hidden lg:flex fixed right-0 top-0 bottom-0 z-30 w-[360px] xl:w-[400px] flex-col border-l border-border bg-card/95 backdrop-blur-sm shadow-xl">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-primary px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-2">
          <Feather className="h-4 w-4 text-secondary" />
          <h2 className="font-serif text-lg tracking-wide">Mon Scriptorium</h2>
        </div>
        <button onClick={toggle} aria-label="Réduire le Scriptorium" className="rounded p-1 hover:bg-primary-foreground/10">
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Button
          size="sm"
          variant="secondary"
          className="text-xs"
          disabled={!notes.length}
          onClick={() => {
            navigator.clipboard.writeText(formatAll(notes));
            toast.success("Scriptorium copié");
          }}
        >
          <Copy className="mr-1 h-3 w-3" />Copier
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="text-xs"
          disabled={!notes.length}
          onClick={() => {
            const blob = new Blob([formatAll(notes)], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "mon-scriptorium.txt";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="mr-1 h-3 w-3" />TXT
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-xs text-destructive hover:text-destructive"
          disabled={!notes.length}
          onClick={() => clear()}
        >
          <Trash2 className="mr-1 h-3 w-3" />Vider
        </Button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {notes.length === 0 ? (
          <div className="mt-10 px-4 text-center text-sm text-muted-foreground">
            <Feather className="mx-auto mb-3 h-8 w-8 opacity-40" />
            Cliquez sur l'icône plume sous une réponse ou une citation pour la conserver ici.
            Vos notes restent enregistrées sur cet appareil.
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="group rounded-lg border border-border bg-background/60 p-3">
              {editing === note.id ? (
                <textarea
                  autoFocus
                  defaultValue={note.text}
                  onBlur={(e) => {
                    update(note.id, e.target.value);
                    setEditing(null);
                  }}
                  className="min-h-32 w-full resize-y rounded border border-border bg-card p-2 text-sm leading-relaxed"
                />
              ) : (
                <p
                  onClick={() => setEditing(note.id)}
                  className="cursor-text whitespace-pre-wrap text-sm leading-relaxed text-foreground"
                >
                  {note.text}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate text-[11px] italic text-muted-foreground">
                  {note.source || new Date(note.createdAt).toLocaleString("fr-FR")}
                </span>
                <button
                  onClick={() => remove(note.id)}
                  aria-label="Supprimer la note"
                  className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
