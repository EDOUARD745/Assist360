"""Couche d'abstraction LLM. Permet de switcher Groq / OpenAI / Ollama
sans toucher au reste du code, via le SDK openai (Groq et Ollama exposent
une API compatible)."""

import json
import os
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

PROVIDER = os.getenv("LLM_PROVIDER", "groq").lower()


def _build_client() -> tuple[OpenAI, str]:
    if PROVIDER == "groq":
        return (
            OpenAI(
                api_key=os.environ["GROQ_API_KEY"],
                base_url=os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
            ),
            os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        )
    if PROVIDER == "openai":
        return (
            OpenAI(api_key=os.environ["OPENAI_API_KEY"]),
            os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        )
    if PROVIDER == "ollama":
        return (
            OpenAI(
                api_key="ollama",
                base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
            ),
            os.getenv("OLLAMA_MODEL", "llama3.1:8b"),
        )
    raise ValueError(f"LLM_PROVIDER inconnu : {PROVIDER}")


_client, _model = _build_client()


def chat(
    system: str,
    user: str,
    *,
    json_mode: bool = False,
    temperature: float = 0.3,
) -> str:
    kwargs: dict[str, Any] = {
        "model": _model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": temperature,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    resp = _client.chat.completions.create(**kwargs)
    return resp.choices[0].message.content or ""


def chat_stream(system: str, user: str, *, temperature: float = 0.3):
    """Yield les tokens (chunks de texte) au fur et à mesure de la génération."""
    stream = _client.chat.completions.create(
        model=_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content if chunk.choices else None
        if delta:
            yield delta


def chat_json(system: str, user: str, temperature: float = 0.2) -> dict[str, Any]:
    raw = chat(system, user, json_mode=True, temperature=temperature)
    return json.loads(raw)
