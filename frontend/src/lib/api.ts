const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export type Urgency = "haute" | "moyenne" | "basse";
export type Channel = "email" | "appel" | "formulaire";

export type Analysis = {
  summary: string;
  type: string;
  urgency: Urgency;
  urgency_reason: string;
  tone: string;
  language: string;
  key_info: {
    numero_colis?: string | null;
    date_evenement?: string | null;
    montant?: string | null;
    adresse?: string | null;
    autre?: string[];
  };
  missing_info: string[];
  suggested_actions: string[];
  customer_message_translated: string | null;
};

export type CallSummary = {
  client_demand: string;
  key_facts: string[];
  engagements: string[];
  tonality: string;
  duration_estimate: string | null;
  follow_up_needed: boolean;
};

export type TicketStatus = "open" | "waiting" | "closed";

export type ThreadMessage = {
  id: string;
  role: "customer" | "agent";
  kind: "reply" | "info_request";
  author: string;
  language: string;
  content: string;
  sent_at: string;
  ai_original?: string;
  ai_status?: "as_is" | "modified" | "no_ai";
};

export type AiAdoption = {
  total_replies: number;
  ai_used: number;
  as_is: number;
  modified: number;
  no_ai: number;
  as_is_pct: number;
  modified_pct: number;
  no_ai_pct: number;
};

export type Ticket = {
  id: string;
  channel: Channel;
  received_at: string;
  customer: { name: string; email: string | null; phone: string | null };
  subject: string;
  raw_message: string;
  analysis: Analysis;
  call_summary: CallSummary | null;
  status: TicketStatus;
  assigned_to: string;
  messages: ThreadMessage[];
};

export type Kpis = {
  total_open: number;
  avg_handling_time_min: number;
  avg_handling_time_baseline_min: number;
  satisfaction_score: number;
  by_urgency: Record<string, number>;
  by_type: Record<string, number>;
  by_language: Record<string, number>;
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export type KbDoc = {
  id: string;
  filename: string;
  title: string;
  content: string;
};

export type PastTicket = {
  id: string;
  date: string;
  channel: string;
  subject: string;
  type: string;
  summary: string;
  outcome: "resolved" | "pending";
  satisfaction: number | null;
};

export type SimilarTicket = {
  id: string;
  subject: string;
  channel: Channel;
  customer_name: string;
  status: TicketStatus;
  assigned_to: string;
  summary: string;
  type: string;
  urgency: Urgency;
  language: string;
  received_at: string;
  score: number;
};

export type CustomerHistory = {
  email: string;
  total_past_tickets: number;
  recent_count: number;
  open_disputes: number;
  avg_satisfaction: number | null;
  tags: string[];
  tickets: PastTicket[];
};

export type RagSource = {
  doc_id: string;
  doc_title: string;
  section: string | null;
  score: number;
};

export type Tone = "empathique" | "concis" | "formel" | null;

export type PiiStats = Record<string, number>;

export type StreamEvent =
  | { type: "sources"; sources: RagSource[] }
  | { type: "pii"; mapping: Record<string, string>; stats: PiiStats }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; error: string };

export function restorePii(text: string, mapping: Record<string, string>): string {
  if (!mapping || Object.keys(mapping).length === 0) return text;
  const tokens = Object.keys(mapping).sort((a, b) => b.length - a.length);
  let out = text;
  for (const t of tokens) out = out.split(t).join(mapping[t]);
  return out;
}

export function summarizePii(stats?: PiiStats): string {
  if (!stats) return "";
  const total = Object.values(stats).reduce((s, v) => s + v, 0);
  if (total === 0) return "Aucune PII détectée";
  const parts = Object.entries(stats)
    .map(([cat, n]) => `${n} ${cat.toLowerCase()}`)
    .sort();
  return parts.join(" · ");
}

export async function streamSSE(
  path: string,
  body: unknown,
  onEvent: (e: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`${res.status} ${res.statusText}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  // Parse `data: {...}\n\n` chunks
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const raw = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 2);
      if (!raw.startsWith("data:")) continue;
      const json = raw.slice(5).trim();
      try {
        onEvent(JSON.parse(json) as StreamEvent);
      } catch {
        // ignore malformed
      }
    }
  }
}

export const api = {
  tickets: () => req<Ticket[]>("/tickets"),
  ticket: (id: string) => req<Ticket>(`/tickets/${id}`),
  kpis: () => req<Kpis>("/kpis"),
  kb: () => req<KbDoc[]>("/kb"),
  customerHistory: (email: string) =>
    req<CustomerHistory>(`/customers/history?email=${encodeURIComponent(email)}`),
  similarTickets: (id: string, k = 3) =>
    req<SimilarTicket[]>(`/tickets/${id}/similar?k=${k}`),
  suggest: (id: string, target_language = "fr", extra_instructions?: string) =>
    req<{ response: string }>(`/tickets/${id}/suggest-response`, {
      method: "POST",
      body: JSON.stringify({ target_language, extra_instructions }),
    }),
  chat: (question: string, ticket_id?: string) =>
    req<{ answer: string; sources: RagSource[] }>("/chat", {
      method: "POST",
      body: JSON.stringify({ question, ticket_id }),
    }),
  chatStream: (
    question: string,
    ticket_id: string | undefined,
    onEvent: (e: StreamEvent) => void,
    signal?: AbortSignal,
  ) => streamSSE("/chat/stream", { question, ticket_id }, onEvent, signal),
  suggestStream: (
    id: string,
    onEvent: (e: StreamEvent) => void,
    opts: { target_language?: string; tone?: Tone } = {},
    signal?: AbortSignal,
  ) =>
    streamSSE(
      `/tickets/${id}/suggest-response/stream`,
      { target_language: opts.target_language ?? "fr", tone: opts.tone ?? null },
      onEvent,
      signal,
    ),
  translate: (text: string, target_language: string) =>
    req<{ translation: string }>("/translate", {
      method: "POST",
      body: JSON.stringify({ text, target_language }),
    }),
  requestInfo: (id: string, target_language = "fr") =>
    req<{ email_body: string; ticket: Ticket }>(`/tickets/${id}/request-info`, {
      method: "POST",
      body: JSON.stringify({ target_language }),
    }),
  sendInfoRequest: (id: string, content: string, target_language = "fr") =>
    req<{ message: ThreadMessage; ticket: Ticket }>(`/tickets/${id}/request-info/send`, {
      method: "POST",
      body: JSON.stringify({ content, target_language }),
    }),
  sendMessage: (
    id: string,
    content: string,
    language = "fr",
    ai_original?: string,
  ) =>
    req<{ message: ThreadMessage; ticket: Ticket }>(`/tickets/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ content, language, kind: "reply", ai_original }),
    }),
  aiAdoption: () => req<AiAdoption>("/metrics/ai-adoption"),
  closeTicket: (id: string, resolved: boolean) =>
    req<Ticket>(`/tickets/${id}/close`, {
      method: "POST",
      body: JSON.stringify({ resolved }),
    }),
  injectTicket: () =>
    req<Ticket>("/tickets/inject", { method: "POST" }),
};

export function subscribeTicketEvents(
  onTicket: (t: Ticket) => void,
): () => void {
  const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const es = new EventSource(`${API}/events/tickets`);
  es.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data) as { type: string; data?: Ticket };
      if (msg.type === "ticket_created" && msg.data) onTicket(msg.data);
    } catch {
      // ignore
    }
  };
  es.onerror = () => {
    // EventSource auto-retries; we just swallow the error
  };
  return () => es.close();
}
