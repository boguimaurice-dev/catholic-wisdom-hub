import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ResearchFilters {
  periods: string[];
  sources: string[];
}

export const PERIODS: Array<{ key: string; label: string }> = [
  { key: "antiquite", label: "Antiquité / Patristique" },
  { key: "moyen_age", label: "Moyen-Âge / Scolastique" },
  { key: "moderne", label: "Époque Moderne" },
  { key: "contemporain", label: "Contemporain" },
];

export const SOURCE_TYPES: Array<{ key: string; label: string }> = [
  { key: "magistere", label: "Magistère / Vatican" },
  { key: "ecriture", label: "Écriture Sainte" },
  { key: "tradition", label: "Tradition / Pères de l'Église" },
];

interface Props {
  filters: ResearchFilters;
  onChange: (filters: ResearchFilters) => void;
  compact?: boolean;
}


export function SearchFilters({ filters, onChange, compact }: Props) {
  const count = filters.periods.length + filters.sources.length;

  const toggle = (group: keyof ResearchFilters, key: string) => {
    const list = filters[group];
    onChange({
      ...filters,
      [group]: list.includes(key) ? list.filter((k) => k !== key) : [...list, key],
    });
  };

  const allLabels = [
    ...filters.periods.map((k) => PERIODS.find((p) => p.key === k)?.label).filter(Boolean),
    ...filters.sources.map((k) => SOURCE_TYPES.find((s) => s.key === k)?.label).filter(Boolean),
  ] as string[];

  return (
    <div className={compact ? "flex items-center" : "flex items-center gap-2 flex-wrap mb-2"}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={
              compact
                ? "relative h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-secondary hover:bg-secondary/10"
                : "gap-1.5 h-8 border border-secondary/40 hover:border-secondary hover:bg-secondary/10"
            }
            title="Filtres de recherche avancés"
            aria-label="Filtres de recherche avancés"
          >
            <Filter className="w-4 h-4 text-secondary" />
            {!compact && <span className="text-xs font-medium">Filtres</span>}
            {count > 0 && (
              <Badge
                variant="secondary"
                className={
                  compact
                    ? "absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[9px] justify-center"
                    : "ml-0.5 h-4 px-1.5 text-[10px]"
                }
              >
                {count}
              </Badge>
            )}
          </Button>

        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Période historique
            </p>
            <div className="space-y-2">
              {PERIODS.map((p) => (
                <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={filters.periods.includes(p.key)}
                    onCheckedChange={() => toggle("periods", p.key)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Type de source
            </p>
            <div className="space-y-2">
              {SOURCE_TYPES.map((s) => (
                <label key={s.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={filters.sources.includes(s.key)}
                    onCheckedChange={() => toggle("sources", s.key)}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
          {count > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => onChange({ periods: [], sources: [] })}
            >
              Réinitialiser les filtres
            </Button>
          )}
        </PopoverContent>
      </Popover>

      {allLabels.map((label) => (
        <Badge key={label} variant="outline" className="text-[10px] gap-1 border-secondary/40">
          {label}
        </Badge>
      ))}
      {count > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-muted-foreground"
          onClick={() => onChange({ periods: [], sources: [] })}
          title="Effacer les filtres"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}
