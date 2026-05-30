"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Inbox, LayoutDashboard, Settings, BookOpen, LogOut, BarChart3 } from "lucide-react";
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

export default function Sidebar() {
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

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-card flex flex-col sticky top-0 h-screen self-start">
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-brand text-white grid place-items-center font-bold">
            A
          </div>
          <div>
            <div className="font-semibold tracking-tight">Assist360</div>
            <div className="text-xs text-muted-foreground">Conseiller La Poste</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.label}
              href={item.href}
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
  );
}
