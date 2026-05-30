"""Bus d'événements simple in-process pour SSE.

Chaque abonné reçoit sa propre asyncio.Queue. Le bus diffuse à toutes les
queues actives - backpressure géré par taille de queue bornée (drop si plein)."""

import asyncio
import json
from typing import Any

_subscribers: set[asyncio.Queue[str]] = set()


async def subscribe() -> asyncio.Queue[str]:
    q: asyncio.Queue[str] = asyncio.Queue(maxsize=64)
    _subscribers.add(q)
    return q


def unsubscribe(q: asyncio.Queue[str]) -> None:
    _subscribers.discard(q)


def publish(event_type: str, payload: dict[str, Any]) -> None:
    body = f"data: {json.dumps({'type': event_type, 'data': payload}, ensure_ascii=False)}\n\n"
    for q in list(_subscribers):
        try:
            q.put_nowait(body)
        except asyncio.QueueFull:
            # client lent - on saute l'event, on ne bloque pas le bus
            pass
