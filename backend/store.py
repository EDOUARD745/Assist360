"""Accès aux données : tickets bruts, tickets analysés (cache disque),
base de connaissances en mémoire."""

import json
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent / "data"
RAW_TICKETS = DATA_DIR / "tickets" / "raw_tickets.json"
ANALYZED_TICKETS = DATA_DIR / "tickets" / "analyzed_tickets.json"
KB_DIR = DATA_DIR / "knowledge_base"
CUSTOMER_HISTORY = DATA_DIR / "customers" / "history.json"


def load_raw_tickets() -> list[dict[str, Any]]:
    return json.loads(RAW_TICKETS.read_text(encoding="utf-8"))


def load_analyzed_tickets() -> list[dict[str, Any]]:
    if not ANALYZED_TICKETS.exists():
        return []
    return json.loads(ANALYZED_TICKETS.read_text(encoding="utf-8"))


def save_analyzed_tickets(tickets: list[dict[str, Any]]) -> None:
    ANALYZED_TICKETS.write_text(
        json.dumps(tickets, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def update_ticket(ticket_id: str, patch: dict[str, Any]) -> dict[str, Any] | None:
    tickets = load_analyzed_tickets()
    for i, t in enumerate(tickets):
        if t["id"] == ticket_id:
            tickets[i] = {**t, **patch}
            save_analyzed_tickets(tickets)
            return tickets[i]
    return None


def append_message(ticket_id: str, message: dict[str, Any]) -> dict[str, Any] | None:
    tickets = load_analyzed_tickets()
    for i, t in enumerate(tickets):
        if t["id"] == ticket_id:
            messages = list(t.get("messages") or [])
            messages.append(message)
            tickets[i] = {**t, "messages": messages}
            save_analyzed_tickets(tickets)
            return tickets[i]
    return None


def load_knowledge_base() -> str:
    """Concatène tous les docs markdown en un seul bloc, taggés par fichier.
    Suffisant pour notre cas (5-6 docs courts) et évite la complexité d'un vector store."""
    chunks = []
    for md in sorted(KB_DIR.glob("*.md")):
        chunks.append(f"--- Source: {md.name} ---\n{md.read_text(encoding='utf-8')}")
    return "\n\n".join(chunks)


def load_customer_history(email: str | None) -> list[dict[str, Any]]:
    if not email or not CUSTOMER_HISTORY.exists():
        return []
    data = json.loads(CUSTOMER_HISTORY.read_text(encoding="utf-8"))
    return data.get(email.lower(), [])


def load_kb_docs() -> list[dict[str, Any]]:
    """Renvoie chaque fiche en tant qu'objet { id, filename, title, content }."""
    docs = []
    for md in sorted(KB_DIR.glob("*.md")):
        content = md.read_text(encoding="utf-8")
        # Le titre = premier H1 ou nom de fichier sinon
        title = md.stem
        for line in content.splitlines():
            if line.startswith("# "):
                title = line[2:].strip()
                break
        docs.append({
            "id": md.stem,
            "filename": md.name,
            "title": title,
            "content": content,
        })
    return docs
