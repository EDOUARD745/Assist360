"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, X, Send, Sparkles, BookOpen, RefreshCw, ShieldCheck } from "lucide-react";
import {
  api,
  restorePii,
  summarizePii,
  type PiiStats,
  type RagSource,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type ChatMsg = {
  role: "user" | "assistant";
  text: string;
  sources?: RagSource[];
  piiStats?: PiiStats;
};

const STARTERS = [
  "Quel est le délai d'indemnisation pour un colis perdu ?",
  "Comment réexpédier un colis retourné en NPAI ?",
  "Procédure pour une lettre recommandée contestée ?",
  "Quels documents pour un envoi international ?",
];

export default function AskAiModal({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      text: "Bonjour ! Posez-moi une question sur les procédures internes. Je m'appuie sur la documentation La Poste et je cite mes sources.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  async function ask(q?: string) {
    const question = (q ?? input).trim();
    if (!question || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }, { role: "assistant", text: "" }]);
    setLoading(true);
    let mapping: Record<string, string> = {};
    let raw = "";
    try {
      await api.chatStream(question, undefined, (e) => {
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
          raw += e.text;
          const restored = restorePii(raw, mapping);
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
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-end sm:place-items-center p-0 sm:p-4 animate-fade-up"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl h-[90vh] sm:h-[80vh] rounded-t-2xl sm:rounded-2xl bg-card ring-1 ring-border shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-border-soft flex items-center gap-3 bg-gradient-to-r from-brand-soft/40 to-card">
          <div className="h-9 w-9 rounded-lg bg-accent text-strong-foreground grid place-items-center">
            <Bot className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              Demander à l'IA
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-brand-soft text-brand inline-flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" />
                RAG
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Llama 3 · sources citées · PII protégée
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className="space-y-1.5">
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-brand text-white ml-auto rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm",
                )}
              >
                {m.text || (loading && i === messages.length - 1 ? <Typing /> : null)}
              </div>
              {(m.sources?.length || m.piiStats) && (
                <div className="flex flex-wrap gap-1.5 pl-1">
                  {m.sources?.map((s, j) => (
                    <span
                      key={j}
                      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ring-1 ring-border bg-card text-foreground"
                      title={`Score : ${s.score}`}
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

          {/* Suggestions de questions au premier affichage */}
          {messages.length === 1 && !loading && (
            <div className="pt-2 space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold px-1">
                Questions fréquentes
              </div>
              {STARTERS.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  className="w-full text-left text-sm px-3 py-2 rounded-lg ring-1 ring-border bg-card hover:bg-muted text-foreground transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask();
          }}
          className="border-t border-border-soft p-3 flex items-center gap-2 bg-card"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question..."
            className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-3 py-2 rounded-lg bg-brand text-white hover:bg-brand/90 disabled:opacity-40"
            aria-label="Envoyer"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}

function Typing() {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground/70">
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: "0ms" }} />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: "200ms" }} />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: "400ms" }} />
    </span>
  );
}
