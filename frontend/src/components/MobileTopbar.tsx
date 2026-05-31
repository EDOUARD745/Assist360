"use client";

import { Menu } from "lucide-react";

export default function MobileTopbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card/90 backdrop-blur px-4 py-2.5">
      <button
        onClick={onOpenMenu}
        className="p-1.5 rounded-md hover:bg-muted text-foreground"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <img src="/logo-icon.png" alt="Assist360" className="h-8 w-8 object-contain" />
        <div className="font-semibold tracking-tight text-sm">Assist360</div>
      </div>
    </header>
  );
}
