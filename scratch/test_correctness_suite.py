import sys
import os
import json
import time
import dotenv

dotenv.load_dotenv('ai_services/.env')
sys.path.insert(0, 'ai_services')

from app.agents.planner import run_ai_race_engineer

def print_banner(title):
    print("\n" + "="*70)
    print(f" {title}")
    print("="*70)

def test_suite():
    print_banner("REGRESSION TEST MATRIX FOR BUG FIXES")

    # A — Explicit year
    print_banner("TEST A1: 'Who won Monaco in 2024?'")
    r_a1 = run_ai_race_engineer("Who won Monaco in 2024?")
    print(f"Final Answer: {r_a1.get('final_answer')}")
    print(f"Tools Used: {r_a1.get('tools_used')}")
    print(f"Evidence Keys: {list(r_a1.get('evidence', {}).keys())}")

    time.sleep(3)

    print_banner("TEST A2: 'Who won Monaco in 2026?'")
    r_a2 = run_ai_race_engineer("Who won Monaco in 2026?")
    print(f"Final Answer: {r_a2.get('final_answer')}")
    print(f"Tools Used: {r_a2.get('tools_used')}")

    time.sleep(3)

    # B — Unspecified year
    print_banner("TEST B: 'Who won Monaco?' (Unspecified year)")
    r_b = run_ai_race_engineer("Who won Monaco?")
    print(f"Final Answer: {r_b.get('final_answer')}")
    print(f"Tools Used: {r_b.get('tools_used')}")

    time.sleep(3)

    # C — Explicit telemetry comparison
    print_banner("TEST C: 'Compare Max and Charles at Monaco in 2024.'")
    r_c = run_ai_race_engineer("Compare Max and Charles at Monaco in 2024.")
    print(f"Final Answer: {r_c.get('final_answer')}")
    print(f"Tools Used: {r_c.get('tools_used')}")
    telem_c = r_c.get("evidence", {}).get("telemetry_tool", {})
    print(f"Driver A: {telem_c.get('driver_id')}, Driver B: {telem_c.get('comparative_driver_id')}")
    print(f"Session ID in Evidence: {telem_c.get('session_id')}")

    time.sleep(3)

    # D — Incomplete comparison
    print_banner("TEST D: 'Compare lap timings and delta analysis' (Incomplete comparison)")
    r_d = run_ai_race_engineer("Compare lap timings and delta analysis")
    print(f"Final Answer: {r_d.get('final_answer')}")
    print(f"Tools Used: {r_d.get('tools_used')}")
    print(f"Needs Clarification: {r_d.get('evidence', {}).get('status') == 'needs_clarification' or r_d.get('final_answer') == 'Which drivers would you like me to compare?'}")

    time.sleep(3)

    # E — Natural GP queries
    print_banner("TEST E1: 'Who won in Sao Paulo?'")
    r_e1 = run_ai_race_engineer("Who won in Sao Paulo?")
    print(f"Final Answer: {r_e1.get('final_answer')}")

    time.sleep(3)

    print_banner("TEST E2: 'Who finished third in china?'")
    r_e2 = run_ai_race_engineer("Who finished third in china?")
    print(f"Final Answer: {r_e2.get('final_answer')}")

    time.sleep(3)

    # F — Cross-query isolation (independent queries)
    print_banner("TEST F: Cross-Query Isolation (Austria -> Monaco -> China -> Sao Paulo)")
    f_q1 = run_ai_race_engineer("Who won Austria?")
    print(f"Q1 (Austria): {f_q1.get('final_answer')}")
    time.sleep(3)
    
    f_q2 = run_ai_race_engineer("Who won Monaco?")
    print(f"Q2 (Monaco): {f_q2.get('final_answer')}")
    time.sleep(3)
    
    f_q3 = run_ai_race_engineer("Who won China?")
    print(f"Q3 (China): {f_q3.get('final_answer')}")
    time.sleep(3)
    
    f_q4 = run_ai_race_engineer("Who won Sao Paulo?")
    print(f"Q4 (Sao Paulo): {f_q4.get('final_answer')}")


if __name__ == "__main__":
    test_suite()
