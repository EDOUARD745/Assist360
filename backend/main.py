"""API FastAPI d'Assist360.

Routes principales :
- GET  /tickets                  → liste des tickets pré-analysés
- GET  /tickets/{ticket_id}      → ticket unique
- POST /tickets/{ticket_id}/suggest-response  → suggestion de réponse IA
- POST /chat                     → chatbot interne (RAG par injection directe)
- POST /translate                → traduction
- POST /analyze                  → analyse à la volée (utile pour tester)
"""

import json
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from llm import chat, chat_json, chat_stream
from prompts import (
    ANALYZE_SYSTEM,
    CHAT_SYSTEM,
    REQUEST_INFO_SYSTEM,
    SUGGEST_RESPONSE_SYSTEM,
    TRANSLATE_SYSTEM,
)
from store import (
    append_message,
    load_analyzed_tickets,
    load_customer_history,
    load_kb_docs,
    load_knowledge_base,
    save_analyzed_tickets,
    update_ticket,
)
from rag import get_index, get_ticket_index
from datetime import datetime, timezone
from uuid import uuid4
from pathlib import Path
import asyncio
import os
import random
import events
import pii as _pii

app = FastAPI(title="Assist360 API", version="0.1.0")

_default_origins = "http://localhost:3000,http://127.0.0.1:3000"
_cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


_KB_CACHE = load_knowledge_base()
_RAG = get_index()
_TICKET_INDEX = get_ticket_index()
_TICKET_INDEX.rebuild(load_analyzed_tickets())
_INCOMING_POOL_PATH = Path(__file__).parent / "data" / "tickets" / "incoming_pool_analyzed.json"
_INCOMING_POOL: list[dict[str, Any]] = (
    json.loads(_INCOMING_POOL_PATH.read_text(encoding="utf-8"))
    if _INCOMING_POOL_PATH.exists()
    else []
)
_INCOMING_CURSOR = 0
_PII_ENABLED_DEFAULT = os.getenv("PII_REDACT", "true").lower() in {"1", "true", "yes"}


def _customer_names_in_ticket(ticket: dict[str, Any]) -> list[str]:
    name = ticket.get("customer", {}).get("name")
    return [name] if name else []


def _maybe_redact(payload: str, *, names: list[str] | None = None) -> _pii.Redaction:
    if not _PII_ENABLED_DEFAULT:
        return _pii.Redaction(redacted_text=payload)
    return _pii.redact(payload, names=names or [])


def _tickets_by_id() -> dict[str, dict[str, Any]]:
    return {t["id"]: t for t in load_analyzed_tickets()}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/tickets")
def list_tickets() -> list[dict[str, Any]]:
    tickets = load_analyzed_tickets()
    urgency_order = {"haute": 0, "moyenne": 1, "basse": 2}
    return sorted(tickets, key=lambda t: urgency_order.get(t["analysis"].get("urgency", "moyenne"), 1))


@app.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str) -> dict[str, Any]:
    tickets = _tickets_by_id()
    if ticket_id not in tickets:
        raise HTTPException(status_code=404, detail="Ticket introuvable")
    return tickets[ticket_id]


@app.get("/tickets/{ticket_id}/similar")
def similar_tickets(ticket_id: str, k: int = 3) -> list[dict[str, Any]]:
    tickets = _tickets_by_id()
    if ticket_id not in tickets:
        raise HTTPException(status_code=404, detail="Ticket introuvable")
    # On rebuild si l'index n'inclut pas le ticket courant (peut arriver après
    # une injection live)
    if ticket_id not in _TICKET_INDEX.ticket_ids:
        _TICKET_INDEX.rebuild(list(tickets.values()))
    target = tickets[ticket_id]
    results = _TICKET_INDEX.similar(target, k=k)
    out = []
    for r in results:
        t = tickets.get(r["id"])
        if not t:
            continue
        out.append({
            "id": t["id"],
            "subject": t["subject"],
            "channel": t["channel"],
            "customer_name": t["customer"]["name"],
            "status": t["status"],
            "assigned_to": t.get("assigned_to"),
            "summary": t["analysis"].get("summary"),
            "type": t["analysis"].get("type"),
            "urgency": t["analysis"].get("urgency"),
            "language": t["analysis"].get("language"),
            "received_at": t["received_at"],
            "score": round(r["score"], 3),
        })
    return out


class AnalyzeRequest(BaseModel):
    text: str


@app.post("/analyze")
def analyze(req: AnalyzeRequest) -> dict[str, Any]:
    return chat_json(ANALYZE_SYSTEM, req.text)


class SuggestRequest(BaseModel):
    target_language: str = "fr"
    extra_instructions: str | None = None
    tone: str | None = None  # "empathique" | "concis" | "formel" | None


TONE_INSTRUCTIONS = {
    "empathique": "Adopte un ton plus chaleureux et empathique que d'habitude. Ouvre par une formulation montrant la compréhension de la situation du client. Reformule son ressenti avant de proposer la solution.",
    "concis": "Va droit au but. Une formulation d'accueil minimale, puis directement la solution / les étapes. Limite à 70-90 mots.",
    "formel": "Adopte un ton très formel, institutionnel. Phrases construites, vouvoiement appuyé, formules de politesse complètes en ouverture et en clôture.",
}


def _build_suggest_payload(ticket: dict[str, Any], req: SuggestRequest) -> str:
    # RAG : on cherche les chunks les plus pertinents au lieu d'injecter tout
    rag_query = f"{ticket['analysis'].get('summary', '')} {ticket['raw_message'][:300]}"
    sources = _RAG.search(rag_query, k=3)
    kb_context = "\n\n".join(
        f"--- {s['doc_title']} :: {s['section'] or 'intro'} ---\n{s['content']}"
        for s in sources
    )
    payload = (
        f"## Base de connaissances La Poste (extraits pertinents)\n{kb_context}\n\n"
        f"## Demande client\n"
        f"Canal : {ticket['channel']}\n"
        f"Client : {ticket['customer']['name']}\n"
        f"Message :\n{ticket['raw_message']}\n\n"
        f"## Analyse IA\n{json.dumps(ticket['analysis'], ensure_ascii=False, indent=2)}\n\n"
        f"## Langue cible de la réponse\n{req.target_language}\n"
    )
    if req.tone and req.tone in TONE_INSTRUCTIONS:
        payload += f"\n## Ton demandé\n{TONE_INSTRUCTIONS[req.tone]}\n"
    if req.extra_instructions:
        payload += f"\n## Instructions supplémentaires du conseiller\n{req.extra_instructions}\n"
    return payload


@app.post("/tickets/{ticket_id}/suggest-response")
def suggest_response(ticket_id: str, req: SuggestRequest) -> dict[str, Any]:
    tickets = _tickets_by_id()
    if ticket_id not in tickets:
        raise HTTPException(status_code=404, detail="Ticket introuvable")
    ticket = tickets[ticket_id]
    payload = _build_suggest_payload(ticket, req)
    redaction = _maybe_redact(payload, names=_customer_names_in_ticket(ticket))
    body = chat(SUGGEST_RESPONSE_SYSTEM, redaction.redacted_text, temperature=0.4)
    body = _pii.restore(body, redaction.mapping).strip()
    return {"response": body, "pii_stats": redaction.stats}


def _sse(data: dict[str, Any]) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.post("/tickets/{ticket_id}/suggest-response/stream")
def suggest_response_stream(ticket_id: str, req: SuggestRequest):
    tickets = _tickets_by_id()
    if ticket_id not in tickets:
        raise HTTPException(status_code=404, detail="Ticket introuvable")
    ticket = tickets[ticket_id]
    payload = _build_suggest_payload(ticket, req)
    redaction = _maybe_redact(payload, names=_customer_names_in_ticket(ticket))

    def gen():
        try:
            yield _sse({
                "type": "pii",
                "mapping": redaction.mapping,
                "stats": redaction.stats,
            })
            for token in chat_stream(SUGGEST_RESPONSE_SYSTEM, redaction.redacted_text, temperature=0.4):
                yield _sse({"type": "delta", "text": token})
            yield _sse({"type": "done"})
        except Exception as exc:  # noqa: BLE001
            yield _sse({"type": "error", "error": str(exc)})

    return StreamingResponse(gen(), media_type="text/event-stream")


class ChatRequest(BaseModel):
    question: str
    ticket_id: str | None = None


def _build_chat_payload(req: "ChatRequest") -> tuple[str, list[dict[str, Any]], list[str]]:
    sources = _RAG.search(req.question, k=3)
    kb_context = "\n\n".join(
        f"--- {s['doc_title']} :: {s['section'] or 'intro'} ---\n{s['content']}"
        for s in sources
    )
    context = f"## Base de connaissances (extraits les plus pertinents)\n{kb_context}"
    names: list[str] = []
    if req.ticket_id:
        tickets = _tickets_by_id()
        if req.ticket_id in tickets:
            ticket = tickets[req.ticket_id]
            names = _customer_names_in_ticket(ticket)
            context += (
                f"\n\n## Ticket en cours\n"
                f"Client : {ticket['customer']['name']}\n"
                f"Message : {ticket['raw_message']}\n"
                f"Analyse : {json.dumps(ticket['analysis'], ensure_ascii=False)}\n"
            )
    user_payload = f"{context}\n\n## Question du conseiller\n{req.question}"
    sources_payload = [
        {
            "doc_id": s["doc_id"],
            "doc_title": s["doc_title"],
            "section": s["section"],
            "score": round(s["score"], 3),
        }
        for s in sources
    ]
    return user_payload, sources_payload, names


@app.post("/chat")
def chat_endpoint(req: ChatRequest) -> dict[str, Any]:
    payload, sources_payload, names = _build_chat_payload(req)
    redaction = _maybe_redact(payload, names=names)
    answer = chat(CHAT_SYSTEM, redaction.redacted_text, temperature=0.2)
    answer = _pii.restore(answer, redaction.mapping).strip()
    return {
        "answer": answer,
        "sources": sources_payload,
        "pii_stats": redaction.stats,
    }


@app.post("/chat/stream")
def chat_stream_endpoint(req: ChatRequest):
    payload, sources_payload, names = _build_chat_payload(req)
    redaction = _maybe_redact(payload, names=names)

    def gen():
        yield _sse({"type": "sources", "sources": sources_payload})
        yield _sse({"type": "pii", "mapping": redaction.mapping, "stats": redaction.stats})
        try:
            for token in chat_stream(CHAT_SYSTEM, redaction.redacted_text, temperature=0.2):
                yield _sse({"type": "delta", "text": token})
            yield _sse({"type": "done"})
        except Exception as exc:  # noqa: BLE001
            yield _sse({"type": "error", "error": str(exc)})

    return StreamingResponse(gen(), media_type="text/event-stream")


class TranslateRequest(BaseModel):
    text: str
    target_language: str = "fr"


@app.post("/translate")
def translate(req: TranslateRequest) -> dict[str, str]:
    user_payload = f"Langue cible : {req.target_language}\n\nTexte :\n{req.text}"
    translation = chat(TRANSLATE_SYSTEM, user_payload, temperature=0.1)
    return {"translation": translation.strip()}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _make_message(
    role: str,
    content: str,
    kind: str = "reply",
    author: str = "Marie Lefèvre",
    language: str = "fr",
) -> dict[str, Any]:
    return {
        "id": str(uuid4()),
        "role": role,  # "customer" | "agent"
        "kind": kind,  # "reply" | "info_request"
        "author": author,
        "language": language,
        "content": content,
        "sent_at": _now_iso(),
    }


class SendMessageBody(BaseModel):
    content: str
    kind: str = "reply"  # "reply" or "info_request"
    language: str = "fr"
    author: str = "Marie Lefèvre"
    ai_original: str | None = None  # suggestion IA originale (avant édition par le conseiller)


def _ai_status(ai_original: str | None, sent: str) -> str:
    """Détermine si la suggestion IA a été acceptée telle quelle, modifiée ou rejetée."""
    if not ai_original:
        return "no_ai"  # rédigée from scratch par le conseiller
    norm = lambda s: " ".join(s.split())
    if norm(ai_original) == norm(sent):
        return "as_is"
    # Métrique simple : taille relative de l'intersection des caractères
    a, b = norm(ai_original), norm(sent)
    if not a or not b:
        return "modified"
    # On considère "as_is" si > 98% de match, "modified" sinon
    common = sum(1 for x, y in zip(a, b) if x == y)
    ratio = common / max(len(a), len(b))
    return "as_is" if ratio > 0.98 else "modified"


@app.post("/tickets/{ticket_id}/messages")
def post_message(ticket_id: str, req: SendMessageBody) -> dict[str, Any]:
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Message vide")
    msg = _make_message(
        role="agent",
        content=req.content.strip(),
        kind=req.kind,
        author=req.author,
        language=req.language,
    )
    if req.ai_original is not None:
        msg["ai_original"] = req.ai_original
        msg["ai_status"] = _ai_status(req.ai_original, req.content)
    else:
        msg["ai_status"] = "no_ai"
    updated = append_message(ticket_id, msg)
    if updated is None:
        raise HTTPException(status_code=404, detail="Ticket introuvable")
    return {"message": msg, "ticket": updated}


class RequestInfoBody(BaseModel):
    target_language: str = "fr"


@app.post("/tickets/{ticket_id}/request-info")
def request_info(ticket_id: str, req: RequestInfoBody) -> dict[str, Any]:
    tickets = _tickets_by_id()
    if ticket_id not in tickets:
        raise HTTPException(status_code=404, detail="Ticket introuvable")
    ticket = tickets[ticket_id]
    missing = ticket["analysis"].get("missing_info", [])
    if not missing:
        raise HTTPException(status_code=400, detail="Aucune info manquante détectée")
    user_payload = (
        f"## Demande du client\n{ticket['raw_message']}\n\n"
        f"## Informations manquantes à demander\n"
        + "\n".join(f"- {m}" for m in missing)
        + f"\n\n## Client\nNom : {ticket['customer']['name']}\n"
        f"\n## Langue cible du mail\n{req.target_language}\n"
    )
    body = chat(REQUEST_INFO_SYSTEM, user_payload, temperature=0.4)
    return {"email_body": body.strip(), "ticket": ticket}


class ConfirmRequestInfoBody(BaseModel):
    content: str
    target_language: str = "fr"


@app.post("/tickets/{ticket_id}/request-info/send")
def request_info_send(ticket_id: str, req: ConfirmRequestInfoBody) -> dict[str, Any]:
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Mail vide")
    msg = _make_message(
        role="agent",
        content=req.content.strip(),
        kind="info_request",
        language=req.target_language,
    )
    updated = append_message(ticket_id, msg)
    if updated is None:
        raise HTTPException(status_code=404, detail="Ticket introuvable")
    updated = update_ticket(ticket_id, {"status": "waiting"})
    return {"message": msg, "ticket": updated}


class CloseBody(BaseModel):
    resolved: bool


@app.post("/tickets/{ticket_id}/close")
def close_ticket(ticket_id: str, req: CloseBody) -> dict[str, Any]:
    new_status = "closed" if req.resolved else "open"
    updated = update_ticket(ticket_id, {"status": new_status})
    if updated is None:
        raise HTTPException(status_code=404, detail="Ticket introuvable")
    return updated


@app.get("/kb")
def list_kb() -> list[dict[str, Any]]:
    return load_kb_docs()


@app.get("/kb/search")
def kb_search(q: str, k: int = 5) -> list[dict[str, Any]]:
    """Recherche RAG dans la base de connaissances. Renvoie les top-k chunks pertinents."""
    return [
        {
            "doc_id": s["doc_id"],
            "doc_title": s["doc_title"],
            "section": s["section"],
            "content": s["content"],
            "score": round(s["score"], 3),
        }
        for s in _RAG.search(q, k=k)
    ]


@app.post("/tickets/inject")
def inject_ticket() -> dict[str, Any]:
    """Injecte un nouveau ticket depuis le pool (pour la démo A7).
    Le ticket arrive avec un id unique, est ajouté au store, et un event SSE est diffusé."""
    global _INCOMING_CURSOR
    if not _INCOMING_POOL:
        raise HTTPException(status_code=503, detail="Pool de tickets vide")

    template = _INCOMING_POOL[_INCOMING_CURSOR % len(_INCOMING_POOL)]
    _INCOMING_CURSOR += 1
    unique_suffix = uuid4().hex[:6].upper()
    new_id = f"{template['id']}-{unique_suffix}"
    new_ticket = {
        **template,
        "id": new_id,
        "received_at": _now_iso(),
    }
    tickets = load_analyzed_tickets()
    tickets.insert(0, new_ticket)
    save_analyzed_tickets(tickets)
    _TICKET_INDEX.rebuild(tickets)
    events.publish("ticket_created", new_ticket)
    return new_ticket


@app.get("/events/tickets")
async def stream_ticket_events():
    """SSE: nouveaux tickets diffusés en temps réel à tous les conseillers connectés."""
    queue = await events.subscribe()

    async def gen():
        try:
            # keep-alive ping initial pour matérialiser l'ouverture du flux
            yield "data: {\"type\": \"connected\"}\n\n"
            while True:
                try:
                    msg = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield msg
                except asyncio.TimeoutError:
                    # commentaire SSE = keep-alive sans event
                    yield ": keep-alive\n\n"
        finally:
            events.unsubscribe(queue)

    return StreamingResponse(gen(), media_type="text/event-stream")


@app.get("/customers/history")
def customer_history(email: str) -> dict[str, Any]:
    """Renvoie l'historique client + tags calculés (VIP, fragile)."""
    from datetime import datetime as _dt, timedelta as _td

    past = load_customer_history(email)
    cutoff = _dt.now() - _td(days=180)  # 6 derniers mois
    recent = [p for p in past if _dt.fromisoformat(p["date"]) >= cutoff]
    open_disputes = [p for p in past if p.get("outcome") == "pending"]
    tags = []
    if len(recent) >= 3:
        tags.append("fragile")
    if len(open_disputes) >= 2:
        tags.append("escalade-en-cours")
    if len(past) >= 5:
        tags.append("vip")
    satisfaction_scores = [p["satisfaction"] for p in past if p.get("satisfaction") is not None]
    avg_sat = round(sum(satisfaction_scores) / len(satisfaction_scores), 1) if satisfaction_scores else None
    return {
        "email": email,
        "total_past_tickets": len(past),
        "recent_count": len(recent),
        "open_disputes": len(open_disputes),
        "avg_satisfaction": avg_sat,
        "tags": tags,
        "tickets": past,
    }


@app.get("/metrics/ai-adoption")
def ai_adoption_metrics() -> dict[str, Any]:
    """Statistiques d'adoption des suggestions IA par les conseillers."""
    tickets = load_analyzed_tickets()
    as_is = modified = no_ai = 0
    for t in tickets:
        for m in t.get("messages") or []:
            if m.get("role") != "agent" or m.get("kind") != "reply":
                continue
            status = m.get("ai_status", "no_ai")
            if status == "as_is":
                as_is += 1
            elif status == "modified":
                modified += 1
            else:
                no_ai += 1
    total = as_is + modified + no_ai
    return {
        "total_replies": total,
        "ai_used": as_is + modified,
        "as_is": as_is,
        "modified": modified,
        "no_ai": no_ai,
        "as_is_pct": round(as_is / total * 100, 1) if total else 0,
        "modified_pct": round(modified / total * 100, 1) if total else 0,
        "no_ai_pct": round(no_ai / total * 100, 1) if total else 0,
    }


@app.get("/kpis")
def kpis() -> dict[str, Any]:
    """KPIs mockés mais réalistes - calculés à partir des tickets chargés."""
    tickets = load_analyzed_tickets()
    by_urgency = {"haute": 0, "moyenne": 0, "basse": 0}
    by_type: dict[str, int] = {}
    by_lang: dict[str, int] = {}
    for t in tickets:
        a = t.get("analysis", {})
        by_urgency[a.get("urgency", "moyenne")] = by_urgency.get(a.get("urgency", "moyenne"), 0) + 1
        by_type[a.get("type", "autre")] = by_type.get(a.get("type", "autre"), 0) + 1
        by_lang[a.get("language", "fr")] = by_lang.get(a.get("language", "fr"), 0) + 1
    return {
        "total_open": len(tickets),
        "avg_handling_time_min": 4.2,
        "avg_handling_time_baseline_min": 9.8,
        "satisfaction_score": 4.6,
        "by_urgency": by_urgency,
        "by_type": by_type,
        "by_language": by_lang,
    }
