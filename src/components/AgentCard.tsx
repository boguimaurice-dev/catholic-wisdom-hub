import { motion } from "framer-motion";
import { Expert, EXPERTS_CONFIG } from "@/types/consultation";

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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        scale: isActive ? 1.05 : 1,
        boxShadow: isActive 
          ? "0 8px 30px rgba(139, 69, 19, 0.3)" 
          : "0 2px 10px rgba(0, 0, 0, 0.1)"
      }}
      transition={{ duration: 0.3 }}
      className={`
        relative p-3 sm:p-4 rounded-xl border-2 transition-all duration-300
        ${expert.color}
        ${isActive ? "ring-2 ring-amber-500 ring-offset-2" : ""}
        ${isConsulted ? "opacity-90" : ""}
      `}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-2xl sm:text-3xl">{expert.icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif font-bold text-sm sm:text-base truncate">{expert.name}</h3>
          <p className="text-xs sm:text-sm opacity-80 truncate">{expert.title}</p>
        </div>
      </div>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"
        />
      )}
      {isConsulted && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center"
        >
          <span className="text-white text-xs">✓</span>
        </motion.div>
      )}
    </motion.div>
  );
}

export function AgentsGrid({ 
  activeExperts = [], 
  consultedExperts = [] 
}: { 
  activeExperts?: string[];
  consultedExperts?: string[];
}) {
  const expertKeys = Object.keys(EXPERTS_CONFIG);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
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
