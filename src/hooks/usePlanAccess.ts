import { useSubscription } from "@/hooks/useSubscription";
import { useIsAdmin } from "@/hooks/useIsAdmin";

/** Experts accessibles au plan Basique (Bible & Catéchisme / doctrine de base) */
export const BASE_EXPERTS = ["bibliste", "theologien"];

export type PlanTier = "basique" | "premium" | "elite" | "admin";

export function usePlanAccess() {
  const { currentPlan, loading: subLoading, ...rest } = useSubscription();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const slug = (currentPlan?.slug || "basique") as "basique" | "premium" | "elite";
  const tier: PlanTier = isAdmin ? "admin" : slug;

  // L'administrateur dispose de toutes les fonctionnalités de tous les plans.
  const isBasique = !isAdmin && slug === "basique";
  const isEliteOrAbove = isAdmin || slug === "elite";
  const isPremiumOrAbove = isAdmin || slug === "premium" || slug === "elite";

  return {
    ...rest,
    currentPlan,
    loading: subLoading || adminLoading,
    isAdmin,
    tier,
    planSlug: slug,
    /** null = tous les experts autorisés */
    allowedExperts: isBasique ? BASE_EXPERTS : null,
    isExpertAllowed: (key: string) => !isBasique || BASE_EXPERTS.includes(key),
    canUseAllExperts: !isBasique,
    canUseVoice: isPremiumOrAbove,
    canExportPdf: isPremiumOrAbove,
    canExportAdvanced: isEliteOrAbove, // Markdown, BibTeX, RIS
    /** null = historique illimité */
    historyDays: isBasique ? 7 : null,
    unlimitedQuota: isAdmin,
    canConsult: () => (isAdmin ? true : rest.canConsult()),
    remainingConsultations: () => (isAdmin ? 9999 : rest.remainingConsultations()),
  };
}
