import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ai_services')))

from app.core.db import execute_query
from app.simulation.simulation_engine import run_strategy_simulation, load_session_data_from_db
from app.tools.adapters import SimulationTool, StrategyTool

def test_sim_audit():
    print("=== Testing Simulation on 2024 Qatar GP (Verstappen Pit Lap 30 What-If) ===")
    sim_tool = SimulationTool()
    
    # 1. Test SimulationTool
    sim_input = {
        "session_id": "2024_qatar_gp_race",
        "driver_id": "verstappen",
        "simulated_pit_lap": 30,
        "target_compound": "HARD"
    }
    sim_out = sim_tool.execute(sim_input)
    print("SimulationTool.execute() output:")
    print(sim_out)

    # 2. Test StrategyTool
    print("\n=== Testing StrategyTool on 2024 Qatar GP ===")
    strat_tool = StrategyTool()
    strat_input = {
        "session_id": "2024_qatar_gp_race",
        "driver_id": "verstappen"
    }
    strat_out = strat_tool.execute(strat_input)
    print("StrategyTool.execute() output:")
    print(strat_out)

if __name__ == "__main__":
    test_sim_audit()
