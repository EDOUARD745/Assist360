"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  User2,
  Globe,
  Sparkles,
  Bell,
  ShieldCheck,
} from "lucide-react";
import { getSession, type Session } from "@/lib/auth";

export default function SettingsPage() {
  const [session, setS] = useState<Session | null>(null);
  useEffect(() => setS(getSession()), []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-4 sm:space-y-5">
      <header>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-brand" />
          Paramètres
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Préférences de votre espace conseiller.
        </p>
      </header>

      <Card icon={User2} title="Profil">
        <Row label="Nom" value={session?.name ?? "-"} />
        <Row label="Email" value={session?.email ?? "-"} />
        <Row label="Rôle" value={session?.role ?? "-"} />
      </Card>

      <Card icon={Sparkles} title="Assistance IA">
        <Toggle
          defaultOn
          label="Pré-analyser automatiquement les tickets entrants"
          help="L'IA extrait résumé, urgence et infos clés dès la réception."
        />
        <Toggle
          defaultOn
          label="Suggérer une réponse à l'ouverture du ticket"
          help="Une proposition de réponse est générée en arrière-plan."
        />
        <Select
          label="Modèle utilisé"
          help="Modèle open-source recommandé pour la souveraineté des données."
          options={[
            { value: "llama-3.3-70b", label: "Llama 3.3 70B - open-source (par défaut)" },
            { value: "mistral-large", label: "Mistral Large - souveraineté FR" },
            { value: "gpt-4o", label: "GPT-4o - OpenAI" },
          ]}
        />
      </Card>

      <Card icon={Globe} title="Langues">
        <Toggle defaultOn label="Détection automatique de la langue du client" />
        <Toggle defaultOn label="Traduction automatique vers le français" />
        <Select
          label="Langues prises en charge"
          help="L'IA peut détecter et répondre dans ces langues."
          options={[
            { value: "all", label: "Toutes les langues européennes (par défaut)" },
            { value: "fr-en", label: "Français + Anglais uniquement" },
          ]}
        />
      </Card>

      <Card icon={Bell} title="Notifications">
        <Toggle defaultOn label="Alerte si un ticket urgent reste sans réponse > 1h" />
        <Toggle label="Récap quotidien par email" />
      </Card>

      <Card icon={ShieldCheck} title="Sécurité et conformité">
        <Row label="Authentification" value="SSO La Poste" />
        <Row label="Audit log" value="Activé (90 jours)" />
        <Row label="Hébergement modèle IA" value="Démo : Groq · Prod cible : infra interne La Poste" />
      </Card>

      <p className="text-xs text-muted-foreground/70 text-center pt-4">
        Cette page est une maquette - les paramètres ne sont pas persistés dans cette démo.
      </p>
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card rounded-xl ring-1 ring-border overflow-hidden">
      <div className="px-5 py-3 border-b border-border-soft flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="divide-y divide-border-soft">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-3 flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-strong-foreground font-medium">{value}</span>
    </div>
  );
}

function Toggle({
  label,
  help,
  defaultOn,
}: {
  label: string;
  help?: string;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <div className="px-5 py-3 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm">{label}</div>
        {help && <div className="text-xs text-muted-foreground mt-0.5">{help}</div>}
      </div>
      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        aria-pressed={on}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-brand" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}

function Select({
  label,
  help,
  options,
}: {
  label: string;
  help?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="px-5 py-3 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm">{label}</div>
        {help && <div className="text-xs text-muted-foreground mt-0.5">{help}</div>}
      </div>
      <select
        defaultValue={options[0].value}
        className="text-sm rounded-md ring-1 ring-border px-2.5 py-1.5 max-w-[280px]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
