"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { applyTheme, getInitialTheme, storeTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export default function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const t = getInitialTheme();
    setTheme(t);
    applyTheme(t);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    storeTheme(next);
  }

  return (
    <button
      onClick={toggle}
      type="button"
      title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      aria-label="Basculer le thème"
      className={cn(
        "relative h-7 w-12 rounded-full ring-1 ring-border bg-muted hover:bg-card-soft transition-colors",
        className,
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 grid place-items-center h-6 w-6 rounded-full bg-card shadow ring-1 ring-border transition-all duration-300",
          theme === "dark" ? "left-[22px] text-brand" : "left-0.5 text-amber-500",
        )}
      >
        {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}

// Script injecté avant l'hydratation pour éviter le flash light→dark
// (à inclure dans le <head> ou en tout début de body)
export const THEME_INIT_SCRIPT = `
  (function() {
    try {
      var stored = localStorage.getItem('assist360_theme');
      var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      if (theme === 'dark') document.documentElement.classList.add('dark');
    } catch (e) {}
  })();
`;
