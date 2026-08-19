import sys
import os
import json
import dotenv

dotenv.load_dotenv('ai_services/.env')
sys.path.insert(0, 'ai_services')

# Force offline rule-based parser mode for fast deterministic verification
os.environ["FORCE_RULE_BASED_PARSER"] = "true"

from app.agents.planner import run_ai_race_engineer

def run_test(name, q):
    print("="*70)
    print(f"TEST: {name} | QUERY: '{q}'")
    res = run_ai_race_engineer(q)
    print(f"Final Answer: {res.get('final_answer')}")
    print(f"Tools Used: {res.get('tools_used')}")
    ev = res.get("evidence", {})
    if "telemetry_tool" in ev:
        t = ev["telemetry_tool"]
        print(f"Telemetry Payload: driver_id={t.get('driver_id')}, comparative_driver_id={t.get('comparative_driver_id')}, session_id={t.get('session_id')}")
    if "race_results_tool" in ev:
        r = ev["race_results_tool"]
        print(f"Race Results Payload: session_id={r.get('session') or r.get('session_id')}, season={r.get('season')}")
    print("="*70 + "\n")

if __name__ == "__main__":
    # Class A — Explicit year
    run_test("A1 — Explicit 2024 Year", "Who won Monaco in 2024?")
    run_test("A2 — Explicit 2026 Year", "Who won Monaco in 2026?")

    # Class B — Unspecified year
    run_test("B — Unspecified Year", "Who won Monaco?")

    # Class C — Explicit telemetry comparison
    run_test("C — Explicit Telemetry Comparison", "Compare Max and Charles at Monaco in 2024.")

    # Class D — Incomplete telemetry comparison
    run_test("D — Incomplete Telemetry Query", "Compare lap timings and delta analysis")

    # Class E — Natural GP queries
    run_test("E1 — Natural GP (Sao Paulo)", "Who won in Sao Paulo?")
    run_test("E2 — Natural GP (China P3)", "Who finished third in china?")

    # Class F — Cross-query isolation
    run_test("F1 — Fresh Austria", "Who won Austria?")
    run_test("F2 — Fresh Monaco", "Who won Monaco?")
    run_test("F3 — Fresh China", "Who won China?")
    run_test("F4 — Fresh Sao Paulo", "Who won Sao Paulo?")
