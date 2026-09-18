import time
import json
import sys
import os

sys.path.insert(0, os.path.abspath("ai_services"))

from app.agents.strategy_planner import run_strategy_planner

print("--- Testing run_strategy_planner direct ---")
t0 = time.time()
res1 = run_strategy_planner("Why did Verstappen finish P2 at the 2024 Dutch Grand Prix?")
dt1 = time.time() - t0
print(f"strategy_analysis took {dt1:.2f}s")
print("Status:", res1.get("status"))
strat_rep = res1.get("strategy_report", {})
telem1 = strat_rep.get("telemetry_comparison", {})
print("telem1 keys:", list(telem1.keys()))
if telem1:
    print("actual lap_times count:", len(telem1.get("actual", {}).get("lap_times", [])))
    print("simulated lap_times count:", len(telem1.get("simulated", {}).get("lap_times", [])))
    print("sample actual lap:", telem1.get("actual", {}).get("lap_times", [])[:1])
    print("sample simulated lap:", telem1.get("simulated", {}).get("lap_times", [])[:1])

t0 = time.time()
res2 = run_strategy_planner("What if Verstappen pitted on lap 22 at the 2024 Dutch GP?")
dt2 = time.time() - t0
print(f"\nstrategy_whatif took {dt2:.2f}s")
print("Status:", res2.get("status"))
whatif = res2.get("whatif_simulation", {})
telem2 = whatif.get("telemetry_comparison", {})
print("telem2 keys:", list(telem2.keys()))
if telem2:
    print("scenario_label:", telem2.get("scenario_label"))
    print("actual lap_times count:", len(telem2.get("actual", {}).get("lap_times", [])))
    print("simulated lap_times count:", len(telem2.get("simulated", {}).get("lap_times", [])))
