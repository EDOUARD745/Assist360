"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Sparkles, ArrowRight, ShieldCheck, Zap, Users, ExternalLink } from "lucide-react";
import { setSession } from "@/lib/auth";

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 5.7) % 100}%`,
  delay: `${(i * 0.85) % 14}s`,
  size: 2 + ((i * 7) % 5),
  opacity: 0.3 + ((i * 13) % 50) / 100,
}));

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("marie.lefevre@laposte.fr");
  const [password, setPassword] = useState("••••••••••");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "auth" | "loading-data" | "done">("idle");

  useEffect(() => {
    if (step !== "done") return;
    const t = setTimeout(() => router.replace("/"), 500);
    return () => clearTimeout(t);
  }, [step, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setStep("auth");
    await new Promise((r) => setTimeout(r, 700));
    setStep("loading-data");
    await new Promise((r) => setTimeout(r, 600));
    setSession({ name: "Marie Lefèvre", email, role: "Conseillère N2" });
    setStep("done");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1e44] text-white">
      {/* Lien équipe - visible aussi depuis la colonne mobile/droite */}
      <a
        href="/equipe"
        target="_blank"
        rel="noopener noreferrer"
        className="lg:hidden absolute top-4 right-4 z-20 inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-white/10 backdrop-blur ring-1 ring-white/20 px-3 py-1.5 rounded-full"
      >
        <Users className="h-3 w-3" />
        L'équipe
      </a>
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0">
        <div className="absolute -top-32 -left-24 h-[480px] w-[480px] rounded-full bg-[#0058c4] blur-3xl opacity-60 animate-blob-1" />
        <div className="absolute top-1/3 -right-32 h-[520px] w-[520px] rounded-full bg-[#ffcd00] blur-3xl opacity-25 animate-blob-2" />
        <div className="absolute -bottom-40 left-1/4 h-[460px] w-[460px] rounded-full bg-[#5dadff] blur-3xl opacity-45 animate-blob-3" />
        {/* subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="absolute bottom-0 rounded-full bg-white animate-particle"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 grid lg:grid-cols-2 min-h-screen">
        {/* Left side : brand + benefits */}
        <div className="hidden lg:flex flex-col justify-between p-10 xl:p-14">
          <div className="flex items-center gap-3 animate-fade-up" style={{ animationDelay: "0.05s" }}>
            <div className="relative">
              <div className="h-12 w-12 rounded-xl bg-white/95 grid place-items-center p-1.5 ring-1 ring-white/30">
                <img src="/logo-icon.png" alt="Assist360" className="h-full w-full object-contain" />
              </div>
              <span className="absolute inset-0 rounded-xl ring-2 ring-white/40 animate-pulse-ring" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">Assist360</div>
              <div className="text-xs text-white/60">Plateforme conseiller - La Poste</div>
            </div>
          </div>

          <div className="space-y-6 max-w-md">
            <h1
              className="text-4xl xl:text-5xl font-semibold tracking-tight leading-tight animate-fade-up"
              style={{ animationDelay: "0.15s" }}
            >
              L'IA qui assiste,
              <br />
              <span className="bg-gradient-to-r from-white via-[#ffeb99] to-[#ffcd00] bg-clip-text text-transparent">
                pas qui remplace.
              </span>
            </h1>
            <p
              className="text-white/70 text-base leading-relaxed animate-fade-up"
              style={{ animationDelay: "0.25s" }}
            >
              Centralisez les demandes, comprenez en un coup d'œil, répondez plus vite. Vous gardez la décision finale.
            </p>

            <div className="grid grid-cols-1 gap-3 pt-4">
              <Bullet delay="0.35s" icon={Zap} label="−57 % de temps de traitement" sub="vs baseline conseiller" />
              <Bullet delay="0.45s" icon={Sparkles} label="Multilingue temps réel" sub="EN, ES, DE, IT auto-détectés" />
              <Bullet delay="0.55s" icon={ShieldCheck} label="Llama 3.3 open-source" sub="déployable sur infra souveraine" />
            </div>
          </div>

          <div
            className="text-xs text-white/40 animate-fade-up flex items-center gap-3 flex-wrap"
            style={{ animationDelay: "0.7s" }}
          >
            <span>Hackathon Women in GenAI 2026 · Équipe AIThena</span>
            <a
              href="/equipe"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-white/60 hover:text-white transition-colors"
            >
              <Users className="h-3 w-3" />
              Découvrir l'équipe
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>

        {/* Right side : login card */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <form
            onSubmit={submit}
            className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 shadow-2xl shadow-black/30 p-7 sm:p-8 animate-fade-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="h-11 w-11 rounded-xl bg-white/95 grid place-items-center p-1.5 ring-1 ring-white/30">
                <img src="/logo-icon.png" alt="Assist360" className="h-full w-full object-contain" />
              </div>
              <div className="text-lg font-semibold">Assist360</div>
            </div>

            <h2 className="text-2xl font-semibold tracking-tight">Bon retour, Marie 👋</h2>
            <p className="text-sm text-white/60 mt-1">Connectez-vous pour reprendre votre file d'attente.</p>

            <div className="mt-6 space-y-3">
              <Field icon={Mail} label="Email professionnel">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-transparent outline-none w-full text-sm"
                  autoComplete="email"
                />
              </Field>
              <Field icon={Lock} label="Mot de passe">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-transparent outline-none w-full text-sm"
                  autoComplete="current-password"
                />
              </Field>
            </div>

            <div className="flex items-center justify-between mt-4 text-xs">
              <label className="flex items-center gap-2 text-white/60">
                <input type="checkbox" defaultChecked className="rounded accent-[#ffcd00]" />
                Rester connectée
              </label>
              <a href="#" className="text-white/60 hover:text-white">
                Mot de passe oublié ?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative mt-6 w-full overflow-hidden rounded-xl bg-[#ffcd00] text-[#0b1e44] font-semibold text-sm py-3 flex items-center justify-center gap-2 hover:bg-[#ffd633] transition-colors disabled:opacity-90"
            >
              <span className="absolute inset-0 animate-shimmer" />
              <span className="relative flex items-center gap-2">
                {step === "idle" && (
                  <>
                    Se connecter
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
                {step === "auth" && <>Authentification…</>}
                {step === "loading-data" && <>Préparation de votre file…</>}
                {step === "done" && <>✓ Bienvenue</>}
              </span>
            </button>

            <div className="mt-6 flex items-center gap-3">
              <span className="flex-1 h-px bg-white/15" />
              <span className="text-[10px] uppercase tracking-wider text-white/40">ou</span>
              <span className="flex-1 h-px bg-white/15" />
            </div>

            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/15 text-sm py-2.5 transition-colors"
            >
              Continuer avec mon compte La Poste (SSO)
            </button>

            <p className="mt-5 text-[11px] text-white/40 text-center leading-relaxed">
              En vous connectant, vous acceptez la charte d'usage de l'IA générative La Poste.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Bullet({
  icon: Icon,
  label,
  sub,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
  delay: string;
}) {
  return (
    <div className="flex items-start gap-3 animate-fade-up" style={{ animationDelay: delay }}>
      <div className="h-9 w-9 rounded-lg bg-white/10 backdrop-blur ring-1 ring-white/20 grid place-items-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-white/50">{sub}</div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-white/50">{label}</span>
      <div className="mt-1 flex items-center gap-3 rounded-xl bg-white/5 ring-1 ring-white/15 focus-within:ring-white/40 transition-all px-3.5 py-2.5">
        <Icon className="h-4 w-4 text-white/50 shrink-0" />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </label>
  );
}
