"use client";

import { useEffect, useState } from "react";
import { Clock, TrendingDown, Smile, Inbox, AlertTriangle } from "lucide-react";
import { api, type Kpis } from "@/lib/api";

export default function KpiRow() {
  const [kpis, setKpis] = useState<Kpis | null>(null);

  useEffect(() => {
    api.kpis().then(setKpis).catch(() => null);
  }, []);

  const cards = [
    {
      icon: Inbox,
      label: "Tickets ouverts",
      value: kpis ? kpis.total_open.toString() : "-",
      sub: "à traiter aujourd'hui",
      tone: "default" as const,
    },
    {
      icon: AlertTriangle,
      label: "Urgents",
      value: kpis ? (kpis.by_urgency.haute ?? 0).toString() : "-",
      sub: "demandent une action",
      tone: "danger" as const,
    },
    {
      icon: Clock,
      label: "Temps moyen de traitement",
      value: kpis ? `${kpis.avg_handling_time_min.toFixed(1)} min` : "-",
      sub: kpis ? `vs ${kpis.avg_handling_time_baseline_min} min sans IA` : "",
      tone: "good" as const,
    },
    {
      icon: TrendingDown,
      label: "Gain de temps",
      value: kpis
        ? `−${Math.round(
            ((kpis.avg_handling_time_baseline_min - kpis.avg_handling_time_min) /
              kpis.avg_handling_time_baseline_min) *
              100,
          )}%`
        : "-",
      sub: "vs baseline conseiller",
      tone: "good" as const,
    },
    {
      icon: Smile,
      label: "Satisfaction client",
      value: kpis ? `${kpis.satisfaction_score} / 5` : "-",
      sub: "moyenne 30 derniers jours",
      tone: "default" as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-card rounded-xl p-4 ring-1 ring-border shadow-sm"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <c.icon className="h-3.5 w-3.5" />
            <span>{c.label}</span>
          </div>
          <div
            className={`mt-2 text-2xl font-semibold tracking-tight ${
              c.tone === "danger" ? "text-red-600" : c.tone === "good" ? "text-emerald-600" : ""
            }`}
          >
            {c.value}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
