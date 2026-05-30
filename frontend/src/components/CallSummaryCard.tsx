"use client";

import { Phone, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import type { CallSummary } from "@/lib/api";
import { TONE_LABEL } from "@/lib/utils";

export default function CallSummaryCard({ summary }: { summary: CallSummary }) {
  return (
    <div className="rounded-xl ring-1 ring-brand-soft bg-gradient-to-br from-brand-soft/60 to-white p-5 animate-fade-up">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-lg bg-brand text-white grid place-items-center">
          <Phone className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wider text-brand font-semibold">
            Résumé d'appel automatique
          </div>
          <div className="text-[11px] text-muted-foreground">
            Généré par l'IA à la fin de l'appel · ton : {TONE_LABEL[summary.tonality] || summary.tonality}
            {summary.duration_estimate ? ` · durée ${summary.duration_estimate}` : ""}
          </div>
        </div>
        {summary.follow_up_needed ? (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Suivi requis
          </span>
        ) : (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Résolu en ligne
          </span>
        )}
      </div>

      <p className="text-sm text-strong-foreground font-medium">{summary.client_demand}</p>

      {summary.key_facts.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">À retenir</div>
          <ul className="space-y-1">
            {summary.key_facts.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-brand mt-1.5 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.engagements.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] uppercase tracking-wider text-amber-600 mb-1.5">
            Engagements pris par le conseiller
          </div>
          <ul className="space-y-1">
            {summary.engagements.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
