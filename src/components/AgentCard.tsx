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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: isActive ? 1.03 : 1,
      }}
      transition={{ duration: 0.25 }}
      className={`
        relative p-2.5 sm:p-3 rounded-lg border transition-all duration-300
        ${expert.color}
        ${isActive ? "ring-2 ring-offset-1 ring-secondary shadow-md" : "shadow-sm"}
        ${isConsulted && !isActive ? "opacity-80" : ""}
      `}
    >
      <div className="flex flex-col items-center text-center gap-1">
        <span className="text-xl sm:text-2xl leading-none">{expert.icon}</span>
        <div className="min-w-0 w-full">
          <h3 className="font-serif font-bold text-[10px] sm:text-xs leading-tight truncate">{expert.name}</h3>
          <p className="text-[9px] sm:text-[10px] opacity-70 truncate">{expert.title}</p>
        </div>
      </div>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"
        />
      )}
      {isConsulted && !isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-green-600 rounded-full flex items-center justify-center"
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
    <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 sm:gap-2">
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
