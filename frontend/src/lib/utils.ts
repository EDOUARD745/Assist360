import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const URGENCY_STYLES: Record<string, string> = {
  haute: "bg-red-50 text-red-700 ring-red-200",
  moyenne: "bg-amber-50 text-amber-700 ring-amber-200",
  basse: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export const URGENCY_DOT: Record<string, string> = {
  haute: "bg-red-500",
  moyenne: "bg-amber-500",
  basse: "bg-emerald-500",
};

export const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  appel: "Appel",
  formulaire: "Formulaire",
};

export const TYPE_LABEL: Record<string, string> = {
  reclamation: "Réclamation",
  demande_info: "Demande d'info",
  suivi_colis: "Suivi colis",
  reclamation_indemnisation: "Indemnisation",
  changement_adresse: "Changement d'adresse",
  autre: "Autre",
};

export const LANG_FLAG: Record<string, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  es: "🇪🇸",
  de: "🇩🇪",
  it: "🇮🇹",
};

export const STATUS_LABEL: Record<string, string> = {
  open: "En cours",
  waiting: "En attente d'info",
  closed: "Clôturé",
};

export const STATUS_DOT: Record<string, string> = {
  open: "bg-blue-500",
  waiting: "bg-amber-500",
  closed: "bg-slate-300",
};

export const TONE_LABEL: Record<string, string> = {
  frustre: "frustré",
  inquiet: "inquiet",
  neutre: "neutre",
  poli: "poli",
  colere: "en colère",
};

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return new Date(iso).toLocaleDateString("fr-FR");
}
