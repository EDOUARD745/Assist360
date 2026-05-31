"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Mail, Phone, FileText, ChevronRight, Zap, RefreshCw, BellRing } from "lucide-react";
import {
  CHANNEL_LABEL,
  LANG_FLAG,
  STATUS_DOT,
  STATUS_LABEL,
  TYPE_LABEL,
  URGENCY_STYLES,
  cn,
  timeAgo,
} from "@/lib/utils";
import { api, subscribeTicketEvents, type Ticket } from "@/lib/api";

const CHANNEL_ICON = { email: Mail, appel: Phone, formulaire: FileText } as const;

type Filter = "all" | "urgent" | "open" | "waiting" | "closed";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "urgent", label: "Urgents" },
  { key: "open", label: "En cours" },
  { key: "waiting", label: "En attente d'info" },
  { key: "closed", label: "Clôturés" },
];

export default function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [injecting, setInjecting] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const newIdsTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    api
      .tickets()
      .then((t) => {
        setTickets(t);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeTicketEvents((t) => {
      setTickets((prev) => (prev.some((x) => x.id === t.id) ? prev : [t, ...prev]));
      setNewIds((s) => new Set(s).add(t.id));
      setPendingCount((n) => n + 1);
      // auto-clear "new" highlight after 4s
      const existing = newIdsTimers.current.get(t.id);
      if (existing) clearTimeout(existing);
      const handle = setTimeout(() => {
        setNewIds((s) => {
          const next = new Set(s);
          next.delete(t.id);
          return next;
        });
        newIdsTimers.current.delete(t.id);
      }, 4500);
      newIdsTimers.current.set(t.id, handle);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const timers = newIdsTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  async function inject() {
    setInjecting(true);
    try {
      // backend will also broadcast via SSE; we rely on that for the actual append
      await api.injectTicket();
    } finally {
      setTimeout(() => setInjecting(false), 600);
    }
  }

  function clearPending() {
    setPendingCount(0);
  }

  const counts = useMemo(() => {
    return {
      all: tickets.length,
      urgent: tickets.filter((t) => t.analysis.urgency === "haute" && t.status !== "closed").length,
      open: tickets.filter((t) => t.status === "open").length,
      waiting: tickets.filter((t) => t.status === "waiting").length,
      closed: tickets.filter((t) => t.status === "closed").length,
    } satisfies Record<Filter, number>;
  }, [tickets]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "urgent":
        return tickets.filter((t) => t.analysis.urgency === "haute" && t.status !== "closed");
      case "all":
        return tickets;
      default:
        return tickets.filter((t) => t.status === filter);
    }
  }, [tickets, filter]);

  if (loading) {
    return (
      <div className="bg-card rounded-xl ring-1 ring-border p-8 text-sm text-muted-foreground">
        Chargement des tickets…
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl ring-1 ring-border overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-border flex items-center gap-2 sm:gap-3 flex-wrap">
        <h2 className="text-sm font-semibold">File d'attente</h2>
        {pendingCount > 0 && (
          <button
            onClick={clearPending}
            className="text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-200 animate-fade-up"
          >
            <BellRing className="h-3 w-3" />
            {pendingCount} nouveau{pendingCount > 1 ? "x" : ""}
          </button>
        )}
        <button
          onClick={inject}
          disabled={injecting}
          className="ml-auto text-xs inline-flex items-center gap-1 px-2.5 py-1 rounded-md ring-1 ring-border bg-card hover:bg-muted text-foreground disabled:opacity-60"
          title="Simuler l'arrivée d'une nouvelle demande client (démo)"
        >
          {injecting ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <Zap className="h-3 w-3" />
          )}
          <span className="hidden sm:inline">Simuler une nouvelle demande</span>
          <span className="sm:hidden">Nouvelle demande</span>
        </button>
        <div className="flex flex-wrap gap-1 w-full overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full ring-1 transition-colors flex items-center gap-1.5",
                filter === f.key
                  ? "bg-brand text-white ring-brand"
                  : "bg-card text-foreground ring-border hover:bg-muted",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] font-mono",
                  filter === f.key ? "bg-card/20 text-white" : "bg-muted text-muted-foreground",
                )}
              >
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-border-soft">
        {filtered.length === 0 && (
          <li className="p-8 text-center text-sm text-muted-foreground">Aucun ticket dans cette catégorie.</li>
        )}
        {filtered.map((t) => {
          const Icon = CHANNEL_ICON[t.channel];
          const u = t.analysis.urgency;
          const isClosed = t.status === "closed";
          const isNew = newIds.has(t.id);
          return (
            <li key={t.id} className={cn("relative", isNew && "ring-2 ring-brand ring-inset")}>
              <Link
                href={`/tickets/${t.id}`}
                className={cn(
                  "flex items-start gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-muted transition-colors",
                  isClosed && "opacity-60",
                  isNew && "bg-brand-soft/60 animate-fade-up",
                )}
              >
                {isNew && (
                  <span className="absolute right-10 top-2.5 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand text-white">
                    <BellRing className="h-2.5 w-2.5" />
                    NOUVEAU
                  </span>
                )}
                <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[t.status]}`} title={STATUS_LABEL[t.status]} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{t.customer.name}</span>
                    <span className="text-xs text-muted-foreground/70">{LANG_FLAG[t.analysis.language] || ""}</span>
                    {!isClosed && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ring-1 ${URGENCY_STYLES[u]}`}>
                        {u}
                      </span>
                    )}
                    <span className="hidden sm:inline text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-foreground">
                      {TYPE_LABEL[t.analysis.type] || t.analysis.type}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded",
                        t.status === "waiting" && "bg-amber-50 text-amber-700",
                        t.status === "closed" && "bg-border text-foreground",
                        t.status === "open" && "bg-blue-50 text-blue-700",
                      )}
                    >
                      {STATUS_LABEL[t.status]}
                    </span>
                  </div>
                  <div className="text-sm text-foreground truncate mt-0.5">{t.subject}</div>
                  <div className="text-xs text-muted-foreground truncate mt-1 hidden sm:block">{t.analysis.summary}</div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground sm:hidden">
                    <Icon className="h-3 w-3" />
                    <span>{CHANNEL_LABEL[t.channel]}</span>
                    <span>·</span>
                    <span>{timeAgo(t.received_at)}</span>
                  </div>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-muted-foreground shrink-0">
                  <div className="flex items-center gap-1">
                    <Icon className="h-3 w-3" />
                    <span>{CHANNEL_LABEL[t.channel]}</span>
                  </div>
                  <span>{timeAgo(t.received_at)}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 self-center shrink-0" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
