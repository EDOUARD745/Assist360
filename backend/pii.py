"""Module de redaction PII pour Assist360.

Détecte et remplace les informations personnelles ou sensibles par des
tokens neutres avant tout appel LLM, puis restaure les valeurs originales
dans la réponse du modèle.

Pourquoi : prérequis légal pour pouvoir envoyer du contenu client à un modèle
hébergé tiers (Groq) sans transmettre de PII. En production La Poste, le
modèle serait sur infra interne - la redaction reste utile en défense en
profondeur (logs, audit, fine-tuning).

Catégories couvertes :
- COLIS    : numéros de suivi (6A24567891FR, EE998877665ES, RR556677889PL...)
- EMAIL    : adresses email
- PHONE    : numéros français (mobile + fixe) au format E.164 ou national
- MONEY    : montants en €, EUR
- NAME     : noms propres simples - désactivé par défaut (trop de faux positifs)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Iterable

# Numéro de suivi : 1-3 chiffres + lettre + 8-10 chiffres + 2 lettres pays
# Exemples : 6A24567891FR, 7C45123456FR, EE998877665ES
_COLIS_RE = re.compile(
    r"\b(?:[0-9]{1,3}[A-Z][0-9]{7,10}[A-Z]{2}|[A-Z]{2}[0-9]{9}[A-Z]{2})\b"
)

# Email : grappe ASCII standard
_EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")

# Téléphone : +33 6 12 34 56 78, 06 12 34 56 78, 06-12-..., 0612345678
_PHONE_RE = re.compile(
    r"(?<!\d)(?:\+\s*33|0)[\s.\-]?[1-9](?:[\s.\-]?\d{2}){4}(?!\d)"
)

# Montants : 1200€, 1 200 €, 49,90 EUR, 49.90 €
_MONEY_RE = re.compile(
    r"\b\d{1,3}(?:[\s ]?\d{3})*(?:[.,]\d{1,2})?\s?(?:€|EUR(?=\W|$))"
)

# Ordre d'application : du plus spécifique au moins spécifique
_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("COLIS", _COLIS_RE),
    ("EMAIL", _EMAIL_RE),
    ("PHONE", _PHONE_RE),
    ("MONEY", _MONEY_RE),
]


@dataclass
class Redaction:
    redacted_text: str
    # token -> valeur originale (pour reconstituer la sortie LLM)
    mapping: dict[str, str] = field(default_factory=dict)
    # statistiques par catégorie (pour l'UI / audit)
    stats: dict[str, int] = field(default_factory=dict)


def redact(text: str, names: Iterable[str] | None = None) -> Redaction:
    """Remplace les PII trouvées dans `text` par des tokens stables.
    Si `names` est fourni, ces noms exacts seront aussi neutralisés (utile pour
    le nom du client dans le contexte du ticket).
    """
    mapping: dict[str, str] = {}
    stats: dict[str, int] = {}
    counters: dict[str, int] = {}

    def _token(category: str, value: str) -> str:
        # Si la même valeur a déjà été redactée, on réutilise le même token
        # pour préserver les corrélations dans le texte.
        for tok, orig in mapping.items():
            if orig == value:
                return tok
        counters[category] = counters.get(category, 0) + 1
        token = f"[{category}_{counters[category]}]"
        mapping[token] = value
        stats[category] = stats.get(category, 0) + 1
        return token

    out = text
    for cat, pattern in _PATTERNS:
        out = pattern.sub(lambda m, c=cat: _token(c, m.group(0)), out)

    if names:
        for name in sorted(set(names), key=len, reverse=True):
            name = name.strip()
            if not name or len(name) < 3:
                continue
            # On remplace la version exacte + les variations courantes (M./Mme + nom)
            pattern = re.compile(rf"\b{re.escape(name)}\b")
            if pattern.search(out):
                out = pattern.sub(lambda m, n=name: _token("NAME", n), out)

    return Redaction(redacted_text=out, mapping=mapping, stats=stats)


def restore(text: str, mapping: dict[str, str]) -> str:
    """Remplace les tokens par leurs valeurs originales dans `text`."""
    if not mapping:
        return text
    # On itère par ordre de token le plus long en premier pour éviter qu'un
    # token court ne soit substitué dans un plus long.
    for token in sorted(mapping.keys(), key=len, reverse=True):
        text = text.replace(token, mapping[token])
    return text


def summarize(stats: dict[str, int]) -> str:
    if not stats:
        return "Aucune PII détectée"
    parts = [f"{count} {cat.lower()}" for cat, count in sorted(stats.items())]
    return ", ".join(parts) + " redacté(s)"
