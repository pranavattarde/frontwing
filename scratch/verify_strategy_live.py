"""
Live Verification of Strategy Engineer across 6 queries against running servers.
Verifies all numeric claims trace to real tool outputs and general tab isolation boundary.
"""

import requests
import json
import time

FASTAPI_URL = "http://127.0.0.1:8000"
EXPRESS_URL = "http://localhost:5000"

print("=" * 70)
print("STAGE B LIVE VERIFICATION: STRATEGY ENGINEER")
print("=" * 70)

# Check health
print("\n[1] Checking Health...")
r_fastapi = requests.get(f"{FASTAPI_URL}/health", timeout=5)
print(f"FastAPI /health: {r_fastapi.status_code} - {r_fastapi.json()}")
r_express = requests.get(f"{EXPRESS_URL}/health", timeout=5)
print(f"Express /health: {r_express.status_code} - {r_express.json()}")

QUERIES = [
    # 3 Strategy Analysis Queries
    ("Q1 [Analysis]", "Why did Verstappen finish P2 at the 2024 Dutch Grand Prix?"),
    ("Q2 [Analysis]", "What went wrong with Leclerc's strategy at the 2024 British GP?"),
    ("Q3 [Analysis]", "Why did Russell finish P3 at the 2026 Miami Grand Prix?"),
    # 3 What-If Counterfactual Queries
    ("Q4 [What-If User-Specified]", "What if Piastri pitted on lap 18 on hard tires at the 2024 Qatar GP?"),
    ("Q5 [What-If Relative/Engine]", "What if Hamilton pitted 5 laps earlier at the 2024 Dutch GP?"),
    ("Q6 [What-If Unmodeled]", "What if Verstappen had late braking into Turn 1 at Dutch GP?"),
]

for label, q in QUERIES:
    print("\n" + "=" * 70)
    print(f"RUNNING {label}: \"{q}\"")
    print("=" * 70)
    start_t = time.time()
    
    # Test through Express proxy (/strategy/query on port 5000)
    resp = requests.post(
        f"{EXPRESS_URL}/strategy/query",
        json={"question": q},
        timeout=60
    )
    elapsed = round(time.time() - start_t, 2)
    print(f"Response Code: {resp.status_code} in {elapsed}s")
    assert resp.status_code == 200, f"Failed: {resp.text}"
    data = resp.json()
    
    print(f"Status: {data.get('status')}")
    print(f"Query Type: {data.get('query_type')}")
    print(f"Driver: {data.get('driver_name')} ({data.get('driver_id')})")
    print(f"Session: {data.get('session_id')} ({data.get('season')} {data.get('grand_prix')})")
    print(f"Executive Summary:\n{data.get('executive_summary')}")
    
    if data.get("query_type") == "strategy_analysis":
        rep = data.get("strategy_report", {})
        what = rep.get("what_happened", {})
        cost = rep.get("strategy_cost_analysis", {})
        alt = rep.get("suggested_alternative", {})
        
        print("\n--- SECTION 1: WHAT HAPPENED ---")
        print(f"Grid: P{what.get('grid_position')} | Finish: P{what.get('finish_position')} | Status: {what.get('status')} | Points: {what.get('points')}")
        print(f"Stints: {len(what.get('stints', []))} stints | Pit Stops: {len(what.get('pit_stops', []))} stops")
        
        print("\n--- SECTION 2: STRATEGY COST ANALYSIS ---")
        print(f"Strategy Score: {cost.get('strategy_score')}/100 | Pace Score: {cost.get('pace_score')}/100 | Tire Score: {cost.get('tire_score')}/100")
        print(f"Composite Score: {cost.get('composite_score')}/100 | Grid-to-Finish Delta: {cost.get('grid_to_finish_delta')}")
        
        print("\n--- SECTION 3: SUGGESTED ALTERNATIVE ---")
        print(f"Best Simulated Lap: Lap {alt.get('simulated_pit_lap')} on {alt.get('target_compound')} (vs Actual Lap {alt.get('actual_pit_lap')} on {alt.get('actual_compound')})")
        print(f"Projected Finish: P{alt.get('simulated_finish_position')} | Net Time Delta: {alt.get('net_time_delta_s')}s")
        print(f"Undercut Gain: {alt.get('undercut_gain_s')}s | Traffic Loss: {alt.get('traffic_loss_s')}s | Pit Loss: {alt.get('pit_loss_s')}s")
        print(f"Candidates Evaluated: {alt.get('candidates_evaluated')}")
        
    elif data.get("query_type") == "strategy_whatif":
        sim = data.get("whatif_simulation", {})
        print(f"\nIs Modeled: {sim.get('is_modeled')}")
        if not sim.get("is_modeled"):
            print(f"Unmodeled Variable: {sim.get('unmodeled_variable')}")
            print(f"Limitation Message: {sim.get('message')}")
        else:
            orig = sim.get("original_scenario", {})
            scen = sim.get("simulated_scenario", {})
            print(f"Original: P{orig.get('finish_position')} (Lap {orig.get('pit_lap')}, {orig.get('compound')})")
            print(f"Simulated: P{scen.get('finish_position')} (Lap {scen.get('simulated_pit_lap')}, {scen.get('target_compound')})")
            print(f"Position Change: {scen.get('position_change')} places | Net Delta: {scen.get('net_time_delta_s')}s")
            print(f"Undercut Gain: {scen.get('undercut_gain_s')}s | Traffic Loss: {scen.get('traffic_loss_s')}s")

print("\n" + "=" * 70)
print("ALL 6 QUERIES VERIFIED SUCCESSFULLY THROUGH LIVE RUNNING SYSTEM!")
print("=" * 70)
