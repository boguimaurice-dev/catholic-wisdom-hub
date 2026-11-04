import { motion } from "framer-motion";
import { EXPERTS_CONFIG } from "@/types/consultation";

interface AgentCardProps {
  expertKey: string;
  isActive?: boolean;
  isConsulted?: boolean;
}

export function AgentCard({ expertKey, isActive, isConsulted }: AgentCardProps) {
  const expert = EXPERTS_CONFIG[expertKey];
  if (!expert) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{
        opacity: 1,
        scale: isActive ? 1.015 : 1,
      }}
      transition={{ duration: 0.2 }}
      role="listitem"
      className={`
        relative min-h-[84px] min-w-0 p-2.5 sm:p-3 rounded-xl border border-opacity-80 transition-all duration-200
        ${expert.color}
        ${isActive ? "ring-1 ring-offset-2 ring-secondary/80 shadow-sm" : "shadow-none hover:shadow-sm"}
        ${isConsulted && !isActive ? "opacity-90" : ""}
      `}
    >
      <div className="flex flex-col items-center text-center gap-1">
        <span className="text-xl sm:text-2xl leading-none">{expert.icon}</span>
        <div className="min-w-0 w-full">
          <h3 className="break-words font-serif font-semibold text-[13px] leading-snug">{expert.name}</h3>
          <p className="mt-0.5 break-words text-xs leading-snug opacity-75">{expert.title}</p>
        </div>
      </div>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500/90 rounded-full ring-2 ring-card"
        />
      )}
      {isConsulted && !isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 rounded-full ring-2 ring-card flex items-center justify-center"
        >
          <span className="text-white text-[8px]">✓</span>
        </motion.div>
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
    <div role="list" aria-label="Spécialités disponibles" className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5 lg:grid-cols-8">
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
