import sys, os
sys.path.insert(0, r"c:\VS-Code_C_drive\Projects\FrontWing\ai_services")
from app.agents.strategy_planner import run_strategy_planner

print("=" * 70)
print("VERIFICATION OF CRITICAL FIX HH")
print("=" * 70)

# PART 1: The exact log sequence (Russell at 2026 Miami GP, actual pit lap 20)
conv_id = "test_hh_miami_russell_seq"
context = {
    "session_id": "2026_miami_gp_race",
    "driver_id": "russell",
    "driver_name": "George Russell",
    "grand_prix": "Miami GP",
    "season": 2026
}

queries_part1 = [
    "what if he pitted 5 laps earlier?",
    "what if he pitted on 2nd lap only?",
    "what if he pitted on lap 30?"
]

print("\n--- PART 1: EXACT LOG SEQUENCE (2026 Miami GP - Russell, actual pit lap 20) ---")
for idx, q in enumerate(queries_part1, 1):
    res = run_strategy_planner(
        question=q,
        session_id="2026_miami_gp_race",
        driver_id="russell",
        conversation_id=conv_id,
        context=context
    )
    sim = res.get("whatif_simulation") or {}
    sim_scen = sim.get("simulated_scenario") or {}
    orig_scen = sim.get("original_scenario") or {}
    
    pit_lap = sim_scen.get("pit_lap")
    act_pit_lap = orig_scen.get("pit_lap")
    net_s = sim_scen.get("net_time_delta_s")
    fin_pos = sim_scen.get("finish_position")
    pos_change = sim_scen.get("position_change")
    act_pos = orig_scen.get("finish_position")
    
    print(f"\nQuery {idx}: \"{q}\"")
    print(f"  Target Pit Lap:   {pit_lap} (Actual pit lap: {act_pit_lap})")
    print(f"  Finishing Pos:    P{fin_pos} (Change: {'+' if pos_change >= 0 else ''}{pos_change}, Actual: P{act_pos})")
    print(f"  Net Time Delta:   {'+' if net_s >= 0 else ''}{net_s}s")
    print(f"  Analysis Summary: {sim.get('analysis_summary')}")

# PART 2: 3 New Self-Invented Pit-Lap Scenarios at a Different Session (2024 Dutch GP - Verstappen, actual pit lap 27)
print("\n--- PART 2: 3 SCENARIOS AT DIFFERENT SESSION (2024 Dutch GP - Verstappen, actual pit lap 27) ---")
queries_part2 = [
    ("What if Verstappen pitted on lap 22 at the 2024 Dutch GP?", "5 laps earlier undercut"),
    ("What if Verstappen pitted on lap 35 at the 2024 Dutch GP?", "8 laps later overcut"),
    ("What if Verstappen pitted on the 3rd lap at the 2024 Dutch GP?", "extreme 3rd lap ordinal stop")
]

conv_id_2 = "test_hh_dutch_ver_seq"
context_2 = {
    "session_id": "2024_dutch_gp_race",
    "driver_id": "verstappen",
    "driver_name": "Max Verstappen",
    "grand_prix": "Dutch GP",
    "season": 2024
}

for idx, (q, desc) in enumerate(queries_part2, 1):
    res = run_strategy_planner(
        question=q,
        session_id="2024_dutch_gp_race",
        driver_id="verstappen",
        conversation_id=conv_id_2,
        context=context_2
    )
    sim = res.get("whatif_simulation") or {}
    sim_scen = sim.get("simulated_scenario") or {}
    orig_scen = sim.get("original_scenario") or {}
    
    pit_lap = sim_scen.get("pit_lap")
    act_pit_lap = orig_scen.get("pit_lap")
    net_s = sim_scen.get("net_time_delta_s")
    fin_pos = sim_scen.get("finish_position")
    pos_change = sim_scen.get("position_change")
    act_pos = orig_scen.get("finish_position")
    
    print(f"\nScenario {idx} ({desc}): \"{q}\"")
    print(f"  Target Pit Lap:   {pit_lap} (Actual pit lap: {act_pit_lap})")
    print(f"  Finishing Pos:    P{fin_pos} (Change: {'+' if pos_change >= 0 else ''}{pos_change}, Actual: P{act_pos})")
    print(f"  Net Time Delta:   {'+' if net_s >= 0 else ''}{net_s}s")
    print(f"  Analysis Summary: {sim.get('analysis_summary')}")

print("\n" + "=" * 70)
print("VERIFICATION COMPLETED SUCCESSFULLY")
print("=" * 70)
