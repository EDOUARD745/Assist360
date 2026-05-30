"""Index RAG sur la base de connaissances.

- Chunke chaque fiche markdown par section (H2 = `##`), garde le titre du doc en contexte.
- Embed avec `intfloat/multilingual-e5-small` (ONNX, léger, supporte FR/EN/ES/DE/IT).
- Recherche par similarité cosinus (numpy, pas de FAISS - on a moins de 100 chunks).
- L'index est calculé au démarrage du serveur et conservé en mémoire.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

import numpy as np
from fastembed import TextEmbedding

from store import load_kb_docs

# multilingue, ~220MB, qualité correcte sur 50+ langues (dont FR/EN/ES/DE/IT)
EMBED_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


@dataclass
class Chunk:
    chunk_id: str
    doc_id: str
    doc_title: str
    section: str | None
    content: str


def _split_into_chunks(doc_id: str, doc_title: str, content: str) -> list[Chunk]:
    """Split par section H2. La partie avant le premier H2 va dans une section "Intro"."""
    chunks: list[Chunk] = []
    # On garde tout après le premier H1 (le titre principal) - il est dans doc_title
    body = re.sub(r"^# .+?\n", "", content, count=1)
    parts = re.split(r"^## (.+)$", body, flags=re.MULTILINE)
    # parts = [intro, sec1_title, sec1_body, sec2_title, sec2_body, ...]
    if parts and parts[0].strip():
        chunks.append(
            Chunk(
                chunk_id=f"{doc_id}::intro",
                doc_id=doc_id,
                doc_title=doc_title,
                section=None,
                content=parts[0].strip(),
            )
        )
    for i in range(1, len(parts), 2):
        section_title = parts[i].strip()
        section_body = parts[i + 1].strip() if i + 1 < len(parts) else ""
        if not section_body:
            continue
        chunks.append(
            Chunk(
                chunk_id=f"{doc_id}::{_slugify(section_title)}",
                doc_id=doc_id,
                doc_title=doc_title,
                section=section_title,
                content=f"{section_title}\n\n{section_body}",
            )
        )
    return chunks


def _slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


class RagIndex:
    def __init__(self) -> None:
        self.embedder = TextEmbedding(model_name=EMBED_MODEL)
        self.chunks: list[Chunk] = []
        self.embeddings: np.ndarray = np.zeros((0, 384))
        self._build()

    def _build(self) -> None:
        docs = load_kb_docs()
        all_chunks: list[Chunk] = []
        for d in docs:
            all_chunks.extend(_split_into_chunks(d["id"], d["title"], d["content"]))
        if not all_chunks:
            return
        passages = [c.content for c in all_chunks]
        embeddings = np.array(list(self.embedder.embed(passages)))
        # normalisation (cosine = produit scalaire)
        embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
        self.chunks = all_chunks
        self.embeddings = embeddings

    def search(self, query: str, k: int = 3) -> list[dict[str, Any]]:
        if not self.chunks:
            return []
        q_emb = np.array(list(self.embedder.embed([query])))[0]
        q_emb = q_emb / np.linalg.norm(q_emb)
        scores = self.embeddings @ q_emb
        top_idx = np.argsort(-scores)[:k]
        return [
            {
                "chunk_id": self.chunks[i].chunk_id,
                "doc_id": self.chunks[i].doc_id,
                "doc_title": self.chunks[i].doc_title,
                "section": self.chunks[i].section,
                "content": self.chunks[i].content,
                "score": float(scores[i]),
            }
            for i in top_idx
        ]


_index: RagIndex | None = None


def get_index() -> RagIndex:
    global _index
    if _index is None:
        _index = RagIndex()
    return _index


class TicketIndex:
    """Index sémantique sur les tickets (résumé + message) pour détecter les
    cas similaires en file d'attente."""

    def __init__(self) -> None:
        self.embedder = TextEmbedding(model_name=EMBED_MODEL)
        self.ticket_ids: list[str] = []
        self.embeddings: np.ndarray = np.zeros((0, 384))
        self._loaded_at: float = 0.0

    @staticmethod
    def _text_for(ticket: dict[str, Any]) -> str:
        analysis = ticket.get("analysis", {}) or {}
        summary = analysis.get("summary", "")
        return f"{ticket.get('subject', '')}\n{summary}\n{ticket.get('raw_message', '')[:600]}"

    def rebuild(self, tickets: list[dict[str, Any]]) -> None:
        import time
        open_tickets = [t for t in tickets if t.get("status") != "closed"]
        if not open_tickets:
            self.ticket_ids = []
            self.embeddings = np.zeros((0, 384))
            self._loaded_at = time.time()
            return
        passages = [self._text_for(t) for t in open_tickets]
        embeddings = np.array(list(self.embedder.embed(passages)))
        embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
        self.ticket_ids = [t["id"] for t in open_tickets]
        self.embeddings = embeddings
        self._loaded_at = time.time()

    def similar(self, target_ticket: dict[str, Any], k: int = 3) -> list[dict[str, Any]]:
        if not self.ticket_ids:
            return []
        query_text = self._text_for(target_ticket)
        q_emb = np.array(list(self.embedder.embed([query_text])))[0]
        q_emb = q_emb / np.linalg.norm(q_emb)
        scores = self.embeddings @ q_emb
        # Tri décroissant en excluant le ticket lui-même
        target_id = target_ticket.get("id")
        ranked = sorted(
            zip(self.ticket_ids, scores),
            key=lambda x: -float(x[1]),
        )
        out: list[dict[str, Any]] = []
        for tid, score in ranked:
            if tid == target_id:
                continue
            out.append({"id": tid, "score": float(score)})
            if len(out) >= k:
                break
        return out


_ticket_index: TicketIndex | None = None


def get_ticket_index() -> TicketIndex:
    global _ticket_index
    if _ticket_index is None:
        _ticket_index = TicketIndex()
    return _ticket_index
