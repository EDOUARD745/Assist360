"use client";

import Link from "next/link";
import { ArrowLeft, Mail, Phone, FileText, User2, Globe } from "lucide-react";
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
import type { Ticket } from "@/lib/api";

const CHANNEL_ICON = { email: Mail, appel: Phone, formulaire: FileText } as const;

export default function TicketHeader({ ticket }: { ticket: Ticket }) {
  const Icon = CHANNEL_ICON[ticket.channel];
  const { analysis } = ticket;
  return (
    <div className="bg-card rounded-xl ring-1 ring-border p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <Link
          href="/"
          className="flex items-center gap-1 hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Retour à la file
        </Link>
        <span>·</span>
        <span className="font-mono">{ticket.id}</span>
      </div>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">{ticket.subject}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-foreground">
            <span className="inline-flex items-center gap-1">
              <User2 className="h-3 w-3" /> {ticket.customer.name}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Icon className="h-3 w-3" /> {CHANNEL_LABEL[ticket.channel]}
            </span>
            <span>·</span>
            <span>{timeAgo(ticket.received_at)}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Globe className="h-3 w-3" /> {LANG_FLAG[analysis.language] || ""} {analysis.language.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              ticket.status === "open" && "bg-blue-50 text-blue-700",
              ticket.status === "waiting" && "bg-amber-50 text-amber-700",
              ticket.status === "closed" && "bg-muted text-foreground",
            )}
          >
            {STATUS_LABEL[ticket.status]}
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ring-1 ${URGENCY_STYLES[analysis.urgency]}`}
          >
            Urgence {analysis.urgency}
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-foreground">
            {TYPE_LABEL[analysis.type] || analysis.type}
          </span>
          <span className="text-xs text-muted-foreground">
            ton : {TONE_LABEL[analysis.tone] || analysis.tone}
          </span>
        </div>
      </div>
    </div>
  );
}
