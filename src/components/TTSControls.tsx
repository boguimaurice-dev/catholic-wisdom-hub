import { Button } from "@/components/ui/button";
import { AudioLines, Pause, Play, Square, Rewind, FastForward } from "lucide-react";
import type { TTSStatus } from "@/hooks/useVoice";

interface Props {
  status: TTSStatus;
  active: boolean;
  onListen: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSkip?: (delta: number) => void;
  progress?: { i: number; n: number };
  listenLabel?: string;
  className?: string;
  size?: "sm" | "xs";
}

export function TTSControls({ status, active, onListen, onPause, onResume, onStop, onSkip, progress, listenLabel = "Écouter", className = "", size = "sm" }: Props) {
  const h = size === "xs" ? "h-7" : "h-8";
  const ic = "w-3.5 h-3.5";
  const cls = `gap-1.5 ${h} text-xs font-medium bg-card/80 backdrop-blur-sm`;
  if (!active || status === "idle") {
    return (
      <div className={`flex gap-1.5 ${className}`}>
        <Button variant="outline" size="sm" className={cls} onClick={onListen} aria-label={listenLabel}>
          <AudioLines className={ic} /> {listenLabel}
        </Button>
      </div>
    );
  }
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {onSkip && (
        <Button variant="outline" size="sm" className={cls} onClick={() => onSkip(-2)} aria-label="Retour rapide">
          <Rewind className={ic} />
        </Button>
      )}
      {status === "speaking" ? (
        <Button variant="outline" size="sm" className={cls} onClick={onPause} aria-label="Pause">
          <Pause className={ic} /> Pause
        </Button>
      ) : (
        <Button variant="outline" size="sm" className={cls} onClick={onResume} aria-label="Reprendre">
          <Play className={ic} /> Reprendre
        </Button>
      )}
      {onSkip && (
        <Button variant="outline" size="sm" className={cls} onClick={() => onSkip(2)} aria-label="Avance rapide">
          <FastForward className={ic} />
        </Button>
      )}
      <Button variant="outline" size="sm" className={cls} onClick={onStop} aria-label="Arrêter">
        <Square className={ic} /> Arrêter
      </Button>
      {progress && progress.n > 0 && (
        <span className="text-xs text-muted-foreground tabular-nums">{Math.round(((progress.i + 1) / progress.n) * 100)} %</span>
      )}
    </div>
  );
}
