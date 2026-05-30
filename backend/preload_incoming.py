"""Pré-analyse les tickets du pool de simulation (utilisés pour la démo
A7 - injection en live d'un nouveau ticket). Le résultat est stocké dans
`incoming_pool_analyzed.json` pour une injection instantanée."""

import json
import sys
import time
from pathlib import Path

from llm import chat_json
from prompts import ANALYZE_SYSTEM, CALL_SUMMARY_SYSTEM

POOL = Path(__file__).parent / "data" / "tickets" / "incoming_pool.json"
OUT = Path(__file__).parent / "data" / "tickets" / "incoming_pool_analyzed.json"


def main() -> int:
    tickets = json.loads(POOL.read_text(encoding="utf-8"))
    out = []
    for idx, t in enumerate(tickets, start=1):
        print(f"[{idx}/{len(tickets)}] {t['id']} - {t['subject'][:50]}")
        t0 = time.time()
        analysis = chat_json(ANALYZE_SYSTEM, t["raw_message"])
        print(f"  ✓ analyse {time.time() - t0:.1f}s - urgence={analysis.get('urgency')}")
        call_summary = None
        if t["channel"] == "appel":
            call_summary = chat_json(CALL_SUMMARY_SYSTEM, t["raw_message"])
            print("  ✓ résumé d'appel")
        out.append({
            **t,
            "analysis": analysis,
            "call_summary": call_summary,
            "status": "open",
            "assigned_to": "Marie Lefèvre",
            "messages": [],
        })
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n→ {len(out)} tickets du pool sauvegardés dans {OUT.name}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
