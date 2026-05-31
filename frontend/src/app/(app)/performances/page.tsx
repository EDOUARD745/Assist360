"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Clock,
  Smile,
  Inbox,
  TrendingDown,
  Users,
  Bot,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { api, type AiAdoption, type Ticket } from "@/lib/api";
import { Sparkles } from "lucide-react";
import { CHANNEL_LABEL, LANG_FLAG, TYPE_LABEL } from "@/lib/utils";

const BRAND = "#003da5";
const ACCENT = "#ffcd00";
const DONUT = ["#003da5", "#5dadff", "#ffcd00", "#22c55e", "#ef4444", "#a855f7"];

type Period = "7" | "30" | "90";

const PERIODS: { value: Period; label: string; days: number; ticketsLabel: string }[] = [
  { value: "7", label: "7 derniers jours", days: 7, ticketsLabel: "cette semaine" },
  { value: "30", label: "30 derniers jours", days: 30, ticketsLabel: "ce mois" },
  { value: "90", label: "Trimestre en cours", days: 90, ticketsLabel: "ce trimestre" },
];

// IA introduite il y a 21 jours - repère fixe pour la simulation
const AI_INTRODUCED_DAYS_AGO = 21;

// Génère une série déterministe (sin) - pas de Math.random() pour éviter
// l'hydratation décalée entre serveur et client.
function buildHandlingSeries(days: number) {
  const out: { day: string; baseline: number; avecIA: number | null }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const baseline = 9.6 + Math.sin(i / 4) * 0.4 + Math.cos(i / 7) * 0.2;
    let avecIA: number | null = null;
    if (i <= AI_INTRODUCED_DAYS_AGO) {
      const ratio = Math.min(1, (AI_INTRODUCED_DAYS_AGO - i) / 14);
      avecIA = baseline - ratio * (baseline - 4.0) + Math.sin(i / 3) * 0.15;
    }
    out.push({
      day: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      baseline: Number(baseline.toFixed(2)),
      avecIA: avecIA == null ? null : Number(avecIA.toFixed(2)),
    });
  }
  return out;
}

// Stats agrégées par période - calculées à partir de la série
function aggregateForPeriod(days: number) {
  const series = buildHandlingSeries(days);
  const withAI = series.filter((p) => p.avecIA != null).map((p) => p.avecIA as number);
  const baseline = series.map((p) => p.baseline);
  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
  const avgIA = withAI.length > 0 ? avg(withAI) : avg(baseline);
  const avgBase = avg(baseline);
  const gainPct = Math.round(((avgBase - avgIA) / avgBase) * 100);
  // Volume estimé : ~15 tickets/jour moyenne d'équipe
  const volume = Math.round(days * 15.4);
  // Satisfaction : meilleure sur les périodes récentes (gain de l'IA)
  const baseSat = 4.2;
  const satBonus = withAI.length === 0 ? 0 : (withAI.length / series.length) * 0.4;
  return {
    series,
    avgIA: Number(avgIA.toFixed(1)),
    avgBase: Number(avgBase.toFixed(1)),
    gainPct,
    volume,
    satisfaction: Number((baseSat + satBonus).toFixed(1)),
  };
}

const TOP_CHATBOT_QUESTIONS = [
  { q: "Délai d'indemnisation colis perdu ?", count: 42 },
  { q: "Comment ouvrir un dossier NPAI ?", count: 31 },
  { q: "Réexpédition courrier international ?", count: 18 },
  { q: "Procédure indemnisation colis cassé ?", count: 24 },
  { q: "Force probante d'une LRAR ?", count: 15 },
];

const TEAM_LOAD = [
  { name: "Marie L.", current: 12, treated: 38, urgency: 6 },
  { name: "Thomas B.", current: 9, treated: 41, urgency: 3 },
  { name: "Aïcha M.", current: 14, treated: 35, urgency: 8 },
  { name: "Julien R.", current: 7, treated: 44, urgency: 2 },
];

export default function PerformancesPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [period, setPeriod] = useState<Period>("30");
  const [aiAdoption, setAiAdoption] = useState<AiAdoption | null>(null);

  const periodMeta = PERIODS.find((p) => p.value === period)!;

  useEffect(() => {
    api.tickets().then(setTickets);
    api.aiAdoption().then(setAiAdoption).catch(() => null);
  }, []);

  const stats = useMemo(() => aggregateForPeriod(periodMeta.days), [periodMeta.days]);
  // Volume précédent pour la comparaison
  const previousVolume = useMemo(
    () => Math.round(periodMeta.days * 9.3),
    [periodMeta.days],
  );

  // Année précédente pour libellé de comparaison
  const lastYear = new Date().getFullYear() - 1;

  const byType = useMemo(() => {
    const m: Record<string, number> = {};
    tickets.forEach((t) => {
      const k = TYPE_LABEL[t.analysis.type] || t.analysis.type;
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [tickets]);

  const byChannel = useMemo(() => {
    const m: Record<string, number> = {};
    tickets.forEach((t) => {
      const k = CHANNEL_LABEL[t.channel];
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [tickets]);

  const byLang = useMemo(() => {
    const m: Record<string, number> = {};
    tickets.forEach((t) => {
      const k = `${LANG_FLAG[t.analysis.language] || ""} ${t.analysis.language.toUpperCase()}`;
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [tickets]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-brand" />
            Performances
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pilotage de l'activité conseillers.
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="text-sm rounded-md ring-1 ring-border px-2.5 py-1.5 bg-card focus:ring-brand focus:outline-none"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </header>

      {/* Big KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <BigCard
          icon={Clock}
          label="Temps moyen de traitement"
          value={`${stats.avgIA} min`}
          sub={`vs ${stats.avgBase} min baseline`}
          tone="good"
        />
        <BigCard
          icon={TrendingDown}
          label="Gain de temps"
          value={`−${stats.gainPct}%`}
          sub={
            periodMeta.days <= AI_INTRODUCED_DAYS_AGO
              ? "depuis le déploiement de l'IA"
              : "sur la période (IA déployée il y a 21j)"
          }
          tone="good"
        />
        <BigCard
          icon={Smile}
          label="Satisfaction client"
          value={`${stats.satisfaction} / 5`}
          sub={`pondérée - ${periodMeta.label.toLowerCase()}`}
        />
        <BigCard
          icon={Inbox}
          label="Tickets traités"
          value={stats.volume.toLocaleString("fr-FR")}
          sub={`${periodMeta.ticketsLabel} (vs. ${previousVolume.toLocaleString("fr-FR")} en ${lastYear})`}
        />
      </div>

      {/* Time series */}
      <Card
        title={`Temps moyen de traitement (${periodMeta.label.toLowerCase()})`}
        subtitle={
          periodMeta.days <= AI_INTRODUCED_DAYS_AGO
            ? "Période entièrement couverte par Assist360."
            : "L'IA a été déployée il y a 21 jours."
        }
      >
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={stats.series}>
            <defs>
              <linearGradient id="gBrand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRAND} stopOpacity={0.3} />
                <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gBase" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "#64748b" }}
              interval={Math.max(0, Math.floor(periodMeta.days / 8))}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickFormatter={(v) => `${v} min`}
              domain={[0, 12]}
            />
            <Tooltip
              contentStyle={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => `${value} min`}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="baseline"
              name="Baseline (sans IA)"
              stroke="#94a3b8"
              strokeDasharray="4 4"
              fill="url(#gBase)"
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="avecIA"
              name="Avec Assist360"
              stroke={BRAND}
              fill="url(#gBrand)"
              strokeWidth={2.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="Tickets par type">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={byType}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={80}
                paddingAngle={2}
              >
                {byType.map((_, i) => (
                  <Cell key={i} fill={DONUT[i % DONUT.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Tickets par canal">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byChannel} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="value" fill={BRAND} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Tickets par langue">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byLang} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="value" fill={ACCENT} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Adoption des suggestions IA" icon={Sparkles} subtitle="Sur les réponses envoyées via Assist360.">
        <AdoptionCard data={aiAdoption} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Charge par conseiller" icon={Users}>
          <div className="space-y-2.5">
            {TEAM_LOAD.map((t) => (
              <div key={t.name} className="flex items-center gap-3">
                <div className="w-24 text-sm shrink-0">{t.name}</div>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full transition-all"
                    style={{ width: `${(t.current / 20) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground w-32 text-right shrink-0">
                  <span className="font-semibold text-strong-foreground">{t.current}</span> en cours
                  {t.urgency > 0 && (
                    <span className="ml-1 text-red-600">· {t.urgency}⚠</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Top questions au chatbot interne" icon={Bot}>
          <div className="space-y-2">
            {TOP_CHATBOT_QUESTIONS.map((q, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-xs text-muted-foreground/70 w-5">#{i + 1}</span>
                <span className="flex-1 truncate">{q.q}</span>
                <span className="text-xs text-muted-foreground shrink-0">{q.count} demandes</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border-soft">
            💡 Suggestion : enrichir la base de connaissances sur les questions les plus fréquentes.
          </p>
        </Card>
      </div>
    </div>
  );
}

function AdoptionCard({ data }: { data: AiAdoption | null }) {
  // Données par défaut réalistes si pas d'historique (démo fresh start)
  const demo = !data || data.total_replies === 0
    ? { total: 38, as_is: 26, modified: 9, no_ai: 3 }
    : { total: data.total_replies, as_is: data.as_is, modified: data.modified, no_ai: data.no_ai };
  const pct = (n: number) => (demo.total ? Math.round((n / demo.total) * 100) : 0);
  const isDemo = !data || data.total_replies === 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="text-3xl font-semibold tracking-tight text-emerald-600">
          {pct(demo.as_is)}%
        </div>
        <div className="text-xs text-muted-foreground">
          des suggestions IA validées telles quelles
          {isDemo && (
            <span className="ml-1 text-[10px] text-muted-foreground/70">(estimation - peu d'envois cette session)</span>
          )}
        </div>
      </div>

      <div className="h-3 rounded-full bg-muted overflow-hidden flex">
        <div className="bg-emerald-500" style={{ width: `${pct(demo.as_is)}%` }} title={`Validée telle quelle : ${demo.as_is}`} />
        <div className="bg-amber-400" style={{ width: `${pct(demo.modified)}%` }} title={`Modifiée : ${demo.modified}`} />
        <div className="bg-slate-300" style={{ width: `${pct(demo.no_ai)}%` }} title={`Sans IA : ${demo.no_ai}`} />
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
        <LegendRow color="bg-emerald-500" label="Validée telle quelle" value={demo.as_is} pct={pct(demo.as_is)} />
        <LegendRow color="bg-amber-400" label="Modifiée par le conseiller" value={demo.modified} pct={pct(demo.modified)} />
        <LegendRow color="bg-slate-300" label="Rédigée sans IA" value={demo.no_ai} pct={pct(demo.no_ai)} />
      </div>

      <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border-soft">
        💡 Plus le ratio "validée telle quelle" est élevé, mieux l'IA s'aligne sur les standards. Les messages modifiés sont un signal précieux pour affiner les prompts.
      </p>
    </div>
  );
}

function LegendRow({ color, label, value, pct }: { color: string; label: string; value: number; pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold">
          {value} <span className="text-muted-foreground/70 text-xs font-normal">· {pct}%</span>
        </div>
      </div>
    </div>
  );
}

function BigCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  tone?: "good";
}) {
  return (
    <div className="bg-card rounded-xl p-5 ring-1 ring-border shadow-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div
        className={`mt-2 text-3xl font-semibold tracking-tight ${
          tone === "good" ? "text-emerald-600" : ""
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card rounded-xl ring-1 ring-border p-5">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="h-4 w-4 text-brand" />}
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <span className="text-xs text-muted-foreground/70 ml-2">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}
