import { GraduationCap, Users, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ConsultationLevel } from "@/services/orchestrator";

export const LEVELS: Array<{
  key: ConsultationLevel;
  label: string;
  description: string;
  icon: typeof Users;
}> = [
  {
    key: "grand_public",
    label: "Grand Public / Catéchèse",
    description: "Réponse simple et accessible, vocabulaire courant",
    icon: Users,
  },
  {
    key: "catechiste",
    label: "Pastoral & Homilétique",
    description: "Pédagogique et pastoral, cite le Catéchisme et les Écritures",
    icon: BookOpen,
  },
  {
    key: "universitaire",
    label: "Universitaire & Sources primaires",
    description: "Théologique et académique, sources primaires",
    icon: GraduationCap,
  },
];


interface Props {
  level: ConsultationLevel;
  onChange: (level: ConsultationLevel) => void;
  compact?: boolean;
}

export function LevelSelector({ level, onChange, compact }: Props) {
  const current = LEVELS.find((l) => l.key === level) ?? LEVELS[0];
  const Icon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-secondary/40 hover:border-secondary hover:bg-secondary/10"
          title="Niveau de la réponse"
        >
          <Icon className="w-4 h-4 text-secondary" />
          <span className={compact ? "hidden sm:inline text-xs font-medium" : "text-xs font-medium"}>
            {current.label}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Niveau de la réponse</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LEVELS.map((l) => {
          const LIcon = l.icon;
          return (
            <DropdownMenuItem
              key={l.key}
              onClick={() => onChange(l.key)}
              className={`flex flex-col items-start gap-0.5 py-2 ${
                level === l.key ? "bg-accent" : ""
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                <LIcon className="w-4 h-4 text-secondary" />
                {l.label}
              </div>
              <span className="text-xs text-muted-foreground pl-6">{l.description}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
