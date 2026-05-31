"use client";

import { useEffect, useState } from "react";
import {
  ListChecks,
  MessageCircleQuestion,
  Languages,
  AlertCircle,
  Sparkles,
  Send,
  RefreshCw,
  User2,
  Star,
  ShieldAlert,
  Crown,
  Phone,
  Mail,
  FileText,
  Package,
  CheckSquare,
  UserCheck,
  Search as SearchIcon,
  Send as SendIcon,
  AlertTriangle,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import {
  api,
  restorePii,
  summarizePii,
  type CustomerHistory,
  type PiiStats,
  type RagSource,
  type SimilarTicket,
  type Ticket,
} from "@/lib/api";
import Link from "next/link";
import { GitBranch, ChevronRight } from "lucide-react";
import { BookOpen, ShieldCheck } from "lucide-react";
import { CHANNEL_LABEL, cn, TONE_LABEL, TYPE_LABEL } from "@/lib/utils";

type Tab = "analyse" | "chat" | "traduire" | "client";

export default function AssistantPanel({ ticket }: { ticket: Ticket }) {
  const [tab, setTab] = useState<Tab>("analyse");
  return (
    <div className="bg-card rounded-xl ring-1 ring-border flex flex-col h-full">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand" />
        <h2 className="text-sm font-semibold">Assistant IA</h2>
        <span className="text-xs text-muted-foreground ml-auto">Llama 3 · open source · streaming</span>
      </div>
      <div className="px-2 pt-2 flex gap-1 border-b border-border-soft flex-wrap">
        <TabBtn active={tab === "analyse"} onClick={() => setTab("analyse")} icon={ListChecks}>
          Analyse
        </TabBtn>
        <TabBtn active={tab === "client"} onClick={() => setTab("client")} icon={User2}>
          Client
        </TabBtn>
        <TabBtn active={tab === "chat"} onClick={() => setTab("chat")} icon={MessageCircleQuestion}>
          Chatbot
        </TabBtn>
        <TabBtn active={tab === "traduire"} onClick={() => setTab("traduire")} icon={Languages}>
          Traduire
        </TabBtn>
      </div>
      <div className="p-5 overflow-y-auto flex-1">
        {tab === "analyse" && <AnalyseTab ticket={ticket} />}
        {tab === "client" && <CustomerTab ticket={ticket} />}
        {tab === "chat" && <ChatTab ticketId={ticket.id} />}
        {tab === "traduire" && <TranslateTab ticket={ticket} />}
      </div>
    </div>
  );
}

function CustomerTab({ ticket }: { ticket: Ticket }) {
  const [history, setHistory] = useState<CustomerHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const email = ticket.customer.email;

  useEffect(() => {
    if (!email) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .customerHistory(email)
      .then(setHistory)
      .catch(() => setHistory(null))
      .finally(() => setLoading(false));
  }, [email]);

  if (!email) {
    return (
      <div className="text-sm text-muted-foreground">
        Pas d'email associé à ce client (canal {ticket.channel}). L'historique n'est pas disponible.
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Chargement de l'historique…</div>;
  }

  const totalAll = (history?.total_past_tickets ?? 0) + 1; // +1 pour le ticket courant

  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Identité</div>
        <div className="rounded-lg bg-muted px-3 py-2.5">
          <div className="font-medium text-strong-foreground">{ticket.customer.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5 break-all">{email}</div>
        </div>
      </div>

      {history && history.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {history.tags.includes("vip") && (
            <Tag tone="gold" icon={Crown} label="VIP" />
          )}
          {history.tags.includes("fragile") && (
            <Tag tone="amber" icon={ShieldAlert} label="Client fragile" />
          )}
          {history.tags.includes("escalade-en-cours") && (
            <Tag tone="red" icon={ShieldAlert} label="Escalade en cours" />
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Tickets total" value={totalAll.toString()} />
        <Stat
          label="Litiges ouverts"
          value={(history?.open_disputes ?? 0).toString()}
          accent={(history?.open_disputes ?? 0) > 0 ? "danger" : undefined}
        />
        <Stat
          label="Satisfaction moy."
          value={
            history?.avg_satisfaction != null ? `${history.avg_satisfaction}/5` : "-"
          }
        />
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
          Historique des échanges
        </div>
        {!history || history.tickets.length === 0 ? (
          <div className="rounded-lg bg-muted px-3 py-3 text-xs text-muted-foreground">
            Premier ticket avec ce client - pas d'historique antérieur.
          </div>
        ) : (
          <ol className="relative border-l-2 border-border ml-2 pl-4 space-y-3">
            {history.tickets.map((t) => (
              <li key={t.id} className="relative">
                <span
                  className={cn(
                    "absolute -left-[22px] top-1.5 h-3 w-3 rounded-full ring-2 ring-white",
                    t.outcome === "resolved" ? "bg-emerald-500" : "bg-amber-500",
                  )}
                />
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-mono">{t.date}</span>
                  <ChannelBadge channel={t.channel} />
                  <span>·</span>
                  <span>{TYPE_LABEL[t.type] || t.type}</span>
                  {t.satisfaction != null && (
                    <span className="ml-auto inline-flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {t.satisfaction}/5
                    </span>
                  )}
                </div>
                <div className="font-medium text-strong-foreground mt-0.5">{t.subject}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t.summary}</div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "danger";
}) {
  return (
    <div className="rounded-lg bg-muted px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{label}</div>
      <div
        className={cn(
          "text-base font-semibold",
          accent === "danger" ? "text-red-600" : "text-strong-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Tag({
  tone,
  icon: Icon,
  label,
}: {
  tone: "amber" | "red" | "gold";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  const cls = {
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    gold: "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-900 ring-amber-300",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ring-1",
        cls,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const Icon = channel === "appel" ? Phone : channel === "appel" ? Phone : channel === "email" ? Mail : FileText;
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Icon className="h-3 w-3" />
      {CHANNEL_LABEL[channel] || channel}
    </span>
  );
}

function TabBtn({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors",
        active ? "bg-brand-soft text-brand" : "text-foreground hover:bg-muted",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

function AnalyseTab({ ticket }: { ticket: Ticket }) {
  const a = ticket.analysis;
  const [similar, setSimilar] = useState<SimilarTicket[]>([]);
  const [simLoading, setSimLoading] = useState(true);

  useEffect(() => {
    setSimLoading(true);
    api
      .similarTickets(ticket.id, 3)
      .then(setSimilar)
      .catch(() => setSimilar([]))
      .finally(() => setSimLoading(false));
  }, [ticket.id]);

  return (
    <div className="space-y-4 text-sm">
      <Section title="Résumé">
        <p className="text-foreground">{a.summary}</p>
      </Section>

      <Section title="Signaux">
        <div className="grid grid-cols-2 gap-2">
          <KV label="Urgence" value={a.urgency} accent={a.urgency === "haute" ? "danger" : "default"} />
          <KV label="Ton client" value={TONE_LABEL[a.tone] || a.tone} />
          <KV label="Langue" value={a.language.toUpperCase()} />
          <KV label="Type" value={a.type.replace(/_/g, " ")} />
        </div>
        <div className="mt-2 text-xs text-muted-foreground italic">
          « {a.urgency_reason} »
        </div>
      </Section>

      <Section title="Informations extraites">
        <ul className="space-y-1.5 text-sm">
          {a.key_info.numero_colis && (
            <KeyVal label="N° colis" value={a.key_info.numero_colis} />
          )}
          {a.key_info.date_evenement && (
            <KeyVal label="Date évènement" value={a.key_info.date_evenement} />
          )}
          {a.key_info.montant && <KeyVal label="Montant" value={a.key_info.montant} />}
          {a.key_info.adresse && <KeyVal label="Adresse" value={a.key_info.adresse} />}
          {a.key_info.autre && a.key_info.autre.length > 0 && (
            <li className="text-foreground">
              <span className="text-muted-foreground">Autres : </span>
              {a.key_info.autre.join(", ")}
            </li>
          )}
        </ul>
      </Section>

      {a.missing_info.length > 0 && (
        <Section title="Informations manquantes" tone="warning">
          <ul className="space-y-1">
            {a.missing_info.map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <SuggestedActions actions={a.suggested_actions} />

      <div>
        <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
          <GitBranch className="h-3 w-3" />
          Tickets similaires en cours
          {similar.length > 0 && (
            <span className="ml-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-brand-soft text-brand">
              {similar.length}
            </span>
          )}
        </div>
        {simLoading ? (
          <div className="text-xs text-muted-foreground/70">Recherche en cours…</div>
        ) : similar.length === 0 ? (
          <div className="text-xs text-muted-foreground/70 italic">
            Aucun ticket similaire en file actuellement.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {similar.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/tickets/${s.id}`}
                  className="group flex items-start gap-2 rounded-lg p-2 -mx-2 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">{s.customer_name}</span>
                      <span>·</span>
                      <span>{TYPE_LABEL[s.type] || s.type}</span>
                      <span>·</span>
                      <span
                        className={cn(
                          "font-medium",
                          s.urgency === "haute" && "text-red-600",
                          s.urgency === "moyenne" && "text-amber-600",
                          s.urgency === "basse" && "text-emerald-600",
                        )}
                      >
                        {s.urgency}
                      </span>
                    </div>
                    <div className="text-sm text-strong-foreground truncate">{s.subject}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.summary}</div>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground/70 shrink-0">
                    {Math.round(s.score * 100)}%
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground self-center shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {similar.length > 0 && (
          <p className="text-[11px] text-muted-foreground italic mt-2">
            💡 Un autre conseiller a peut-être déjà rédigé une réponse réutilisable.
          </p>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  tone,
}: {
  title: string;
  children: React.ReactNode;
  tone?: "warning";
}) {
  return (
    <div>
      <div
        className={cn(
          "text-[11px] uppercase tracking-wider font-semibold mb-1.5",
          tone === "warning" ? "text-amber-600" : "text-muted-foreground",
        )}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function KV({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "danger" | "default";
}) {
  return (
    <div className="rounded-lg bg-muted px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{label}</div>
      <div
        className={cn(
          "text-sm font-medium",
          accent === "danger" ? "text-red-600" : "text-strong-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function KeyVal({ label, value }: { label: string; value: string }) {
  return (
    <li className="text-sm flex items-baseline gap-2">
      <span className="text-muted-foreground text-xs w-32 shrink-0">{label}</span>
      <span className="font-mono text-strong-foreground">{value}</span>
    </li>
  );
}

function ChatTab({ ticketId }: { ticketId: string }) {
  type ChatMessage = {
    role: "user" | "assistant";
    text: string;
    sources?: RagSource[];
    piiStats?: PiiStats;
  };
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Bonjour Marie ! Posez-moi une question sur la procédure interne ou ce ticket en particulier.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask() {
    if (!input.trim() || loading) return;
    const q = input;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }, { role: "assistant", text: "" }]);
    setLoading(true);
    let mapping: Record<string, string> = {};
    let rawAccum = "";
    try {
      await api.chatStream(q, ticketId, (e) => {
        if (e.type === "sources") {
          setMessages((m) => {
            const next = [...m];
            const last = next[next.length - 1];
            if (last && last.role === "assistant") next[next.length - 1] = { ...last, sources: e.sources };
            return next;
          });
        } else if (e.type === "pii") {
          mapping = e.mapping;
          setMessages((m) => {
            const next = [...m];
            const last = next[next.length - 1];
            if (last && last.role === "assistant") next[next.length - 1] = { ...last, piiStats: e.stats };
            return next;
          });
        } else if (e.type === "delta") {
          rawAccum += e.text;
          const restored = restorePii(rawAccum, mapping);
          setMessages((m) => {
            const next = [...m];
            const last = next[next.length - 1];
            if (last && last.role === "assistant") next[next.length - 1] = { ...last, text: restored };
            return next;
          });
        }
      });
    } catch {
      setMessages((m) => {
        const next = [...m];
        const last = next[next.length - 1];
        if (last && last.role === "assistant" && !last.text)
          next[next.length - 1] = { ...last, text: "Erreur lors de l'appel à l'assistant." };
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full -m-5">
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className="space-y-1">
            <div
              className={cn(
                "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-brand text-white ml-auto rounded-br-sm"
                  : "bg-muted text-strong-foreground rounded-bl-sm",
              )}
            >
              {m.text || (loading && i === messages.length - 1 ? <Typing /> : null)}
            </div>
            {(m.sources?.length || m.piiStats) && (
              <div className="flex flex-wrap gap-1.5 pl-1 items-center">
                {m.sources?.map((s, j) => (
                  <span
                    key={j}
                    className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ring-1 ring-border bg-card text-foreground"
                    title={`Score de pertinence : ${s.score}`}
                  >
                    <BookOpen className="h-2.5 w-2.5 text-brand" />
                    {s.doc_title}
                    {s.section ? ` - ${s.section}` : ""}
                  </span>
                ))}
                {m.piiStats && Object.keys(m.piiStats).length > 0 && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    title={summarizePii(m.piiStats)}
                  >
                    <ShieldCheck className="h-2.5 w-2.5" />
                    PII protégée
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-border-soft p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Ex. Quel est le délai d'indemnisation pour un colis perdu ?"
          className="flex-1 text-sm p-2 rounded-md ring-1 ring-border focus:ring-brand focus:outline-none"
        />
        <button
          onClick={ask}
          disabled={loading || !input.trim()}
          className="px-3 rounded-md bg-brand text-white disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Typing() {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground/70">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: "0ms" }} />
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: "200ms" }} />
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: "400ms" }} />
    </span>
  );
}

function TranslateTab({ ticket }: { ticket: Ticket }) {
  const [target, setTarget] = useState("en");
  const [text, setText] = useState(ticket.raw_message);
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  async function translate() {
    setLoading(true);
    try {
      const { translation } = await api.translate(text, target);
      setOut(translation);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="text-xs text-muted-foreground mb-1">Texte source</div>
        <textarea
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full p-2 rounded-md ring-1 ring-border text-sm focus:ring-brand focus:outline-none resize-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Vers :</span>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="text-sm rounded-md ring-1 ring-border px-2 py-1"
        >
          <option value="fr">Français</option>
          <option value="en">Anglais</option>
          <option value="es">Espagnol</option>
          <option value="de">Allemand</option>
          <option value="it">Italien</option>
        </select>
        <button
          onClick={translate}
          disabled={loading}
          className="ml-auto text-xs inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand text-white disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <Languages className="h-3 w-3" />
          )}
          Traduire
        </button>
      </div>
      {out && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Traduction</div>
          <div className="p-3 rounded-md bg-brand-soft/40 ring-1 ring-brand-soft text-sm whitespace-pre-wrap">
            {out}
          </div>
        </div>
      )}
    </div>
  );
}

function pickActionIcon(text: string) {
  const t = text.toLowerCase();
  if (t.includes("enquête") || t.includes("enquete") || t.includes("dossier")) return Package;
  if (t.includes("vérif") || t.includes("verif") || t.includes("statut") || t.includes("suivi")) return SearchIcon;
  if (t.includes("contact") || t.includes("livreur") || t.includes("client") || t.includes("conseiller")) return UserCheck;
  if (t.includes("envoy") || t.includes("transmet") || t.includes("transfer")) return SendIcon;
  if (t.includes("indemn") || t.includes("rembour")) return CheckSquare;
  if (t.includes("escalade") || t.includes("urgent") || t.includes("alerte")) return AlertTriangle;
  return CheckSquare;
}

function SuggestedActions({ actions }: { actions: string[] }) {
  if (!actions || actions.length === 0) return null;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-brand" />
          Actions suggérées
        </div>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-brand-soft text-brand inline-flex items-center gap-1">
          <Sparkles className="h-2.5 w-2.5" />
          IA
        </span>
      </div>
      <ul className="space-y-2">
        {actions.map((s, i) => {
          const Icon = pickActionIcon(s);
          const recommended = i === 0;
          return (
            <li key={i}>
              <button
                type="button"
                className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ring-1 ring-border bg-card hover:bg-muted text-left transition-colors"
              >
                <Icon className="h-4 w-4 text-foreground shrink-0" />
                <span className="flex-1 text-sm text-foreground">{s}</span>
                {recommended && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent text-strong-foreground tracking-wide">
                    RECOMMANDÉ
                  </span>
                )}
                <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground/70 group-hover:text-foreground shrink-0" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
