"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Search,
  BookOpen,
  Sparkles,
  Star,
  Bot,
  Clock,
  Eye,
  ArrowLeft,
  Globe,
  Package,
  Mail,
  Building2,
  Repeat,
  ScrollText,
  LayoutList,
} from "lucide-react";
import { api, type KbDoc } from "@/lib/api";
import { cn } from "@/lib/utils";
import AskAiModal from "@/components/AskAiModal";

// Mapping ID doc -> métadonnées d'affichage (catégorie + icône)
const DOC_META: Record<string, { category: string; icon: React.ComponentType<{ className?: string }>; readingMin: number; views: number; favorite?: boolean }> = {
  "01_indemnisation_colis":   { category: "Colis perdu",       icon: Package,    readingMin: 4, views: 1247, favorite: true },
  "02_reexpedition_courrier": { category: "Réexpédition",      icon: Repeat,     readingMin: 3, views: 862 },
  "03_lettre_recommandee":    { category: "Recommandé",        icon: ScrollText, readingMin: 5, views: 612 },
  "04_offres_entreprises":    { category: "Offres pro",        icon: Building2,  readingMin: 4, views: 384 },
  "05_retour_envoyeur":       { category: "Retour NPAI",       icon: Mail,       readingMin: 3, views: 503 },
  "06_envoi_international":   { category: "International",     icon: Globe,      readingMin: 6, views: 729 },
};

const CATEGORIES = [
  { id: "all", label: "Tout", icon: LayoutList },
  { id: "Colis perdu", label: "Colis perdu", icon: Package },
  { id: "Réexpédition", label: "Réexpédition", icon: Repeat },
  { id: "Recommandé", label: "Recommandé", icon: ScrollText },
  { id: "Retour NPAI", label: "Retour NPAI", icon: Mail },
  { id: "International", label: "International", icon: Globe },
  { id: "Offres pro", label: "Offres pro", icon: Building2 },
];

const FAVS_KEY = "assist360_kb_favorites";

function getMeta(d: KbDoc) {
  return DOC_META[d.id] ?? { category: "Autre", icon: BookOpen, readingMin: 5, views: 100 };
}

export default function KbPage() {
  const [docs, setDocs] = useState<KbDoc[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"pertinence" | "recent" | "popular">("pertinence");
  const [askAiOpen, setAskAiOpen] = useState(false);

  useEffect(() => {
    api
      .kb()
      .then((d) => {
        setDocs(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // restore favorites
    try {
      const raw = localStorage.getItem(FAVS_KEY);
      if (raw) setFavorites(new Set(JSON.parse(raw) as string[]));
      else {
        // valeurs par défaut : marquer les "favorite: true" du DOC_META
        const defaults = Object.entries(DOC_META)
          .filter(([, m]) => m.favorite)
          .map(([id]) => id);
        setFavorites(new Set(defaults));
      }
    } catch {
      // ignore
    }
  }, []);

  function toggleFav(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(FAVS_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = docs;
    if (category !== "all") arr = arr.filter((d) => getMeta(d).category === category);
    if (q) arr = arr.filter((d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q));
    if (sort === "popular") arr = [...arr].sort((a, b) => getMeta(b).views - getMeta(a).views);
    else if (sort === "recent") arr = [...arr].slice().reverse();
    return arr;
  }, [docs, query, category, sort]);

  const favs = useMemo(
    () => docs.filter((d) => favorites.has(d.id)),
    [docs, favorites],
  );

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: docs.length };
    for (const d of docs) {
      const c = getMeta(d).category;
      m[c] = (m[c] || 0) + 1;
    }
    return m;
  }, [docs]);

  const active = docs.find((d) => d.id === activeId) ?? null;

  // Mode lecteur (article ouvert)
  if (active) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <button
          onClick={() => setActiveId(null)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la base de connaissances
        </button>
        <article className="bg-card rounded-xl ring-1 ring-border p-5 sm:p-8 animate-fade-up">
          <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-border-soft">
            <div className="flex items-center gap-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand-soft text-brand uppercase tracking-wider">
              {(() => {
                const M = getMeta(active);
                return (
                  <>
                    <M.icon className="h-3 w-3" />
                    {M.category}
                  </>
                );
              })()}
            </div>
            <button
              onClick={() => toggleFav(active.id)}
              className={cn(
                "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md ring-1 transition-colors",
                favorites.has(active.id)
                  ? "bg-amber-50 text-amber-700 ring-amber-200"
                  : "bg-card text-muted-foreground ring-border hover:bg-muted",
              )}
            >
              <Star className={cn("h-3 w-3", favorites.has(active.id) && "fill-amber-400 text-amber-400")} />
              {favorites.has(active.id) ? "Favori" : "Ajouter aux favoris"}
            </button>
          </div>
          <div className="prose prose-slate prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{active.content}</ReactMarkdown>
          </div>
          <div className="mt-6 pt-4 border-t border-border-soft flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{active.filename}</span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {getMeta(active).readingMin} min de lecture
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3" /> {getMeta(active).views.toLocaleString("fr-FR")} vues
              </span>
            </div>
          </div>
        </article>
      </div>
    );
  }

  // Mode parcours (browser)
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-brand" />
            Base de connaissances
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Articles, procédures et réponses types pour traiter vos tickets plus efficacement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCategory(category === "favoris" ? "all" : "favoris")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg ring-1 transition-colors",
              category === "favoris"
                ? "ring-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                : "ring-border bg-card hover:bg-muted text-foreground",
            )}
          >
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            Mes favoris
            {favorites.size > 0 && (
              <span
                className={cn(
                  "text-[10px] font-mono px-1.5 rounded",
                  category === "favoris" ? "bg-amber-200 text-amber-900" : "bg-muted text-muted-foreground",
                )}
              >
                {favorites.size}
              </span>
            )}
          </button>
          <button
            onClick={() => setAskAiOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-accent text-strong-foreground hover:bg-accent/90 font-medium ring-2 ring-transparent hover:ring-accent/40 transition-all shadow-sm hover:shadow-md"
          >
            <Bot className="h-4 w-4" />
            Demander à l'IA
          </button>
        </div>
      </header>

      <div className="flex items-center gap-2 rounded-lg ring-1 ring-border focus-within:ring-brand px-3 py-2 bg-card">
        <Search className="h-4 w-4 text-muted-foreground/70" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un article, une procédure ou un cas client…"
          className="flex-1 bg-transparent outline-none text-sm min-w-0"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-xs text-muted-foreground/70 hover:text-foreground">
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Sidebar catégories */}
        <aside className="lg:col-span-3 bg-card rounded-xl ring-1 ring-border p-3 h-fit lg:sticky lg:top-20">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold px-2 py-1.5">
            Catégories
          </div>
          <ul className="space-y-0.5">
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
                    category === c.id
                      ? "bg-brand-soft text-brand font-medium"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <c.icon className={cn("h-3.5 w-3.5", category === c.id ? "text-brand" : "text-muted-foreground")} />
                  <span className="flex-1 text-left">{c.label}</span>
                  <span
                    className={cn(
                      "text-[10px] font-mono",
                      category === c.id ? "text-brand" : "text-muted-foreground/70",
                    )}
                  >
                    {counts[c.id] ?? 0}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Liste articles */}
        <section className="lg:col-span-9 space-y-4">
          {/* Suggestions IA */}
          <div className="rounded-xl ring-1 ring-amber-200/60 bg-gradient-to-br from-amber-50 to-card dark:from-amber-950/20 dark:to-card p-4 flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 grid place-items-center shrink-0">
              <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-strong-foreground">
                Suggestions IA pour vos tickets en cours
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                D'après votre file d'attente, ces articles pourraient vous être utiles aujourd'hui -
                notamment sur la procédure <span className="font-medium">colis perdu Colissimo</span>.
              </p>
            </div>
            <button
              onClick={() => {
                setQuery("indemnisation colis perdu");
                setCategory("all");
              }}
              className="text-xs font-medium px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white shrink-0"
            >
              Voir
            </button>
          </div>

          {/* Vos favoris */}
          {favs.length > 0 && category === "all" && !query && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                <h2 className="text-sm font-semibold">Vos favoris</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {favs.slice(0, 4).map((d) => (
                  <ArticleCard
                    key={d.id}
                    doc={d}
                    onOpen={() => setActiveId(d.id)}
                    onToggleFav={() => toggleFav(d.id)}
                    isFav={favorites.has(d.id)}
                    compact
                    query={query}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Article list */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">
                {category === "favoris" ? "Mes favoris" : category === "all" ? "Tous les articles" : category}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({(category === "favoris" ? favs.length : filtered.length)} article{(category === "favoris" ? favs.length : filtered.length) > 1 ? "s" : ""})
                </span>
              </h2>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="text-xs rounded-md ring-1 ring-border bg-card px-2 py-1"
              >
                <option value="pertinence">Trier par pertinence</option>
                <option value="popular">Les plus consultés</option>
                <option value="recent">Récents</option>
              </select>
            </div>

            {loading ? (
              <div className="bg-card rounded-xl ring-1 ring-border p-6 text-sm text-muted-foreground">
                Chargement…
              </div>
            ) : (category === "favoris" ? favs : filtered).length === 0 ? (
              <div className="bg-card rounded-xl ring-1 ring-border p-8 text-center text-sm text-muted-foreground">
                {query ? `Aucun résultat pour « ${query} ».` : "Aucun article dans cette catégorie."}
              </div>
            ) : (
              <ul className="space-y-2">
                {(category === "favoris" ? favs : filtered).map((d) => (
                  <li key={d.id}>
                    <ArticleCard
                      doc={d}
                      onOpen={() => setActiveId(d.id)}
                      onToggleFav={() => toggleFav(d.id)}
                      isFav={favorites.has(d.id)}
                      query={query}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </section>
      </div>

      {askAiOpen && <AskAiModal onClose={() => setAskAiOpen(false)} />}
    </div>
  );
}

function ArticleCard({
  doc,
  onOpen,
  onToggleFav,
  isFav,
  compact,
  query,
}: {
  doc: KbDoc;
  onOpen: () => void;
  onToggleFav: () => void;
  isFav: boolean;
  compact?: boolean;
  query: string;
}) {
  const M = getMeta(doc);
  return (
    <article
      onClick={onOpen}
      className="group cursor-pointer rounded-xl ring-1 ring-border bg-card hover:ring-brand/40 hover:shadow-sm transition-all p-4"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-soft text-brand uppercase tracking-wider">
          <M.icon className="h-2.5 w-2.5" />
          {M.category}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav();
          }}
          className="p-0.5 text-muted-foreground hover:text-amber-500"
          aria-label="Favori"
        >
          <Star className={cn("h-4 w-4", isFav && "fill-amber-400 text-amber-400")} />
        </button>
      </div>
      <h3 className={cn("font-semibold text-strong-foreground", compact ? "text-sm" : "text-sm sm:text-base")}>
        {highlight(doc.title, query)}
      </h3>
      {!compact && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {firstParagraph(doc.content)}
        </p>
      )}
      <div className="flex items-center gap-3 mt-2.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" /> {M.readingMin} min
        </span>
        <span className="inline-flex items-center gap-1">
          <Eye className="h-3 w-3" /> {M.views.toLocaleString("fr-FR")} vues
        </span>
      </div>
    </article>
  );
}

function firstParagraph(md: string): string {
  // strip h1 + first non-empty line
  const lines = md.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
  return (lines[0] ?? "").slice(0, 180);
}

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const q = query.trim();
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent/40 text-strong-foreground rounded px-0.5">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}
