"""Test rapide : on valide que l'analyse renvoie du JSON propre et structuré
avant de construire la suite (risque #1 du plan)."""

import json
import sys

from llm import chat_json
from prompts import ANALYZE_SYSTEM

CASES = [
    {
        "label": "FR - Réclamation colis perdu",
        "text": (
            "Bonjour, j'attends depuis 3 semaines mon colis numéro 6A24567891FR contenant "
            "un ordinateur portable à 1200€. Le suivi est bloqué sur 'en cours d'acheminement' "
            "depuis le 10 mai. C'est inadmissible, j'ai besoin de cet ordinateur pour mon travail. "
            "Je veux un remboursement immédiat ou je porte plainte."
        ),
    },
    {
        "label": "EN - Demande info changement adresse",
        "text": (
            "Hello, I'm moving to France next month (June 15th) and I'd like to know how I "
            "can set up mail forwarding from my current address (45 Oxford St, London) to my "
            "new address in Lyon. Is there an online process? Thanks."
        ),
    },
    {
        "label": "FR - Formulaire incomplet",
        "text": "Bonjour, mon colis n'est jamais arrivé. Merci de m'aider.",
    },
]


def main() -> int:
    failures = 0
    for case in CASES:
        print(f"\n=== {case['label']} ===")
        try:
            result = chat_json(ANALYZE_SYSTEM, case["text"])
            print(json.dumps(result, indent=2, ensure_ascii=False))
            for required in ("summary", "type", "urgency", "tone", "language", "key_info", "missing_info"):
                if required not in result:
                    print(f"  ⚠ champ manquant : {required}")
                    failures += 1
        except Exception as exc:  # noqa: BLE001
            print(f"  ✗ ERREUR : {exc}")
            failures += 1
    print(f"\n{'OK' if failures == 0 else f'{failures} échec(s)'}")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
