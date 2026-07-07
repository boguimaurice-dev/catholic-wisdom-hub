import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Activity, ArrowLeft, BarChart3, Database, FileText, Loader2, RefreshCw,
  Shield, Users, CreditCard, TrendingUp, AlertTriangle, CheckCircle2, Server,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Metrics {
  generated_at: string;
  business: {
    totalUsers: number;
    newUsers24h: number;
    newUsers7d: number;
    newUsers30d: number;
    activeUsers7d: number;
    consultations: { total: number; last24h: number; last7d: number; last30d: number };
    activeSubscriptions: number;
    revenueByCurrency: Record<string, number>;
    subsByPlan: Record<string, number>;
    dailySeries: Record<string, number>;
  };
  users: Array<{
    id: string; email: string; created_at: string; last_sign_in_at: string | null;
    confirmed: boolean; provider?: string;
  }>;
  roles: Array<{ user_id: string; role: string }>;
  plans: any[];
  usageToday: Array<{ user_id: string; consultation_count: number }>;
  recent: {
    consultations: any[];
    subscriptions: any[];
  };
}

function StatCard({ icon: Icon, label, value, hint, tone = "default" }: {
  icon: any; label: string; value: string | number; hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClasses = {
    default: "text-primary",
    success: "text-green-600 dark:text-green-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-destructive",
  }[tone];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-2xl font-serif font-bold mt-1">{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
          </div>
          <Icon className={`h-5 w-5 shrink-0 ${toneClasses}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function MiniBarChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <div className="flex items-end gap-1 h-32">
      {entries.map(([day, v]) => (
        <div key={day} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-primary/70 rounded-t hover:bg-primary transition-colors"
            style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? 4 : 2 }}
            title={`${day}: ${v}`}
          />
          <span className="text-[9px] text-muted-foreground">{day.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export default function SuperAdmin() {
  const { user, session, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-metrics");
      if (error) throw error;
      setMetrics(data as Metrics);
    } catch (e: any) {
      toast.error("Impossible de charger les métriques : " + (e?.message || "erreur"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (isAdmin && !roleLoading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, roleLoading]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  const adminUserIds = useMemo(
    () => new Set((metrics?.roles || []).filter(r => r.role === "admin").map(r => r.user_id)),
    [metrics],
  );

  const filteredUsers = useMemo(() => {
    if (!metrics) return [];
    const q = userSearch.trim().toLowerCase();
    if (!q) return metrics.users;
    return metrics.users.filter(u => (u.email || "").toLowerCase().includes(q) || u.id.includes(q));
  }, [metrics, userSearch]);

  const healthChecks = useMemo(() => {
    if (!metrics) return [];
    return [
      {
        label: "Utilisateurs confirmés",
        ok: metrics.users.filter(u => u.confirmed).length === metrics.users.length,
        detail: `${metrics.users.filter(u => u.confirmed).length}/${metrics.users.length} confirmés`,
      },
      {
        label: "Abonnements actifs",
        ok: metrics.business.activeSubscriptions >= 0,
        detail: `${metrics.business.activeSubscriptions} actifs`,
      },
      {
        label: "Consultations 24h",
        ok: true,
        detail: `${metrics.business.consultations.last24h} dernières 24h`,
      },
      {
        label: "Nouveaux utilisateurs 7j",
        ok: metrics.business.newUsers7d >= 0,
        detail: `${metrics.business.newUsers7d} inscrits`,
      },
    ];
  }, [metrics]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" /> Accès refusé
            </CardTitle>
            <CardDescription>
              Cette zone est réservée aux administrateurs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/app"><ArrowLeft className="mr-2 h-4 w-4" /> Retour à l'application</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/app"><ArrowLeft className="h-4 w-4 mr-1" /> App</Link>
            </Button>
            <div>
              <h1 className="font-serif text-xl font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> SuperAdmin
              </h1>
              <p className="text-xs text-muted-foreground">
                {metrics && `Généré ${format(new Date(metrics.generated_at), "d MMM HH:mm:ss", { locale: fr })}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(v => !v)}
            >
              <Activity className="h-4 w-4 mr-1" />
              Auto {autoRefresh ? "ON" : "OFF"}
            </Button>
            <Button size="sm" onClick={load} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {loading && !metrics ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : metrics ? (
          <Tabs defaultValue="overview" className="w-full">
            <ScrollArea className="w-full">
              <TabsList className="mb-4 flex-nowrap">
                <TabsTrigger value="overview"><BarChart3 className="h-4 w-4 mr-1" />Vue d'ensemble</TabsTrigger>
                <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" />Utilisateurs</TabsTrigger>
                <TabsTrigger value="business"><TrendingUp className="h-4 w-4 mr-1" />Business</TabsTrigger>
                <TabsTrigger value="consultations"><FileText className="h-4 w-4 mr-1" />Consultations</TabsTrigger>
                <TabsTrigger value="subscriptions"><CreditCard className="h-4 w-4 mr-1" />Abonnements</TabsTrigger>
                <TabsTrigger value="security"><Shield className="h-4 w-4 mr-1" />Sécurité</TabsTrigger>
                <TabsTrigger value="performance"><Server className="h-4 w-4 mr-1" />Performance</TabsTrigger>
                <TabsTrigger value="database"><Database className="h-4 w-4 mr-1" />Base de données</TabsTrigger>
              </TabsList>
            </ScrollArea>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={Users} label="Utilisateurs" value={metrics.business.totalUsers} hint={`+${metrics.business.newUsers24h} 24h`} />
                <StatCard icon={Activity} label="Actifs 7j" value={metrics.business.activeUsers7d} tone="success" />
                <StatCard icon={FileText} label="Consultations" value={metrics.business.consultations.total} hint={`${metrics.business.consultations.last24h} aujourd'hui`} />
                <StatCard icon={CreditCard} label="Abonnements actifs" value={metrics.business.activeSubscriptions} tone="success" />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Consultations sur 14 jours</CardTitle>
                </CardHeader>
                <CardContent>
                  <MiniBarChart data={metrics.business.dailySeries} />
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Revenu mensuel estimé</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(metrics.business.revenueByCurrency).length === 0 && (
                      <p className="text-sm text-muted-foreground">Aucun revenu actif.</p>
                    )}
                    {Object.entries(metrics.business.revenueByCurrency).map(([cur, amt]) => (
                      <div key={cur} className="flex justify-between items-baseline">
                        <span className="text-sm text-muted-foreground">{cur}</span>
                        <span className="text-2xl font-serif font-bold">
                          {(amt / (cur === "USD" ? 100 : 1)).toLocaleString("fr-FR")} {cur}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Répartition par plan</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(metrics.business.subsByPlan).length === 0 && (
                      <p className="text-sm text-muted-foreground">Aucun abonné actif.</p>
                    )}
                    {Object.entries(metrics.business.subsByPlan).map(([name, count]) => (
                      <div key={name} className="flex justify-between">
                        <span className="text-sm">{name}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* USERS */}
            <TabsContent value="users" className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Rechercher par email ou ID…" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                <Badge variant="secondary" className="whitespace-nowrap self-center">
                  {filteredUsers.length} / {metrics.users.length}
                </Badge>
              </div>
              <Card>
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Inscription</TableHead>
                        <TableHead>Dernière connexion</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map(u => (
                        <TableRow key={u.id}>
                          <TableCell className="font-mono text-xs">
                            <div className="flex items-center gap-2">
                              {u.email || "—"}
                              {adminUserIds.has(u.id) && <Badge variant="default" className="text-[10px]">admin</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{u.created_at && format(new Date(u.created_at), "d MMM yy", { locale: fr })}</TableCell>
                          <TableCell className="text-xs">{u.last_sign_in_at ? format(new Date(u.last_sign_in_at), "d MMM HH:mm", { locale: fr }) : "—"}</TableCell>
                          <TableCell className="text-xs">{u.provider || "email"}</TableCell>
                          <TableCell>
                            {u.confirmed
                              ? <Badge variant="secondary">confirmé</Badge>
                              : <Badge variant="destructive">en attente</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>
            </TabsContent>

            {/* BUSINESS */}
            <TabsContent value="business" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={Users} label="Nouveaux 24h" value={metrics.business.newUsers24h} />
                <StatCard icon={Users} label="Nouveaux 7j" value={metrics.business.newUsers7d} />
                <StatCard icon={Users} label="Nouveaux 30j" value={metrics.business.newUsers30d} />
                <StatCard icon={Activity} label="Actifs 7j" value={metrics.business.activeUsers7d} tone="success" />
                <StatCard icon={FileText} label="Consult. 24h" value={metrics.business.consultations.last24h} />
                <StatCard icon={FileText} label="Consult. 7j" value={metrics.business.consultations.last7d} />
                <StatCard icon={FileText} label="Consult. 30j" value={metrics.business.consultations.last30d} />
                <StatCard icon={FileText} label="Total" value={metrics.business.consultations.total} tone="success" />
              </div>
              <Card>
                <CardHeader><CardTitle className="text-base">Usage aujourd'hui</CardTitle></CardHeader>
                <CardContent>
                  {metrics.usageToday.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune activité aujourd'hui.</p>
                  ) : (
                    <div className="text-sm space-y-1">
                      <p>{metrics.usageToday.length} utilisateur(s) actif(s)</p>
                      <p className="text-muted-foreground">
                        Total consultations : {metrics.usageToday.reduce((s, u) => s + u.consultation_count, 0)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* CONSULTATIONS (logs) */}
            <TabsContent value="consultations">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Log des 20 dernières consultations</CardTitle>
                  <CardDescription>Événements applicatifs en temps quasi-réel</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-2">
                      {metrics.recent.consultations.map((c: any) => (
                        <div key={c.id} className="border rounded-md p-3 text-sm">
                          <div className="flex justify-between items-start gap-2">
                            <p className="font-medium line-clamp-2">{c.question}</p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(c.created_at), "d MMM HH:mm", { locale: fr })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 font-mono">user: {c.user_id.slice(0, 8)}…</p>
                          {Array.isArray(c.selected_experts) && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {c.selected_experts.map((e: any, i: number) => (
                                <Badge key={i} variant="outline" className="text-[10px]">
                                  {typeof e === "string" ? e : e.name || e.id || "expert"}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SUBSCRIPTIONS */}
            <TabsContent value="subscriptions">
              <Card>
                <CardHeader><CardTitle className="text-base">20 derniers abonnements</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plan</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Utilisateur</TableHead>
                          <TableHead>Période</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics.recent.subscriptions.map((s: any) => (
                          <TableRow key={s.id}>
                            <TableCell>{s.plans?.name || "—"}</TableCell>
                            <TableCell>
                              <Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{s.user_id.slice(0, 8)}…</TableCell>
                            <TableCell className="text-xs">
                              {format(new Date(s.current_period_start), "d MMM", { locale: fr })} →{" "}
                              {format(new Date(s.current_period_end), "d MMM yy", { locale: fr })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SECURITY */}
            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Health checks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {healthChecks.map((h, i) => (
                    <div key={i} className="flex items-center justify-between border-b last:border-0 py-2">
                      <div className="flex items-center gap-2">
                        {h.ok
                          ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                          : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                        <span className="text-sm">{h.label}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{h.detail}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Administrateurs</CardTitle>
                  <CardDescription>Comptes ayant un accès total</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                  {metrics.users.filter(u => adminUserIds.has(u.id)).map(u => (
                    <div key={u.id} className="flex items-center justify-between text-sm border-b last:border-0 py-2">
                      <span className="font-mono">{u.email}</span>
                      <Badge>admin</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recommandations</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <p>• Vérifiez que la protection HIBP est activée sur les mots de passe.</p>
                  <p>• Assurez-vous que les webhooks Paystack sont signés (déjà en place).</p>
                  <p>• Le rôle admin est vérifié via <code className="text-xs">has_role()</code> côté serveur.</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PERFORMANCE */}
            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Charge applicative</CardTitle>
                  <CardDescription>Estimation basée sur les consultations récentes</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <StatCard icon={Activity} label="Consult / jour (moy 7j)" value={Math.round(metrics.business.consultations.last7d / 7)} />
                  <StatCard icon={Activity} label="Consult / jour (moy 30j)" value={Math.round(metrics.business.consultations.last30d / 30)} />
                  <StatCard icon={Activity} label="Pic 14j"
                    value={Math.max(...Object.values(metrics.business.dailySeries))} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Edge Functions actives</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {["catholic-orchestrator", "chatbot", "liturgy-meditation", "paystack-initialize", "paystack-charge-momo", "paystack-verify", "paystack-webhook", "paystack-donate", "paystack-sync-subscription", "admin-metrics"].map(f => (
                    <div key={f} className="flex justify-between border-b last:border-0 py-1.5">
                      <span className="font-mono text-xs">{f}</span>
                      <Badge variant="secondary" className="text-[10px]">déployée</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* DATABASE */}
            <TabsContent value="database" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={Database} label="profiles" value={metrics.business.totalUsers} />
                <StatCard icon={Database} label="consultations" value={metrics.business.consultations.total} />
                <StatCard icon={Database} label="user_subscriptions" value={metrics.business.activeSubscriptions} hint="actifs" />
                <StatCard icon={Database} label="plans" value={metrics.plans.length} />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Plans configurés</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead>Devise</TableHead>
                        <TableHead>Max/jour</TableHead>
                        <TableHead>Actif</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.plans.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>{p.price_amount}</TableCell>
                          <TableCell>{p.currency}</TableCell>
                          <TableCell>{p.max_consultations_per_day}</TableCell>
                          <TableCell>
                            {p.is_active
                              ? <Badge variant="secondary">actif</Badge>
                              : <Badge variant="outline">désactivé</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : null}
      </main>
    </div>
  );
}
