import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="text-primary-foreground hover:bg-primary-foreground/10 gap-1.5"
      title={theme === "dark" ? "Quitter le Mode Monastique" : "Activer le Mode Monastique"}
      aria-label={theme === "dark" ? "Quitter le Mode Monastique" : "Activer le Mode Monastique"}
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      <span className="hidden lg:inline text-xs">Mode Monastique</span>
    </Button>
  );
}
