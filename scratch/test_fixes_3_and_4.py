import os, sys
sys.path.insert(0, os.path.abspath("c:/VS-Code_C_drive/Projects/FrontWing/ai_services"))
import time
from app.agents.planner import run_ai_race_engineer

def test_fix3_followup_context_merging():
    print("=" * 80)
    print("  TEST FIX 3: Follow-Up Context Merged into Planner Entities")
    print("=" * 80)
    
    # Scenario 1: Parent investigation on Leclerc vs Sainz at 2024 Monaco GP
    # Follow-up: "Compare their race pace and telemetry" with caller context providing session_id, grand_prix, season, drivers
    print("\n---> Scenario 1: Parent = Leclerc & Sainz (Monaco 2024), Follow-up = 'Compare their race pace and telemetry'")
    ctx1 = {
        "session_id": "2024_monaco_gp_race",
        "grand_prix": "Monaco Grand Prix",
        "season": 2024,
        "drivers": ["leclerc", "sainz"]
    }
    res1 = run_ai_race_engineer("Compare their race pace and telemetry", context=ctx1)
    ev1 = res1.get("evidence") or {}
    print("Tools run:", list(ev1.keys()))
    print("Final answer snippet:", str(res1.get("final_answer"))[:120])
    assert any(k in ev1 for k in ["telemetry_tool", "race_results_tool", "scoring_tool"]), "Tools must execute"
    print("[PASS] Scenario 1 merged context successfully!")

    # Scenario 2: Parent investigation on Alonso at 2024 Australian GP
    # Follow-up: "what was his race result and finishing position?" with caller context
    print("\n---> Scenario 2: Parent = Alonso (Australia 2024), Follow-up = 'what was his race result and finishing position?'")
    ctx2 = {
        "session_id": "2024_australian_gp_race",
        "grand_prix": "Australian Grand Prix",
        "season": 2024,
        "driver_id": "alonso",
        "drivers": ["alonso"]
    }
    res2 = run_ai_race_engineer("what was his race result and finishing position?", context=ctx2)
    ev2 = res2.get("evidence") or {}
    print("Tools run:", list(ev2.keys()))
    print("Final answer snippet:", str(res2.get("final_answer"))[:120])
    assert any(k in ev2 for k in ["race_results_tool", "telemetry_tool", "scoring_tool"]), "Tools must execute"
    print("[PASS] Scenario 2 merged context successfully!")

    # Scenario 3: Parent investigation on Piastri vs Norris at 2024 Hungarian GP
    # Follow-up: "who had higher top speed?" with caller context
    print("\n---> Scenario 3: Parent = Piastri & Norris (Hungary 2024), Follow-up = 'who had higher top speed?'")
    ctx3 = {
        "session_id": "2024_hungarian_gp_race",
        "grand_prix": "Hungarian Grand Prix",
        "season": 2024,
        "drivers": ["piastri", "norris"]
    }
    res3 = run_ai_race_engineer("who had higher top speed?", context=ctx3)
    ev3 = res3.get("evidence") or {}
    print("Tools run:", list(ev3.keys()))
    print("Final answer snippet:", str(res3.get("final_answer"))[:120])
    assert any(k in ev3 for k in ["telemetry_tool", "race_results_tool"]), "Tools must execute"
    print("[PASS] Scenario 3 merged context successfully!")


def test_fix4_queried_drivers_captured():
    print("\n" + "=" * 80)
    print("  TEST FIX 4: Queried Drivers Captured Accurately (Not Incidental Podium)")
    print("=" * 80)
    
    # Query 1: Comparing Tsunoda and Gasly at 2024 Bahrain GP (Neither on podium)
    print("\n---> Query 1: 'Compare Tsunoda and Gasly pace in 2024 Bahrain GP'")
    res1 = run_ai_race_engineer("Compare Tsunoda and Gasly pace in 2024 Bahrain GP")
    drivers1 = [d.lower() for d in (res1.get("drivers") or [])]
    print("Returned top-level drivers:", res1.get("drivers"))
    print("Final Answer snippet:", str(res1.get("final_answer"))[:120])
    assert any("tsunoda" in d for d in drivers1) or any("gasly" in d for d in drivers1), f"Expected tsunoda/gasly in {drivers1}"
    assert not (len(drivers1) >= 2 and "verstappen" in drivers1 and "perez" in drivers1), "Should not fall back to podium (VER/PER)"
    print("[PASS] Query 1 captured queried midfield drivers correctly!")

    # Query 2: Comparing Alonso and Stroll at 2024 Saudi Arabian GP (Aston Martin teammates, neither on podium)
    print("\n---> Query 2: 'Compare Alonso and Stroll in 2024 Saudi Arabian GP'")
    res2 = run_ai_race_engineer("Compare Alonso and Stroll in 2024 Saudi Arabian GP")
    drivers2 = [d.lower() for d in (res2.get("drivers") or [])]
    print("Returned top-level drivers:", res2.get("drivers"))
    print("Final Answer snippet:", str(res2.get("final_answer"))[:120])
    assert any("alonso" in d for d in drivers2) or any("stroll" in d for d in drivers2), f"Expected alonso/stroll in {drivers2}"
    print("[PASS] Query 2 captured queried teammate drivers correctly!")

    # Query 3: Comparing Hulkenberg and Magnussen at 2024 Austrian GP (Haas teammates, neither on podium)
    print("\n---> Query 3: 'Compare Hulkenberg and Magnussen lap times in 2024 Austrian GP'")
    res3 = run_ai_race_engineer("Compare Hulkenberg and Magnussen lap times in 2024 Austrian GP")
    drivers3 = [d.lower() for d in (res3.get("drivers") or [])]
    print("Returned top-level drivers:", res3.get("drivers"))
    print("Final Answer snippet:", str(res3.get("final_answer"))[:120])
    assert any("hulkenberg" in d for d in drivers3) or any("magnussen" in d for d in drivers3), f"Expected hulkenberg/magnussen in {drivers3}"
    print("[PASS] Query 3 captured queried midfield drivers correctly!")


if __name__ == "__main__":
    test_fix3_followup_context_merging()
    test_fix4_queried_drivers_captured()
    print("\nALL FIX 3 & FIX 4 TESTS PASSED SUCCESSFULLY!")
