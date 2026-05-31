"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Heart,
  Brain,
  Zap,
  ShieldCheck,
  Code2,
  Briefcase,
  Mail,
} from "lucide-react";

const MEMBERS = [
  {
    name: "SARR Fatou Kiné",
    role: "IA Engineer",
    bio: "Deploiement IA, integration et migration du produit.",
    color: "from-[#003da5] to-[#5dadff]",
    initials: "M1",
    skills: ["Deploiement", "Integration", "Migration"],
  },
  {
    name: "DIEYE Mame Yacine",
    role: "IA Engineer",
    bio: "Conception des prompts, évaluation des modèles, fine-tuning des sorties JSON.",
    color: "from-[#ffcd00] to-[#ff8a00]",
    initials: "M2",
    skills: ["LLM", "Prompt Engineering", "Evaluation"],
  },
  {
    name: "Sarah",
    role: "Infrastructure / Cloud Engineer",
    bio: "hebergement, securité et infrastructure pour le modèle.",
    color: "from-[#22c55e] to-[#0ea5e9]",
    initials: "M3",
    skills: ["Infrastructure", "Cloud", "Security"],
  },
  {
    name: "Sophia",
    role: "Data Engineer",
    bio: "Acquisition, nettoyage et preparation des données et migration.",
    color: "from-[#a855f7] to-[#ec4899]",
    initials: "M4",
    skills: ["Data", "Migration", "Nettoyage"],
  },
];

const VALUES = [
  {
    icon: Heart,
    title: "Human-in-the-Loop",
    text: "L'IA assiste, le conseiller décide. Pas de réponse envoyée sans validation humaine.",
  },
  {
    icon: ShieldCheck,
    title: "Souveraineté",
    text: "Modèles open-source, données PII protégées, déployable sur infrastructure La Poste.",
  },
  {
    icon: Zap,
    title: "Productivité réelle",
    text: "−57 % de temps de traitement, démontré sur des cas d'usage concrets et multilingues.",
  },
  {
    icon: Brain,
    title: "Transparence",
    text: "Sources citées, niveaux de confiance affichés, l'IA explique ses choix.",
  },
];

const STACK = [
  { label: "Frontend", value: "Next.js 16 · React · Tailwind" },
  { label: "Backend", value: "FastAPI · Python 3.13" },
  { label: "LLM", value: "Llama 3 (open-source, Meta)" },
  { label: "RAG", value: "MiniLM multilingue + cosine search" },
  { label: "Streaming", value: "Server-Sent Events" },
  { label: "Hébergement modèle", value: "Groq · Démo · prod cible : infra La Poste" },
];

const TIMELINE = [
  { date: "Phase 1", title: "Compréhension métier", text: "Interviews conseillers, BPMN du processus, analyse des outils existants." },
  { date: "Phase 2", title: "Demi-finale", text: "Concept validé, prototype d'écran et premiers prompts d'analyse." },
  { date: "Phase 3", title: "Finale", text: "Prototype fonctionnel bout-en-bout, RAG, streaming, multilingue, PII." },
  { date: "Suite", title: "Pilote", text: "Déploiement test sur un service support, mesure des KPIs réels, itérations." },
];

export default function TeamPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1e44] text-white">
      {/* Background blobs réutilisés du login */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-24 h-[480px] w-[480px] rounded-full bg-[#0058c4] blur-3xl opacity-50 animate-blob-1" />
        <div className="absolute top-1/3 -right-32 h-[520px] w-[520px] rounded-full bg-[#ffcd00] blur-3xl opacity-20 animate-blob-2" />
        <div className="absolute -bottom-40 left-1/4 h-[460px] w-[460px] rounded-full bg-[#5dadff] blur-3xl opacity-35 animate-blob-3" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      {/* Top nav */}
      <header className="relative z-10 px-6 lg:px-10 py-6 flex items-center justify-between">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la connexion
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/95 grid place-items-center p-1.5 ring-1 ring-white/30">
            <img src="/logo-icon.png" alt="Assist360" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="text-sm font-semibold">Assist360</div>
            <div className="text-[11px] text-white/60">par l'équipe AIThena</div>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-6 lg:px-10 pb-20 max-w-6xl mx-auto">
        {/* Hero */}
        <section className="pt-10 pb-16">
          <div
            className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/20 animate-fade-up mb-6"
            style={{ animationDelay: "0.05s" }}
          >
            <Sparkles className="h-3 w-3 text-[#ffcd00]" />
            Hackathon Women in GenAI 2026
          </div>
          <h1
            className="text-5xl xl:text-6xl font-semibold tracking-tight leading-tight max-w-3xl animate-fade-up"
            style={{ animationDelay: "0.15s" }}
          >
            Nous sommes{" "}
            <span className="bg-gradient-to-r from-white via-[#ffeb99] to-[#ffcd00] bg-clip-text text-transparent">
              AIThena
            </span>
            .
          </h1>
          <p
            className="mt-5 text-lg text-white/70 max-w-2xl leading-relaxed animate-fade-up"
            style={{ animationDelay: "0.25s" }}
          >
            Une équipe pluridisciplinaire qui a construit{" "}
            <span className="text-white font-medium">Assist360</span>, une plateforme d'assistance IA
            pour les conseillers clientèle de La Poste. Notre conviction : l'IA doit alléger la
            charge cognitive des équipes humaines, sans jamais les remplacer.
          </p>
        </section>

        {/* Members */}
        <section className="space-y-5">
          <SectionTitle eyebrow="L'équipe" title="Quatre regards complémentaires sur un même problème." />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MEMBERS.map((m, i) => (
              <MemberCard key={m.name} member={m} delay={0.1 + i * 0.05} />
            ))}
          </div>
        </section>

        {/* Values */}
        <section className="mt-16 space-y-5">
          <SectionTitle eyebrow="Notre approche" title="Quatre principes qui ont guidé chaque décision." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VALUES.map((v, i) => (
              <div
                key={v.title}
                className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 animate-fade-up backdrop-blur-sm hover:bg-white/[0.07] transition-colors"
                style={{ animationDelay: `${0.1 + i * 0.05}s` }}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/10 ring-1 ring-white/20 grid place-items-center shrink-0">
                    <v.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{v.title}</div>
                    <p className="text-sm text-white/70 mt-1 leading-relaxed">{v.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stack */}
        <section className="mt-16 space-y-5">
          <SectionTitle eyebrow="Sous le capot" title="Une stack moderne, open-source et souveraine." />
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-2 backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
              {[STACK.slice(0, 3), STACK.slice(3)].map((col, ci) => (
                <ul key={ci} className="p-3 space-y-1">
                  {col.map((s) => (
                    <li key={s.label} className="px-3 py-2 flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-white/50 text-xs uppercase tracking-wider">{s.label}</span>
                      <span className="font-medium text-right">{s.value}</span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="mt-16 space-y-5">
          <SectionTitle eyebrow="Notre parcours" title="De l'idée à un prototype démonstrable." />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {TIMELINE.map((t, i) => (
              <div
                key={t.title}
                className="relative rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 animate-fade-up backdrop-blur-sm"
                style={{ animationDelay: `${0.1 + i * 0.05}s` }}
              >
                <div className="text-[10px] uppercase tracking-wider text-[#ffcd00] font-semibold">
                  {t.date}
                </div>
                <div className="font-semibold mt-1">{t.title}</div>
                <p className="text-xs text-white/70 mt-2 leading-relaxed">{t.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 rounded-3xl bg-gradient-to-br from-white/10 to-white/[0.03] ring-1 ring-white/15 p-8 lg:p-10 backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-semibold">Envie d'en discuter ?</h2>
              <p className="text-white/70 mt-2 max-w-xl">
                On serait ravi·es d'échanger sur Assist360, l'usage de l'IA générative en service
                client, ou simplement de vous faire une démo live.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="mailto:equipe-aithena@example.com"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ffcd00] text-[#0b1e44] font-medium text-sm hover:bg-[#ffd633] transition-colors"
              >
                <Mail className="h-4 w-4" />
                Nous contacter
              </a>
              <a
                href="https://github.com/EDOUARD745/Assist360"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 ring-1 ring-white/20 text-sm hover:bg-white/15 transition-colors"
              >
                <Code2 className="h-4 w-4" />
                Code source
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 ring-1 ring-white/20 text-sm hover:bg-white/15 transition-colors"
              >
                <Briefcase className="h-4 w-4" />
                LinkedIn
              </a>
            </div>
          </div>
        </section>

        <footer className="mt-12 text-center text-xs text-white/40">
          AIThena · Hackathon Women in GenAI 2026 · Made with 💛 in France
        </footer>
      </main>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-2">
      <div className="text-[11px] uppercase tracking-wider text-[#ffcd00] font-semibold">
        {eyebrow}
      </div>
      <h2 className="text-2xl font-semibold tracking-tight mt-1">{title}</h2>
    </div>
  );
}

function MemberCard({
  member,
  delay,
}: {
  member: (typeof MEMBERS)[number];
  delay: number;
}) {
  return (
    <div
      className="group rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 animate-fade-up backdrop-blur-sm hover:bg-white/[0.08] hover:ring-white/20 transition-all"
      style={{ animationDelay: `${delay}s` }}
    >
      <div
        className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${member.color} grid place-items-center font-bold text-xl mb-4 group-hover:scale-105 transition-transform`}
      >
        {member.initials}
      </div>
      <div className="font-semibold">{member.name}</div>
      <div className="text-xs text-[#ffcd00] font-medium uppercase tracking-wider mt-0.5">
        {member.role}
      </div>
      <p className="text-sm text-white/70 mt-3 leading-relaxed">{member.bio}</p>
      <div className="flex flex-wrap gap-1.5 mt-4">
        {member.skills.map((s) => (
          <span
            key={s}
            className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/80"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
