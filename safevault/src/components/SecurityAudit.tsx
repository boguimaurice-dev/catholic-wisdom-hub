import { useMemo } from "react";
import { useVault } from "../context/VaultContext";
import { estimateStrength } from "../lib/crypto";
import type { VaultItem } from "../lib/types";
import { AlertTriangle, Check, Clock, Pencil, ShieldCheck, Star } from "./icons";
import { Badge, Button, EmptyState } from "./ui";

interface Issue {
  item: VaultItem;
  reasons: string[];
}

const YEAR = 365 * 86_400_000;

export function SecurityAudit({ onOpenItem }: { onOpenItem: (item: VaultItem) => void }) {
  const { items } = useVault();

  const report = useMemo(() => {
    const logins = items.filter((item) => item.type === "login");
    const weak = logins.filter((item) => estimateStrength(item.secret).score <= 1);

    const groups = new Map<string, VaultItem[]>();
    items
      .filter((item) => item.type !== "note" && item.secret)
      .forEach((item) => {
        const list = groups.get(item.secret) ?? [];
        list.push(item);
        groups.set(item.secret, list);
      });
    const reusedGroups = [...groups.values()].filter((group) => group.length > 1);
    const stale = logins.filter((item) => Date.now() - item.secretUpdatedAt > YEAR);

    const issues = new Map<string, Issue>();
    const add = (item: VaultItem, reason: string) => {
      const current = issues.get(item.id) ?? { item, reasons: [] };
      if (!current.reasons.includes(reason)) current.reasons.push(reason);
      issues.set(item.id, current);
    };

    weak.forEach((item) => add(item, "Mot de passe faible"));
    reusedGroups.forEach((group) =>
      group.forEach((item) =>
        add(item, `Réutilisé sur ${group.length} éléments`),
      ),
    );
    stale.forEach((item) => add(item, "Secret inchangé depuis plus d'un an"));

    let score = 100;
    score -= Math.min(48, weak.length * 14);
    score -= Math.min(32, reusedGroups.length * 10);
    score -= Math.min(16, stale.length * 4);
    if (items.length === 0) score = 0;
    score = Math.max(0, Math.min(100, score));

    return {
      total: items.length,
      weak,
      reusedGroups,
      stale,
      issues: [...issues.values()].sort((a, b) => b.reasons.length - a.reasons.length),
      score,
    };
  }, [items]);

  const grade =
    report.total === 0
      ? { label: "Coffre vide", tone: "neutral" as const }
      : report.score >= 90
        ? { label: "Excellent", tone: "accent" as const }
        : report.score >= 70
          ? { label: "Correct", tone: "accent" as const }
          : report.score >= 45
            ? { label: "À améliorer", tone: "gold" as const }
            : { label: "À risque", tone: "danger" as const };

  const circumference = 2 * Math.PI * 52;

  return (
    <div className="panel">
      <header className="panel__head">
        <div>
          <span className="eyebrow">Sécurité</span>
          <h2>Audit du coffre</h2>
          <p className="muted">Analyse locale — aucun secret n'est envoyé nulle part.</p>
        </div>
        <Badge tone={grade.tone}>{grade.label}</Badge>
      </header>

      <div className="audit-hero">
        <div className="audit-ring">
          <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
            <circle cx="60" cy="60" r="52" className="audit-ring__track" />
            <circle
              cx="60"
              cy="60"
              r="52"
              className={`audit-ring__value audit-ring__value--${grade.tone}`}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - report.score / 100)}
            />
          </svg>
          <div className="audit-ring__center">
            <strong>{report.score}</strong>
            <span>/100</span>
          </div>
        </div>
        <div className="audit-hero__text">
          <h3>Indice de sécurité</h3>
          <p className="muted">
            Calculé à partir des mots de passe faibles, des secrets réutilisés et de leur ancienneté.
          </p>
          <div className="audit-stats">
            <div className="stat">
              <strong>{report.total}</strong>
              <span>Secrets</span>
            </div>
            <div className="stat">
              <strong>{report.weak.length}</strong>
              <span>Faibles</span>
            </div>
            <div className="stat">
              <strong>{report.reusedGroups.length}</strong>
              <span>Réutilisés</span>
            </div>
            <div className="stat">
              <strong>{report.stale.length}</strong>
              <span>Anciens</span>
            </div>
          </div>
        </div>
      </div>

      {report.total === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={26} />}
          title="Rien à auditer pour le moment"
          description="Ajoutez vos premiers secrets : Coffre vous signalera les mots de passe faibles ou réutilisés."
        />
      ) : report.issues.length === 0 ? (
        <div className="callout callout--success">
          <Check size={18} />
          <div>
            <strong>Aucun problème détecté.</strong>
            <p>Tous vos secrets sont uniques et récents. Pensez à renouveler vos mots de passe chaque année.</p>
          </div>
        </div>
      ) : (
        <section className="audit-issues">
          <h3>Points à corriger</h3>
          <ul>
            {report.issues.map((issue) => (
              <li key={issue.item.id} className="issue-row">
                <span className="issue-row__icon">
                  <AlertTriangle size={17} />
                </span>
                <span className="issue-row__text">
                  <strong>{issue.item.title}</strong>
                  <span className="issue-row__reasons">
                    {issue.reasons.map((reason) => (
                      <em key={reason}>{reason}</em>
                    ))}
                  </span>
                </span>
                <Button
                  variant="soft"
                  size="sm"
                  icon={<Pencil size={15} />}
                  onClick={() => onOpenItem(issue.item)}
                >
                  Corriger
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="audit-tips">
        <div>
          <Star size={18} />
          <div>
            <strong>Un secret unique par service</strong>
            <p className="muted small">
              Si un site est compromis, les autres comptes restent protégés.
            </p>
          </div>
        </div>
        <div>
          <Clock size={18} />
          <div>
            <strong>Renouvelez les accès sensibles</strong>
            <p className="muted small">Banque, email principal, hébergeur : au moins une fois par an.</p>
          </div>
        </div>
        <div>
          <ShieldCheck size={18} />
          <div>
            <strong>Exportez une sauvegarde</strong>
            <p className="muted small">
              Un fichier chiffré vous permet de restaurer le coffre sur un autre appareil.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
