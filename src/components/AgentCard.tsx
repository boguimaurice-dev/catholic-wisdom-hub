import { forwardRef, useRef } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { EXPERTS_CONFIG } from "@/types/consultation";

interface AgentCardProps {
  expertKey: string;
  isActive?: boolean;
  isConsulted?: boolean;
  isSelected?: boolean;
  isDimmed?: boolean;
  isLocked?: boolean;
  tabIndex?: number;
  onSelect?: (key: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
}

export const AgentCard = forwardRef<HTMLButtonElement, AgentCardProps>(function AgentCard(
  { expertKey, isActive, isConsulted, isSelected, isDimmed, isLocked, tabIndex, onSelect, onKeyDown },
  ref,
) {
  const expert = EXPERTS_CONFIG[expertKey];
  if (!expert) return null;

  const statusLabel = isLocked
    ? "verrouillé, réservé aux plans Premium et Élite"
    : isSelected
    ? "sélectionné, consultation directe active"
    : isActive
      ? "en cours de consultation"
      : isConsulted
        ? "déjà consulté"
        : "non sélectionné";


  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={() => onSelect?.(expertKey)}
      onKeyDown={onKeyDown}
      tabIndex={tabIndex}
      aria-pressed={!!isSelected}
      aria-label={`${expert.name}, ${expert.title} — ${statusLabel}.${isLocked ? " Passez à un plan supérieur pour y accéder." : ` Entrée ou Espace pour ${isSelected ? "désactiver" : "activer"} la consultation directe.`}`}
      title={isLocked ? `${expert.name} — réservé aux plans Premium et Élite` : `${expert.name} — ${expert.title}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: isLocked ? 0.45 : isDimmed ? 0.5 : 1,
        scale: isSelected ? 1.05 : isActive ? 1.03 : 1,
      }}
      transition={{ duration: 0.25 }}
      className={`
        relative w-full text-left p-2.5 sm:p-3 rounded-lg border transition-all duration-300
        ${isLocked ? "cursor-not-allowed grayscale" : "cursor-pointer"} hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2
        ${expert.color}
        ${
          isSelected
            ? "ring-2 ring-secondary border-secondary shadow-[0_0_18px_hsl(var(--secondary)/0.55)]"
            : isActive
              ? "ring-2 ring-offset-1 ring-secondary shadow-md"
              : "shadow-sm"
        }
        ${isConsulted && !isActive && !isSelected ? "opacity-80" : ""}
      `}
    >
      <div className="flex flex-col items-center text-center gap-1">
        <span className="text-xl sm:text-2xl leading-none" aria-hidden="true">{expert.icon}</span>
        <div className="min-w-0 w-full">
          <h3 className="font-serif font-bold text-[10px] sm:text-xs leading-tight truncate">{expert.name}</h3>
          <p className="text-[9px] sm:text-[10px] opacity-70 truncate">{expert.title}</p>
        </div>
      </div>
      {isLocked && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-muted border border-border flex items-center justify-center"
        >
          <Lock className="w-2.5 h-2.5 text-muted-foreground" />
        </span>
      )}
      {isActive && (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"
        />
      )}
      {isConsulted && !isActive && (
        <motion.div
          aria-hidden="true"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-green-600 rounded-full flex items-center justify-center"
        >
          <span className="text-white text-[8px]">✓</span>
        </motion.div>
      )}
    </motion.button>
  );
});

export function AgentsGrid({
  activeExperts = [],
  consultedExperts = [],
  selectedExpert = null,
  lockedExperts = [],
  onSelectExpert,
  onLockedExpert,
}: {
  activeExperts?: string[];
  consultedExperts?: string[];
  selectedExpert?: string | null;
  lockedExperts?: string[];
  onSelectExpert?: (key: string) => void;
  onLockedExpert?: (key: string) => void;
}) {
  const expertKeys = Object.keys(EXPERTS_CONFIG);
  const itemsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const focusIndex = (i: number) => {
    const next = (i + expertKeys.length) % expertKeys.length;
    itemsRef.current[next]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        focusIndex(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        focusIndex(index - 1);
        break;
      case "Home":
        e.preventDefault();
        focusIndex(0);
        break;
      case "End":
        e.preventDefault();
        focusIndex(expertKeys.length - 1);
        break;
      case "Escape":
        if (selectedExpert) {
          e.preventDefault();
          onSelectExpert?.(selectedExpert);
        }
        break;
      default:
        break;
    }
  };

  const activeIndex = selectedExpert ? Math.max(0, expertKeys.indexOf(selectedExpert)) : 0;

  return (
    <div
      role="toolbar"
      aria-label="Sélection d'un expert pour une consultation directe (flèches pour naviguer, Échap pour désélectionner)"
      aria-orientation="horizontal"
      className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 sm:gap-2"
    >
      {expertKeys.map((key, index) => (
        <AgentCard
          key={key}
          ref={(el) => {
            itemsRef.current[index] = el;
          }}
          expertKey={key}
          tabIndex={index === activeIndex ? 0 : -1}
          isActive={activeExperts.includes(key)}
          isConsulted={consultedExperts.includes(key)}
          isSelected={selectedExpert === key}
          isDimmed={!!selectedExpert && selectedExpert !== key}
          isLocked={lockedExperts.includes(key)}
          onSelect={(k) => (lockedExperts.includes(k) ? onLockedExpert?.(k) : onSelectExpert?.(k))}
          onKeyDown={(e) => handleKeyDown(e, index)}
        />
      ))}
    </div>
  );
}

