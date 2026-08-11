import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FolderUp, CheckCircle2, XCircle, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { extractFile, splitForUpload } from "@/lib/ragImport";

const CORPORA = [
  { value: "ecriture", label: "Écriture Sainte" },
  { value: "catechisme", label: "Catéchisme de l'Église catholique" },
  { value: "magistere", label: "Magistère (conciles, encycliques)" },
  { value: "peres_docteurs", label: "Pères et Docteurs de l'Église" },
  { value: "liturgie", label: "Liturgie (missel, rituels, heures)" },
  { value: "droit_canon", label: "Droit canonique" },
  { value: "lexiques", label: "Lexiques grec / hébreu" },
  { value: "histoire", label: "Histoire de l'Église" },
];

type Status = "pending" | "extracting" | "indexing" | "done" | "error";

interface Item {
  file: File;
  status: Status;
  chunks?: number;
  error?: string;
}

export function KnowledgeBulkImport({ onDone }: { onDone?: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [corpus, setCorpus] = useState("catechisme");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = Array.from(list).map((file) => ({ file, status: "pending" as Status }));
    setItems((prev) => [...prev, ...next]);
  };

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const update = (index: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const run = async () => {
    if (!items.length) return;
    setRunning(true);
    setProgress(0);
    let ok = 0;
    let failed = 0;

    for (let i = 0; i < items.length; i++) {
      if (items[i].status === "done") {
        setProgress(Math.round(((i + 1) / items.length) * 100));
        continue;
      }
      try {
        update(i, { status: "extracting", error: undefined });
        const doc = await extractFile(items[i].file);

        update(i, { status: "indexing" });
        const slices = splitForUpload(doc.content);
        let chunks = 0;

        for (let s = 0; s < slices.length; s++) {
          const { data, error } = await supabase.functions.invoke("rag-ingest", {
            body: {
              documents: [
                {
                  corpus,
                  title: slices.length > 1 ? `${doc.title} — partie ${s + 1}/${slices.length}` : doc.title,
                  reference: doc.reference,
                  content: slices[s],
                },
              ],
            },
          });
          const err = error?.message || (data as { error?: string } | null)?.error;
          if (err) throw new Error(String(err));
          chunks += (data as { chunks?: number })?.chunks ?? 0;
        }

        update(i, { status: "done", chunks });
        ok++;
      } catch (e) {
        update(i, { status: "error", error: e instanceof Error ? e.message : "Échec de l'import." });
        failed++;
      }
      setProgress(Math.round(((i + 1) / items.length) * 100));
    }

    setRunning(false);
    if (ok) toast.success(`${ok} document(s) indexé(s).`);
    if (failed) toast.error(`${failed} document(s) en échec.`);
    onDone?.();
  };

  const icon = (it: Item) => {
    if (it.status === "done") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    if (it.status === "error") return <XCircle className="h-4 w-4 text-destructive" />;
    if (it.status === "extracting" || it.status === "indexing")
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  const statusText = (it: Item) => {
    switch (it.status) {
      case "extracting":
        return "Extraction du texte…";
      case "indexing":
        return "Vectorisation…";
      case "done":
        return `${it.chunks ?? 0} fragments indexés`;
      case "error":
        return it.error ?? "Erreur";
      default:
        return `${(it.file.size / 1024).toFixed(0)} Ko`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderUp className="h-4 w-4" /> Import en masse (PDF, TXT, MD, JSON)
        </CardTitle>
        <CardDescription>
          Sélectionnez plusieurs fichiers : le texte est extrait dans le navigateur (nettoyage des en-têtes, pieds de
          page et mots coupés), puis découpé et vectorisé. Les PDF scannés sans couche texte ne peuvent pas être
          indexés.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="bulk-corpus">Corpus de destination</Label>
            <Select value={corpus} onValueChange={setCorpus} disabled={running}>
              <SelectTrigger id="bulk-corpus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CORPORA.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="bulk-files">Fichiers</Label>
            <Input
              id="bulk-files"
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.md,.json"
              disabled={running}
              onChange={(e) => {
                addFiles(e.target.files);
                if (inputRef.current) inputRef.current.value = "";
              }}
            />
          </div>
        </div>

        {items.length > 0 && (
          <ul className="divide-y rounded-md border">
            {items.map((it, i) => (
              <li key={`${it.file.name}-${i}`} className="flex items-center gap-3 px-3 py-2">
                {icon(it)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{it.file.name}</p>
                  <p
                    className={`truncate text-xs ${it.status === "error" ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {statusText(it)}
                  </p>
                </div>
                {!running && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeItem(i)}
                    aria-label={`Retirer ${it.file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {running && <Progress value={progress} aria-label="Progression de l'import" />}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={run} disabled={running || !items.length}>
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderUp className="mr-2 h-4 w-4" />}
            Indexer {items.length ? `(${items.length})` : ""}
          </Button>
          {!running && items.length > 0 && (
            <Button variant="ghost" onClick={() => setItems([])}>
              Vider la liste
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
