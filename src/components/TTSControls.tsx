import { Button } from "@/components/ui/button";
import { AudioLines, Pause, Play, Square } from "lucide-react";
import type { TTSStatus } from "@/hooks/useVoice";

interface Props {
  status: TTSStatus;
  active: boolean;
  onListen: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  className?: string;
  size?: "sm" | "xs";
}

export function TTSControls({ status, active, onListen, onPause, onResume, onStop, className = "", size = "sm" }: Props) {
  const h = size === "xs" ? "h-7" : "h-8";
  const ic = "w-3.5 h-3.5";
  const cls = `gap-1.5 ${h} text-xs font-medium bg-card/80 backdrop-blur-sm`;
  if (!active || status === "idle") {
    return (
      <div className={`flex gap-1.5 ${className}`}>
        <Button variant="outline" size="sm" className={cls} onClick={onListen} aria-label="Écouter">
          <AudioLines className={ic} /> Écouter
        </Button>
      </div>
    );
  }
  return (
    <div className={`flex gap-1.5 ${className}`}>
      {status === "speaking" ? (
        <Button variant="outline" size="sm" className={cls} onClick={onPause} aria-label="Pause">
          <Pause className={ic} /> Pause
        </Button>
      ) : (
        <Button variant="outline" size="sm" className={cls} onClick={onResume} aria-label="Reprendre">
          <Play className={ic} /> Reprendre
        </Button>
      )}
      <Button variant="outline" size="sm" className={cls} onClick={onStop} aria-label="Arrêter">
        <Square className={ic} /> Arrêter
      </Button>
    </div>
  );
}
