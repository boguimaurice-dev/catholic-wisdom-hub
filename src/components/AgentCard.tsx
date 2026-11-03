import { motion } from "framer-motion";
import { EXPERTS_CONFIG } from "@/types/consultation";
import { useLanguage } from "@/contexts/LanguageContext";

interface AgentCardProps {
  expertKey: string;
  isActive?: boolean;
  isConsulted?: boolean;
}

export function AgentCard({ expertKey, isActive, isConsulted }: AgentCardProps) {
  const expert = EXPERTS_CONFIG[expertKey];
  const { t } = useLanguage();
  if (!expert) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: isActive ? 1.02 : 1 }}
      transition={{ duration: 0.2 }}
      role="listitem"
      aria-label={`${t(`agents.${expertKey}`)} — ${t(`agentTitles.${expertKey}`)}${isActive ? `, ${t("agents.inProgress")}` : ""}${isConsulted ? `, ${t("agents.consulted")}` : ""}`}
      className={`
        relative flex min-h-[76px] min-w-[132px] snap-start items-center gap-2.5 rounded-xl border p-3 transition-all duration-300
        md:min-w-0 md:flex-col md:justify-center md:gap-1.5 md:p-3 md:text-center
        ${expert.color}
        ${isActive ? "ring-2 ring-offset-1 ring-secondary shadow-md" : "shadow-sm"}
        ${isConsulted && !isActive ? "opacity-90" : ""}
      `}
    >
      <span aria-hidden="true" className="shrink-0 text-2xl leading-none md:text-2xl">{expert.icon}</span>
      <div className="min-w-0">
        <h3 className="font-serif text-xs font-bold leading-snug md:text-sm">
          {t(`agents.${expertKey}`)}
        </h3>
        <p className="mt-0.5 text-xs leading-snug opacity-75 md:text-xs">{t(`agentTitles.${expertKey}`)}</p>
      </div>
      {isActive && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          aria-hidden="true"
          className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-green-600 animate-pulse"
        />
      )}
      {isConsulted && !isActive && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          aria-hidden="true"
          className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-700 text-[10px] font-bold text-white"
        >✓</motion.span>
      )}
    </motion.div>
  );
}

export function AgentsGrid({
  activeExperts = [],
  consultedExperts = [],
}: {
  activeExperts?: string[];
  consultedExperts?: string[];
}) {
  const expertKeys = Object.keys(EXPERTS_CONFIG);

  return (
    <div
      role="list"
      aria-label="Spécialités disponibles"
      className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-8"
    >
      {expertKeys.map((key) => (
        <AgentCard
          key={key}
          expertKey={key}
          isActive={activeExperts.includes(key)}
          isConsulted={consultedExperts.includes(key)}
        />
      ))}
    </div>
  );
}
