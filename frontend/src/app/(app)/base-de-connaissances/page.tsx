"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Search, BookOpen, FileText, Sparkles } from "lucide-react";
import { api, type KbDoc } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function KbPage() {
  const [docs, setDocs] = useState<KbDoc[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .kb()
      .then((d) => {
        setDocs(d);
        setActiveId(d[0]?.id ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(
      (d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q),
    );
  }, [docs, query]);

  const active = docs.find((d) => d.id === activeId) ?? null;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-brand" />
            Base de connaissances
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Documentation interne La Poste - consultable par l'assistant IA et par vous.
          </p>
        </div>
        <span className="text-xs text-muted-foreground/70">{docs.length} fiches</span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Liste des fiches */}
        <aside className="lg:col-span-4 bg-card rounded-xl ring-1 ring-border overflow-hidden flex flex-col max-h-[calc(100vh-200px)]">
          <div className="p-3 border-b border-border-soft">
            <div className="flex items-center gap-2 rounded-lg ring-1 ring-border focus-within:ring-brand px-2.5 py-1.5 bg-muted">
              <Search className="h-3.5 w-3.5 text-muted-foreground/70" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher une fiche…"
                className="flex-1 bg-transparent outline-none text-sm min-w-0"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-xs text-muted-foreground/70 hover:text-foreground">
                  ✕
                </button>
              )}
            </div>
          </div>
          <ul className="overflow-y-auto flex-1 divide-y divide-border-soft">
            {loading && (
              <li className="p-5 text-sm text-muted-foreground">Chargement…</li>
            )}
            {!loading && filtered.length === 0 && (
              <li className="p-5 text-sm text-muted-foreground">Aucun résultat pour « {query} ».</li>
            )}
            {filtered.map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => setActiveId(d.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-start gap-3",
                    activeId === d.id && "bg-brand-soft hover:bg-brand-soft",
                  )}
                >
                  <FileText
                    className={cn(
                      "h-4 w-4 mt-0.5 shrink-0",
                      activeId === d.id ? "text-brand" : "text-muted-foreground/70",
                    )}
                  />
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "text-sm font-medium truncate",
                        activeId === d.id ? "text-brand" : "text-strong-foreground",
                      )}
                    >
                      {highlight(d.title, query)}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{d.filename}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="p-3 border-t border-border-soft bg-muted text-xs text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-brand" />
            Ces fiches alimentent le chatbot interne (RAG).
          </div>
        </aside>

        {/* Lecteur */}
        <section className="lg:col-span-8">
          {active ? (
            <article
              key={active.id}
              className="bg-card rounded-xl ring-1 ring-border p-6 lg:p-8 animate-fade-up"
            >
              <div className="prose prose-slate prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{active.content}</ReactMarkdown>
              </div>
              <div className="mt-6 pt-4 border-t border-border-soft flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono">{active.filename}</span>
                <span>{active.content.length.toLocaleString("fr-FR")} caractères</span>
              </div>
            </article>
          ) : (
            <div className="bg-card rounded-xl ring-1 ring-border p-8 text-sm text-muted-foreground">
              Sélectionnez une fiche pour la lire.
            </div>
          )}
        </section>
      </div>
    </div>
  );
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
