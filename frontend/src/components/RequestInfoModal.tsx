"use client";

import { useEffect, useState } from "react";
import { X, RefreshCw, Send, AlertCircle, MailQuestion } from "lucide-react";
import { api, type Ticket } from "@/lib/api";

export default function RequestInfoModal({
  ticket,
  onClose,
  onSent,
}: {
  ticket: Ticket;
  onClose: () => void;
  onSent: (t: Ticket) => void;
}) {
  const [emailBody, setEmailBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api
      .requestInfo(ticket.id, ticket.analysis.language)
      .then(({ email_body }) => setEmailBody(email_body))
      .catch(() => setEmailBody("Erreur lors de la génération du message."))
      .finally(() => setLoading(false));
  }, [ticket.id, ticket.analysis.language]);

  async function send() {
    if (!emailBody.trim() || sending) return;
    setSending(true);
    try {
      const { ticket: updated } = await api.sendInfoRequest(
        ticket.id,
        emailBody,
        ticket.analysis.language,
      );
      onSent(updated);
      onClose();
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4 animate-fade-up"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-xl ring-1 ring-border w-full max-w-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border-soft flex items-center gap-2">
          <MailQuestion className="h-4 w-4 text-brand" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Demander un complément d'information</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Mail pré-rédigé par l'IA - à {ticket.customer.email || ticket.customer.name}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground/70 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {ticket.analysis.missing_info.length > 0 && (
            <div className="rounded-lg bg-amber-50 ring-1 ring-amber-200 p-3 text-sm">
              <div className="flex items-center gap-1.5 text-amber-700 font-medium mb-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Informations détectées comme manquantes
              </div>
              <ul className="text-amber-800 list-disc list-inside ml-1 space-y-0.5">
                {ticket.analysis.missing_info.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">
              Corps du mail
            </label>
            {loading ? (
              <div className="rounded-lg ring-1 ring-border p-4 flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Rédaction en cours…
              </div>
            ) : (
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={10}
                className="w-full text-sm p-3 rounded-lg ring-1 ring-border focus:ring-brand focus:outline-none resize-none"
              />
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            En envoyant, le ticket passe au statut <span className="font-medium text-amber-700">"En attente d'info"</span>{" "}
            et est conservé sur votre file.
          </p>
        </div>

        <div className="px-5 py-3 border-t border-border-soft flex items-center justify-end gap-2 bg-muted">
          <button
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded-md text-foreground hover:bg-muted"
          >
            Annuler
          </button>
          <button
            onClick={send}
            disabled={loading || sending}
            className="text-sm inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand text-white hover:bg-brand/90 disabled:opacity-40"
          >
            {sending ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Envoi…
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Envoyer la demande
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
