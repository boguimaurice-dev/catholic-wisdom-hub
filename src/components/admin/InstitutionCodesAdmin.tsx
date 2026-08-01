import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, KeyRound, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CodeRow {
  id: string;
  code: string;
  institution_name: string;
  plan_id: string;
  max_users: number;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export function InstitutionCodesAdmin() {
  const [rows, setRows] = useState<CodeRow[]>([]);
  const [plans, setPlans] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: "", institution_name: "", max_users: 5 });

  const load = async () => {
    setLoading(true);
    const [{ data: codes }, { data: planData }] = await Promise.all([
      (supabase as any).from("institution_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("plans").select("id,name,slug").eq("is_active", true),
    ]);
    setRows((codes as CodeRow[]) ?? []);
    setPlans(planData ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const elite = plans.find((p) => p.slug === "elite") ?? plans[plans.length - 1];
    if (!elite) return toast.error("Aucun forfait disponible.");
    setSaving(true);
    const { error } = await (supabase as any).from("institution_codes").insert({
      code: form.code.trim().toUpperCase(),
      institution_name: form.institution_name.trim(),
      max_users: Number(form.max_users) || 1,
      plan_id: elite.id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Code créé");
    setForm({ code: "", institution_name: "", max_users: 5 });
    load();
  };

  const toggle = async (row: CodeRow) => {
    const { error } = await (supabase as any)
      .from("institution_codes")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (row: CodeRow) => {
    const { error } = await (supabase as any).from("institution_codes").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Code supprimé");
    load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" /> Nouveau code institutionnel
          </CardTitle>
          <CardDescription>
            Le code active automatiquement le forfait Élite pour chaque utilisateur, dans la limite de places définie.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-4 items-end">
            <div className="sm:col-span-1">
              <Label htmlFor="ic-code">Code</Label>
              <Input
                id="ic-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="SEMINAIRE-2026"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ic-name">Institution</Label>
              <Input
                id="ic-name"
                value={form.institution_name}
                onChange={(e) => setForm({ ...form, institution_name: e.target.value })}
                placeholder="Séminaire Saint-Paul"
                required
              />
            </div>
            <div>
              <Label htmlFor="ic-max">Places</Label>
              <div className="flex gap-2">
                <Input
                  id="ic-max"
                  type="number"
                  min={1}
                  max={1000}
                  value={form.max_users}
                  onChange={(e) => setForm({ ...form, max_users: Number(e.target.value) })}
                />
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Codes existants</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Aucun code pour le moment.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Utilisation</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell>{r.institution_name}</TableCell>
                    <TableCell>
                      {r.used_count} / {r.max_users}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.is_active ? "default" : "secondary"}>
                        {r.is_active ? "Actif" : "Désactivé"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => toggle(r)}>
                        {r.is_active ? "Désactiver" : "Activer"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(r)}>
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
