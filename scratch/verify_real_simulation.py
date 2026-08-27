import os
import sys
import json
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ai_services')))

from app.tools.adapters import SimulationTool, StrategyTool

def run_simulation_verification():
    print("================================================================================")
    print(" REAL F1 STRATEGY & WHAT-IF SIMULATION TOOL VERIFICATION")
    print("================================================================================")

    sim_tool = SimulationTool()
    strat_tool = StrategyTool()

    # 1. Verstappen Qatar GP 2024 - Pit Lap 30 What-If
    print("\n--- Test 1: Verstappen Qatar GP 2024 (What-If Pit Lap 30 on HARD) ---")
    res_ver_qatar = sim_tool.execute({
        "session_id": "2024_qatar_gp_race",
        "driver_id": "verstappen",
        "simulated_pit_lap": 30,
        "target_compound": "HARD"
    })
    print(json.dumps({k: v for k, v in res_ver_qatar.items() if k != "simulated_lap_times"}, indent=2))
    print(f"Sample simulated laps (laps 28-33 around pit stop): {res_ver_qatar['simulated_lap_times'][27:33]}")

    # 2. Hamilton Qatar GP 2024 - Pit Lap 25 What-If
    print("\n--- Test 2: Hamilton Qatar GP 2024 (What-If Pit Lap 25 on HARD) ---")
    res_ham_qatar = sim_tool.execute({
        "session_id": "2024_qatar_gp_race",
        "driver_id": "hamilton",
        "simulated_pit_lap": 25,
        "target_compound": "HARD"
    })
    print(json.dumps({k: v for k, v in res_ham_qatar.items() if k != "simulated_lap_times"}, indent=2))
    print(f"Sample simulated laps (laps 23-28 around pit stop): {res_ham_qatar['simulated_lap_times'][22:28]}")

    # 3. Verstappen Qatar GP 2024 - StrategyTool Auto-Derived Window
    print("\n--- Test 3: StrategyTool Auto-Window Analysis (Verstappen Qatar GP 2024) ---")
    res_strat_ver = strat_tool.execute({
        "session_id": "2024_qatar_gp_race",
        "driver_id": "verstappen"
    })
    print(json.dumps({k: v for k, v in res_strat_ver.items() if k != "simulated_lap_times"}, indent=2))

    # 4. Verstappen Monaco GP 2023 - Pit Lap 50 What-If
    print("\n--- Test 4: Verstappen Monaco GP 2023 (What-If Pit Lap 50 on INTERMEDIATE) ---")
    res_ver_monaco = sim_tool.execute({
        "session_id": "2023_monaco_gp_race",
        "driver_id": "verstappen",
        "simulated_pit_lap": 50,
        "target_compound": "INTERMEDIATE"
    })
    print(json.dumps({k: v for k, v in res_ver_monaco.items() if k != "simulated_lap_times"}, indent=2))

    print("\n================================================================================")
    print(" ALL SIMULATION & STRATEGY VERIFICATIONS COMPLETED SUCCESSFULLY")
    print("================================================================================")

if __name__ == "__main__":
    run_simulation_verification()
