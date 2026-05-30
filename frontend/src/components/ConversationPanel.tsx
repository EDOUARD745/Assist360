"use client";

import { useEffect, useRef, useState } from "react";
import {
  Send,
  RefreshCw,
  Sparkles,
  MailQuestion,
  CheckCircle2,
  RotateCcw,
  Lock,
  Mail,
  Heart,
  Zap,
  Briefcase,
} from "lucide-react";
import { api, restorePii, summarizePii, type PiiStats, type Ticket, type Tone } from "@/lib/api";
import { ShieldCheck } from "lucide-react";
import CallSummaryCard from "./CallSummaryCard";
import RequestInfoModal from "./RequestInfoModal";
import { STATUS_LABEL, cn } from "@/lib/utils";

export default function ConversationPanel({
  ticket,
  onTicketUpdate,
}: {
  ticket: Ticket;
  onTicketUpdate: (t: Ticket) => void;
}) {
  const [draft, setDraft] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [askResolution, setAskResolution] = useState(false);
  const [closeBusy, setCloseBusy] = useState(false);
  const [showRequestInfo, setShowRequestInfo] = useState(false);
  const [lastTone, setLastTone] = useState<Tone>(null);
  const [piiStats, setPiiStats] = useState<PiiStats | null>(null);
  const [aiOriginal, setAiOriginal] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const targetLang = ticket.analysis.language;
  const isClosed = ticket.status === "closed";
  const hasMissingInfo = (ticket.analysis.missing_info?.length ?? 0) > 0;
  const hasReplies = ticket.messages.length > 0;

  useEffect(() => {
    // scroll to the latest message when the thread grows
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [ticket.messages.length]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function generate(tone: Tone = null) {
    if (generating) return;
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setGenerating(true);
    setLastTone(tone);
    setDraft("");
    setPiiStats(null);
    setAiOriginal(null);
    let mapping: Record<string, string> = {};
    let raw = "";
    try {
      await api.suggestStream(
        ticket.id,
        (e) => {
          if (e.type === "pii") {
            mapping = e.mapping;
            setPiiStats(e.stats);
          } else if (e.type === "delta") {
            raw += e.text;
            setDraft(restorePii(raw, mapping));
          }
        },
        { target_language: targetLang, tone },
        ctl.signal,
      );
      setAiOriginal(restorePii(raw, mapping));
    } catch (err) {
      if ((err as { name?: string })?.name !== "AbortError") {
        setDraft((d) => d + "\n[Erreur de génération]");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function send() {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      const { ticket: updated } = await api.sendMessage(
        ticket.id,
        draft,
        targetLang,
        aiOriginal ?? undefined,
      );
      onTicketUpdate(updated);
      setDraft("");
      setAiOriginal(null);
      setAskResolution(true);
    } finally {
      setSending(false);
    }
  }

  async function resolve(resolved: boolean) {
    setCloseBusy(true);
    try {
      const updated = await api.closeTicket(ticket.id, resolved);
      onTicketUpdate(updated);
      setAskResolution(false);
    } finally {
      setCloseBusy(false);
    }
  }

  async function reopen() {
    setCloseBusy(true);
    try {
      const updated = await api.closeTicket(ticket.id, false);
      onTicketUpdate(updated);
    } finally {
      setCloseBusy(false);
    }
  }

  function handleInfoSent(updated: Ticket) {
    onTicketUpdate(updated);
    setShowRequestInfo(false);
  }

  return (
    <div className="bg-card rounded-xl ring-1 ring-border flex flex-col">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <h2 className="text-sm font-semibold">Conversation</h2>
        <span className="text-xs text-muted-foreground/70">
          {1 + ticket.messages.length} message{ticket.messages.length > 0 ? "s" : ""}
        </span>
        <span
          className={cn(
            "ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full",
            ticket.status === "open" && "bg-blue-50 text-blue-700",
            ticket.status === "waiting" && "bg-amber-50 text-amber-700",
            ticket.status === "closed" && "bg-muted text-foreground",
          )}
        >
          {STATUS_LABEL[ticket.status]}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {ticket.channel === "appel" && ticket.call_summary && (
          <CallSummaryCard summary={ticket.call_summary} />
        )}

        {/* Message initial du client */}
        <CustomerBubble
          name={ticket.customer.name}
          email={ticket.customer.email}
          phone={ticket.customer.phone}
          content={
            ticket.channel === "appel" ? (
              <details>
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground mb-2">
                  Voir la transcription complète de l'appel
                </summary>
                <div className="mt-2 whitespace-pre-wrap">{ticket.raw_message}</div>
              </details>
            ) : (
              <span className="whitespace-pre-wrap">{ticket.raw_message}</span>
            )
          }
          translation={ticket.analysis.customer_message_translated}
          when={formatWhen(ticket.received_at)}
        />

        {/* Suite du fil (réponses conseiller, demandes de complément) */}
        {ticket.messages.map((m) => (
          <AgentBubble key={m.id} message={m} customerName={ticket.customer.name} />
        ))}

        <div ref={threadEndRef} />
      </div>

      <div className="border-t border-border p-5">
        {isClosed ? (
          <div className="rounded-xl bg-muted p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-border grid place-items-center">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 text-sm">
              <div className="font-medium text-foreground">Ticket clôturé</div>
              <div className="text-xs text-muted-foreground">
                Le problème a été marqué comme résolu. Ce ticket alimentera l'apprentissage continu.
              </div>
            </div>
            <button
              onClick={reopen}
              disabled={closeBusy}
              className="text-xs inline-flex items-center gap-1 px-2.5 py-1 rounded-md ring-1 ring-border hover:bg-card"
            >
              <RotateCcw className="h-3 w-3" />
              Rouvrir
            </button>
          </div>
        ) : askResolution ? (
          <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-4 animate-fade-up">
            <div className="text-sm font-medium text-emerald-900">
              ✓ Votre réponse a été envoyée à {ticket.customer.name}
            </div>
            <div className="text-xs text-emerald-700 mt-1">
              Le problème du client est-il résolu ? Cette information sert au suivi et aux KPIs.
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => resolve(true)}
                disabled={closeBusy}
                className="text-sm inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Oui, clôturer
              </button>
              <button
                onClick={() => resolve(false)}
                disabled={closeBusy}
                className="text-sm px-3 py-1.5 rounded-md ring-1 ring-border bg-card hover:bg-muted"
              >
                Non, garder ouvert (suivi assuré par moi)
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <label className="text-xs font-medium text-foreground">
                {hasReplies ? "Nouveau message" : "Votre réponse"}{" "}
                {targetLang !== "fr" ? `(en ${targetLang})` : ""}
              </label>
              <div className="flex items-center gap-1.5">
                {hasMissingInfo && ticket.status !== "waiting" && (
                  <button
                    onClick={() => setShowRequestInfo(true)}
                    className="text-xs inline-flex items-center gap-1 px-2.5 py-1 rounded-md ring-1 ring-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100"
                    title="L'IA a détecté des infos manquantes - proposer un mail de complément"
                  >
                    <MailQuestion className="h-3 w-3" />
                    Demander un complément
                  </button>
                )}
                <button
                  onClick={() => generate(null)}
                  disabled={generating}
                  className="text-xs inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand text-white hover:bg-brand/90 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Génération…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      Suggérer une réponse
                    </>
                  )}
                </button>
              </div>
            </div>
            {draft && (
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                {!generating && (
                  <>
                    <span className="text-[11px] text-muted-foreground mr-1">Régénérer en ton :</span>
                    <ToneChip active={lastTone === "empathique"} onClick={() => generate("empathique")} icon={Heart}>
                      Empathique
                    </ToneChip>
                    <ToneChip active={lastTone === "concis"} onClick={() => generate("concis")} icon={Zap}>
                      Concis
                    </ToneChip>
                    <ToneChip active={lastTone === "formel"} onClick={() => generate("formel")} icon={Briefcase}>
                      Formel
                    </ToneChip>
                  </>
                )}
                {piiStats && Object.keys(piiStats).length > 0 && (
                  <span
                    className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    title={`Données protégées avant envoi au LLM : ${summarizePii(piiStats)}`}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    PII protégée - {summarizePii(piiStats)}
                  </span>
                )}
              </div>
            )}
            <div className="relative">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={8}
                placeholder="Rédigez votre réponse ou utilisez la suggestion IA…"
                className={cn(
                  "w-full text-sm p-3 rounded-lg ring-1 focus:outline-none resize-none transition-all",
                  generating
                    ? "ring-brand bg-brand-soft/30"
                    : "ring-border focus:ring-brand",
                )}
              />
              {generating && (
                <span className="absolute bottom-2 right-3 inline-flex items-center gap-1.5 text-[11px] text-brand">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand animate-ping" />
                  Génération en direct
                </span>
              )}
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-muted-foreground">
                Vous gardez la validation finale avant envoi.
              </div>
              <button
                onClick={send}
                disabled={!draft.trim() || sending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Envoi…
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Envoyer
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {showRequestInfo && (
        <RequestInfoModal
          ticket={ticket}
          onClose={() => setShowRequestInfo(false)}
          onSent={handleInfoSent}
        />
      )}
    </div>
  );
}

function CustomerBubble({
  name,
  email,
  phone,
  content,
  translation,
  when,
}: {
  name: string;
  email: string | null;
  phone: string | null;
  content: React.ReactNode;
  translation: string | null;
  when: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-full bg-border grid place-items-center text-xs font-medium shrink-0">
        {name
          .split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join("")}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground">{name}</span>
          {email && <span>· {email}</span>}
          {phone && <span>· {phone}</span>}
          <span className="ml-auto text-muted-foreground/70">{when}</span>
        </div>
        <div className="rounded-lg bg-muted ring-1 ring-border-soft px-4 py-3 text-sm leading-relaxed">
          {content}
        </div>
        {translation && (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-brand hover:underline">
              Voir la traduction française
            </summary>
            <div className="mt-2 rounded-lg bg-brand-soft/50 ring-1 ring-brand-soft px-3 py-2 text-sm whitespace-pre-wrap text-foreground">
              {translation}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function AgentBubble({
  message,
  customerName,
}: {
  message: import("@/lib/api").ThreadMessage;
  customerName: string;
}) {
  const isInfoRequest = message.kind === "info_request";
  return (
    <div className="flex items-start gap-3 flex-row-reverse animate-fade-up">
      <div className="h-8 w-8 rounded-full bg-accent text-strong-foreground grid place-items-center text-xs font-semibold shrink-0">
        {message.author
          .split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join("")}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-2 flex-wrap justify-end">
          {isInfoRequest && (
            <span className="text-amber-700 font-medium inline-flex items-center gap-1">
              <MailQuestion className="h-3 w-3" />
              Demande de complément
            </span>
          )}
          {!isInfoRequest && (
            <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
              <Mail className="h-3 w-3" />
              Réponse envoyée
            </span>
          )}
          {message.ai_status === "as_is" && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 inline-flex items-center gap-1"
              title="Suggestion IA validée telle quelle par le conseiller"
            >
              <Sparkles className="h-2.5 w-2.5" />
              IA validée
            </span>
          )}
          {message.ai_status === "modified" && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 inline-flex items-center gap-1"
              title="Suggestion IA modifiée par le conseiller avant envoi"
            >
              <Sparkles className="h-2.5 w-2.5" />
              IA modifiée
            </span>
          )}
          {message.ai_status === "no_ai" && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-foreground ring-1 ring-border inline-flex items-center gap-1"
              title="Rédigé directement par le conseiller, sans suggestion IA"
            >
              Rédigé conseiller
            </span>
          )}
          <span className="text-muted-foreground/70">→ {customerName}</span>
          <span className="text-muted-foreground/70">· {formatWhen(message.sent_at)}</span>
        </div>
        <div
          className={cn(
            "rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
            isInfoRequest
              ? "bg-amber-50 ring-1 ring-amber-200 text-amber-950"
              : "bg-brand-soft ring-1 ring-brand/15 text-strong-foreground",
          )}
        >
          {message.content}
        </div>
        <div className="text-xs text-muted-foreground/70 mt-1 text-right">
          Signé : {message.author}
        </div>
      </div>
    </div>
  );
}

function ToneChip({
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
        "text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full ring-1 transition-colors",
        active
          ? "bg-brand text-white ring-brand"
          : "bg-card text-foreground ring-border hover:bg-muted",
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {children}
    </button>
  );
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
