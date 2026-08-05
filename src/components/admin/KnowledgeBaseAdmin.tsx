import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

const label = (v: string) => CORPORA.find((c) => c.value === v)?.label ?? v;

interface DocRow {
  id: string;
  corpus: string;
  title: string;
  reference: string | null;
  created_at: string;
}

export function KnowledgeBaseAdmin() {
  const [rows, setRows] = useState<DocRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    corpus: "catechisme",
    title: "",
    reference: "",
    source_url: "",
    content: "",
  });

  const load = async () => {
    setLoading(true);
    const [{ data: recent }, { data: all }] = await Promise.all([
      (supabase as any)
        .from("rag_documents")
        .select("id,corpus,title,reference,created_at")
        .order("created_at", { ascending: false })
        .limit(25),
      (supabase as any).from("rag_documents").select("corpus"),
    ]);
    setRows((recent as DocRow[]) ?? []);
    const c: Record<string, number> = {};
    for (const r of (all as { corpus: string }[]) ?? []) c[r.corpus] = (c[r.corpus] ?? 0) + 1;
    setCounts(c);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setForm((f) => ({ ...f, content: text, title: f.title || file.name.replace(/\.[^.]+$/, "") }));
  };

  const ingest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return toast.error("Titre et texte obligatoires.");
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("rag-ingest", {
      body: {
        documents: [
          {
            corpus: form.corpus,
            title: form.title.trim(),
            reference: form.reference.trim() || undefined,
            source_url: form.source_url.trim() || undefined,
            content: form.content,
          },
        ],
      },
    });
    setSaving(false);
    const err = error?.message || (data as any)?.error;
    if (err) return toast.error(String(err));
    toast.success(`Indexé : ${(data as any)?.chunks ?? 0} fragments ajoutés.`);
    setForm({ ...form, title: "", reference: "", source_url: "", content: "" });
    load();
  };

  const remove = async (row: DocRow) => {
    const { error } = await (supabase as any).from("rag_documents").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" /> Base de connaissances vérifiée (RAG)
          </CardTitle>
          <CardDescription>
            Les textes indexés ici sont recherchés automatiquement à chaque consultation et transmis aux huit chaires
            comme sources primaires vérifiées. {total} fragments indexés.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {CORPORA.map((c) => (
              <Badge key={c.value} variant={counts[c.value] ? "default" : "secondary"}>
                {c.label} · {counts[c.value] ?? 0}
              </Badge>
            ))}
          </div>

          <form onSubmit={ingest} className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="kb-corpus">Corpus</Label>
              <Select value={form.corpus} onValueChange={(v) => setForm({ ...form, corpus: v })}>
                <SelectTrigger id="kb-corpus">
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
              <Label htmlFor="kb-title">Titre</Label>
              <Input
                id="kb-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="CEC — La foi (n° 142-165)"
                required
              />
            </div>
            <div>
              <Label htmlFor="kb-ref">Référence</Label>
              <Input
                id="kb-ref"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="CEC 142-165"
              />
            </div>
            <div>
              <Label htmlFor="kb-url">URL officielle</Label>
              <Input
                id="kb-url"
                type="url"
                value={form.source_url}
                onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                placeholder="https://www.vatican.va/..."
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="kb-content">Texte intégral</Label>
              <Textarea
                id="kb-content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={8}
                placeholder="Collez ici le texte authentique (il sera découpé et vectorisé automatiquement)…"
                required
              />
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
              <Input
                type="file"
                accept=".txt,.md,.json"
                className="max-w-xs"
                aria-label="Importer un fichier texte"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Indexer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Derniers fragments indexés</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">La base de connaissances est encore vide.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Corpus</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{label(r.corpus)}</TableCell>
                    <TableCell className="text-sm">{r.title}</TableCell>
                    <TableCell className="font-mono text-xs">{r.reference ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => remove(r)} aria-label="Supprimer">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
