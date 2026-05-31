"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Inbox, LayoutDashboard, Settings, BookOpen, LogOut, BarChart3, X } from "lucide-react";
import { clearSession, getSession } from "@/lib/auth";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard, match: (p: string) => p === "/" },
  { href: "/", label: "Mes tickets", icon: Inbox, badge: 12, match: (p: string) => p.startsWith("/tickets") },
  { href: "/performances", label: "Performances", icon: BarChart3, match: (p: string) => p.startsWith("/performances") },
  { href: "/base-de-connaissances", label: "Base de connaissances", icon: BookOpen, match: (p: string) => p.startsWith("/base-de-connaissances") },
  { href: "/parametres", label: "Paramètres", icon: Settings, match: (p: string) => p.startsWith("/parametres") },
];

export default function Sidebar({
  mobileOpen = false,
  onMobileClose,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [name, setName] = useState("Marie Lefèvre");
  const [role, setRole] = useState("Conseillère N2");

  useEffect(() => {
    const s = getSession();
    if (s) {
      setName(s.name);
      setRole(s.role);
    }
  }, []);

  function logout() {
    clearSession();
    router.replace("/login");
  }

  function handleNavClick() {
    // Ferme le drawer mobile au clic sur un lien
    if (onMobileClose && mobileOpen) onMobileClose();
  }

  return (
    <>
      {/* Backdrop mobile */}
      <div
        onClick={onMobileClose}
        className={cn(
          "lg:hidden fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm transition-opacity",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "w-64 lg:w-60 shrink-0 border-r border-border bg-card flex flex-col",
          // Desktop : sticky top, plein écran
          "lg:sticky lg:top-0 lg:h-screen lg:self-start",
          // Mobile : drawer fixed slide-in
          "fixed inset-y-0 left-0 z-40 lg:translate-x-0 transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="px-5 pt-6 pb-5 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/logo-icon.png"
              alt="Assist360"
              className="h-10 w-10 object-contain"
            />
            <div>
              <div className="font-semibold tracking-tight">Assist360</div>
              <div className="text-xs text-muted-foreground">Conseiller La Poste</div>
            </div>
          </div>
          {/* Bouton fermer mobile */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1 rounded-md text-muted-foreground hover:bg-muted"
            aria-label="Fermer le menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                  active
                    ? "bg-brand-soft text-brand font-medium ring-1 ring-brand/20"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <item.icon className={cn("h-4 w-4", active ? "text-brand" : "text-muted-foreground")} />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span
                    className={cn(
                      "text-xs px-1.5 rounded",
                      active ? "bg-brand text-white" : "bg-brand-soft text-brand",
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border px-4 py-3 flex items-center justify-center">
          <ThemeToggle />
        </div>
        <div className="border-t border-border p-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-accent text-strong-foreground grid place-items-center text-xs font-semibold">
            {name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div className="text-sm leading-tight flex-1 min-w-0">
            <div className="font-medium truncate">{name}</div>
            <div className="text-xs text-muted-foreground truncate">{role}</div>
          </div>
          <button
            onClick={logout}
            title="Se déconnecter"
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </aside>
    </>
  );
}
