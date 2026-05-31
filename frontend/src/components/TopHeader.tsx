"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Menu, Search, Settings, LogOut, User } from "lucide-react";
import { clearSession, getSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default function TopHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("Marie Lefèvre");
  const [role, setRole] = useState("Conseillère N2");
  const [query, setQuery] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = getSession();
    if (s) {
      setName(s.name);
      setRole(s.role);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function logout() {
    clearSession();
    router.replace("/login");
  }

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      // Pour la démo : redirige vers le dashboard avec un filtre en localStorage
      // (la TicketList lira ce filtre si on l'implémente). Pour l'instant, on log.
      window.dispatchEvent(new CustomEvent("assist360:search", { detail: query.trim() }));
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
      <div className="px-3 sm:px-5 py-2.5 flex items-center gap-2 sm:gap-3">
        {/* Hamburger - mobile only */}
        <button
          onClick={onOpenMenu}
          className="lg:hidden p-1.5 rounded-md hover:bg-muted text-foreground shrink-0"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo - mobile only (sur desktop il est dans la sidebar) */}
        <Link href="/" className="lg:hidden flex items-center gap-2 shrink-0">
          <img src="/logo-icon.png" alt="Assist360" className="h-8 w-8 object-contain" />
        </Link>

        {/* Search bar */}
        <form onSubmit={onSubmit} className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un ticket, un client, un numéro de suivi..."
              className="w-full bg-muted rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-brand transition-shadow"
            />
          </div>
        </form>

        {/* Bell */}
        <div ref={bellRef} className="relative shrink-0">
          <button
            onClick={() => setBellOpen((v) => !v)}
            className="relative p-2 rounded-md ring-1 ring-border bg-card hover:bg-muted transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4 text-foreground" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card" />
          </button>
          {bellOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-card ring-1 ring-border shadow-lg overflow-hidden animate-fade-up">
              <div className="px-4 py-3 border-b border-border-soft flex items-center justify-between">
                <span className="text-sm font-semibold">Notifications</span>
                <span className="text-[10px] text-muted-foreground">3 non lues</span>
              </div>
              <ul className="divide-y divide-border-soft max-h-80 overflow-y-auto">
                <NotifItem
                  dot="red"
                  title="Nouveau ticket urgent"
                  body="Sophie Bernard – Colis non livré (3 semaines)"
                  time="il y a 2 min"
                />
                <NotifItem
                  dot="amber"
                  title="Ticket en attente d'info > 24h"
                  body="Marc Dubois – Problème colis"
                  time="il y a 1 h"
                />
                <NotifItem
                  dot="brand"
                  title="Suggestion IA validée"
                  body="Votre réponse à Karim Benali a été appréciée"
                  time="il y a 3 h"
                  read
                />
              </ul>
              <div className="px-4 py-2 border-t border-border-soft text-center">
                <Link href="/" className="text-xs text-brand hover:underline">
                  Voir tout
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div ref={avatarRef} className="relative shrink-0">
          <button
            onClick={() => setAvatarOpen((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-2 sm:pr-3 py-1 rounded-full ring-1 ring-border bg-card hover:bg-muted transition-colors"
          >
            <span className="h-7 w-7 rounded-full bg-accent text-strong-foreground grid place-items-center text-xs font-semibold">
              {initials}
            </span>
            <span className="hidden sm:inline text-sm font-medium text-foreground">
              {name.split(" ")[0]} {name.split(" ")[1]?.[0]}.
            </span>
          </button>
          {avatarOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-card ring-1 ring-border shadow-lg overflow-hidden animate-fade-up">
              <div className="px-4 py-3 border-b border-border-soft">
                <div className="text-sm font-semibold">{name}</div>
                <div className="text-xs text-muted-foreground">{role}</div>
              </div>
              <Link
                href="/parametres"
                onClick={() => setAvatarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                Mon profil
              </Link>
              <Link
                href="/parametres"
                onClick={() => setAvatarOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Paramètres
              </Link>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted border-t border-border-soft text-red-600"
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NotifItem({
  dot,
  title,
  body,
  time,
  read,
}: {
  dot: "red" | "amber" | "brand";
  title: string;
  body: string;
  time: string;
  read?: boolean;
}) {
  const dotCls = {
    red: "bg-red-500",
    amber: "bg-amber-500",
    brand: "bg-brand",
  }[dot];
  return (
    <li className={cn("px-4 py-3 hover:bg-muted cursor-pointer", read && "opacity-60")}>
      <div className="flex items-start gap-2.5">
        <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", dotCls)} />
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground truncate">{body}</div>
          <div className="text-[10px] text-muted-foreground/70 mt-0.5">{time}</div>
        </div>
      </div>
    </li>
  );
}
