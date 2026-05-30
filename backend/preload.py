"""Pré-analyse tous les tickets bruts et sauvegarde sur disque.
À lancer une fois avant la démo pour avoir un dashboard instantané."""

import sys
import time

from llm import chat_json
from prompts import ANALYZE_SYSTEM, CALL_SUMMARY_SYSTEM
from store import load_raw_tickets, save_analyzed_tickets

# Pour donner du grain au dashboard : on assigne des statuts variés.
# "open" par défaut, certains tickets passent en "waiting" (en attente d'info)
# ou "closed" (clôturés) pour que les filtres aient quelque chose à montrer.
STATUS_OVERRIDES = {
    "TKT-2026-0003": "waiting",   # formulaire incomplet → en attente d'info
    "TKT-2026-0007": "waiting",   # tarifs entreprise → on attend une mise en relation commerciale
    "TKT-2026-0010": "closed",    # question simple horaires → cloturée
    "TKT-2026-0008": "closed",    # appel changement d'adresse → finalisée pendant l'appel
}


def main() -> int:
    tickets = load_raw_tickets()
    out = []
    for idx, ticket in enumerate(tickets, start=1):
        print(f"[{idx}/{len(tickets)}] {ticket['id']} - {ticket['subject'][:50]}")
        t0 = time.time()
        try:
            analysis = chat_json(ANALYZE_SYSTEM, ticket["raw_message"])
        except Exception as exc:  # noqa: BLE001
            print(f"  ✗ {exc}")
            return 1
        print(f"  ✓ analyse {time.time() - t0:.1f}s - urgence={analysis.get('urgency')}, langue={analysis.get('language')}")

        call_summary = None
        if ticket["channel"] == "appel":
            t1 = time.time()
            try:
                call_summary = chat_json(CALL_SUMMARY_SYSTEM, ticket["raw_message"])
                print(f"  ✓ résumé d'appel {time.time() - t1:.1f}s")
            except Exception as exc:  # noqa: BLE001
                print(f"  ⚠ résumé d'appel échoué : {exc}")

        out.append(
            {
                **ticket,
                "analysis": analysis,
                "call_summary": call_summary,
                "status": STATUS_OVERRIDES.get(ticket["id"], "open"),
                "assigned_to": "Marie Lefèvre",
                "messages": [],
            }
        )
    save_analyzed_tickets(out)
    print(f"\n→ {len(out)} tickets analysés et sauvegardés.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
