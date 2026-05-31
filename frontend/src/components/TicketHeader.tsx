"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  FileText,
  User2,
  Globe,
  CornerUpLeft,
  CheckCircle2,
  RefreshCw,
  X,
} from "lucide-react";
import {
  CHANNEL_LABEL,
  LANG_FLAG,
  STATUS_LABEL,
  TYPE_LABEL,
  TONE_LABEL,
  URGENCY_STYLES,
  cn,
  timeAgo,
} from "@/lib/utils";
import { api, type Ticket } from "@/lib/api";

const CHANNEL_ICON = { email: Mail, appel: Phone, formulaire: FileText } as const;

const TEAM = [
  { name: "Thomas B.", role: "Conseiller N2", load: 9 },
  { name: "Aïcha M.", role: "Conseillère N2", load: 14 },
  { name: "Julien R.", role: "Conseiller N1", load: 7 },
  { name: "Cellule réclamations N3", role: "Niveau 3", load: 0 },
];

export default function TicketHeader({
  ticket,
  onTicketUpdate,
}: {
  ticket: Ticket;
  onTicketUpdate?: (t: Ticket) => void;
}) {
  const Icon = CHANNEL_ICON[ticket.channel];
  const { analysis } = ticket;
  const [showTransfer, setShowTransfer] = useState(false);
  const [closeBusy, setCloseBusy] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [transferDone, setTransferDone] = useState<string | null>(null);

  const isClosed = ticket.status === "closed";

  async function closeTicket() {
    if (closeBusy) return;
    setCloseBusy(true);
    try {
      const updated = await api.closeTicket(ticket.id, true);
      onTicketUpdate?.(updated);
    } finally {
      setCloseBusy(false);
    }
  }

  function confirmTransfer() {
    if (!transferTarget) return;
    // Démo : on simule le transfert sans persistance côté backend.
    setTransferDone(transferTarget);
    setTimeout(() => {
      setShowTransfer(false);
      setTransferDone(null);
      setTransferTarget(null);
    }, 1800);
  }

  return (
    <div className="bg-card rounded-xl ring-1 ring-border p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <Link href="/" className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-3 w-3" />
          Retour à la file
        </Link>
        <span>·</span>
        <span className="font-mono">{ticket.id}</span>
      </div>
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="h-11 w-11 rounded-full bg-muted text-foreground grid place-items-center text-sm font-semibold shrink-0">
            {ticket.customer.name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold tracking-tight">{ticket.subject}</h1>
              <span
                className={cn(
                  "text-[11px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1",
                  ticket.status === "open" && "bg-blue-50 text-blue-700",
                  ticket.status === "waiting" && "bg-amber-50 text-amber-700",
                  ticket.status === "closed" && "bg-muted text-foreground",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    ticket.status === "open" && "bg-blue-500",
                    ticket.status === "waiting" && "bg-amber-500",
                    ticket.status === "closed" && "bg-slate-400",
                  )}
                />
                {STATUS_LABEL[ticket.status]}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{ticket.customer.name}</span>
              {ticket.customer.email && (
                <>
                  <span>·</span>
                  <span>{ticket.customer.email}</span>
                </>
              )}
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {CHANNEL_LABEL[ticket.channel]}
              </span>
              <span>·</span>
              <span>{timeAgo(ticket.received_at)}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {LANG_FLAG[analysis.language] || ""} {analysis.language.toUpperCase()}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ring-1 ${URGENCY_STYLES[analysis.urgency]}`}
              >
                Urgence {analysis.urgency}
              </span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-foreground">
                {TYPE_LABEL[analysis.type] || analysis.type}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ton : {TONE_LABEL[analysis.tone] || analysis.tone}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
          <button
            onClick={() => setShowTransfer(true)}
            disabled={isClosed}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg ring-1 ring-border bg-card hover:bg-muted text-foreground disabled:opacity-50"
          >
            <CornerUpLeft className="h-3.5 w-3.5" />
            Transférer
          </button>
          <button
            onClick={closeTicket}
            disabled={isClosed || closeBusy}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-[#0b1e44] hover:bg-[#142847] text-white disabled:opacity-50 dark:bg-strong-foreground dark:text-card"
          >
            {closeBusy ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {isClosed ? "Clôturé" : "Clôturer"}
          </button>
        </div>
      </div>

      {showTransfer && (
        <TransferModal
          ticket={ticket}
          team={TEAM}
          selected={transferTarget}
          onSelect={setTransferTarget}
          onConfirm={confirmTransfer}
          onClose={() => {
            setShowTransfer(false);
            setTransferTarget(null);
          }}
          done={transferDone}
        />
      )}
    </div>
  );
}

function TransferModal({
  ticket,
  team,
  selected,
  onSelect,
  onConfirm,
  onClose,
  done,
}: {
  ticket: Ticket;
  team: typeof TEAM;
  selected: string | null;
  onSelect: (name: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  done: string | null;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4 animate-fade-up"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-card ring-1 ring-border shadow-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-border-soft flex items-center gap-2">
          <CornerUpLeft className="h-4 w-4 text-brand" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Transférer le ticket</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choisissez le membre de l'équipe à qui réassigner ce ticket.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="p-6 text-center space-y-2">
            <div className="inline-flex h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="text-sm font-medium">Transféré à {done}</div>
            <p className="text-xs text-muted-foreground">
              Ticket {ticket.id} retiré de votre file. Vous pouvez fermer cette fenêtre.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border-soft max-h-72 overflow-y-auto">
              {team.map((m) => (
                <li key={m.name}>
                  <button
                    onClick={() => onSelect(m.name)}
                    className={cn(
                      "w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-muted",
                      selected === m.name && "bg-brand-soft",
                    )}
                  >
                    <div className="h-9 w-9 rounded-full bg-muted text-foreground grid place-items-center text-xs font-semibold shrink-0">
                      {m.name
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.role}</div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {m.load} tickets
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <div className="px-5 py-3 border-t border-border-soft flex items-center justify-end gap-2 bg-muted/30">
              <button
                onClick={onClose}
                className="text-sm px-3 py-1.5 rounded-md text-foreground hover:bg-muted"
              >
                Annuler
              </button>
              <button
                onClick={onConfirm}
                disabled={!selected}
                className="text-sm inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white hover:bg-brand/90 disabled:opacity-40"
              >
                <CornerUpLeft className="h-3.5 w-3.5" />
                Confirmer le transfert
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
