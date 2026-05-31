"use client";

import { use, useEffect, useState } from "react";
import { api, type Ticket } from "@/lib/api";
import TicketHeader from "@/components/TicketHeader";
import ConversationPanel from "@/components/ConversationPanel";
import AssistantPanel from "@/components/AssistantPanel";

export default function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .ticket(id)
      .then(setTicket)
      .catch((e) => setErr(String(e)));
  }, [id]);

  if (err)
    return (
      <div className="p-8 text-sm text-red-600">
        Erreur : {err}
      </div>
    );
  if (!ticket)
    return (
      <div className="p-8 text-sm text-muted-foreground">Chargement du ticket…</div>
    );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-5 max-w-7xl mx-auto">
      <TicketHeader ticket={ticket} onTicketUpdate={setTicket} />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
        <div className="lg:col-span-3">
          <ConversationPanel ticket={ticket} onTicketUpdate={setTicket} />
        </div>
        <div className="lg:col-span-2 lg:min-h-[600px]">
          <AssistantPanel ticket={ticket} />
        </div>
      </div>
    </div>
  );
}
