import os
import sys
import pprint
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ai_services')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.db import execute_query
from app.simulation.race_projection import project_race_timeline
from app.simulation.pitstop_simulator import adjust_stints_for_simulated_stop
from scratch.test_timeline_reconstruction import inspect_session_timeline

def test_full_sim():
    total_laps, actual_pos, full_driver_laps, full_rivals_laps = inspect_session_timeline("2024_qatar_gp_race", "verstappen")
    
    # Stints
    stints_res = execute_query(
        """SELECT compound, start_lap, end_lap, stint_number 
           FROM stints 
           WHERE session_id = '2024_qatar_gp_race' AND (driver_id = 'verstappen' OR driver_id = 'VER')
           ORDER BY stint_number""",
        fetch=True
    )
    
    sim_stints = adjust_stints_for_simulated_stop(stints_res, 30, "HARD", total_laps)
    print(f"\nSimulated Stints (Pit Lap 30): {sim_stints}")
    
    # Grid median degradation
    grid_median_deg = {'SOFT': 0.12, 'MEDIUM': 0.08, 'HARD': 0.1689}
    
    # Pit loss: calculate from track pit out laps
    pit_loss = 22.5
    
    sim_laps = project_race_timeline(
        driver_actual_laps=full_driver_laps,
        simulated_stints=sim_stints,
        rivals_laps=full_rivals_laps,
        grid_median_deg=grid_median_deg,
        pit_loss=pit_loss,
        overtake_difficulty=0.4,
        total_laps=total_laps
    )
    
    actual_total_time = sum(l["lap_time"] for l in full_driver_laps)
    simulated_total_time = sum(sim_laps)
    net_time_gain_ms = int((actual_total_time - simulated_total_time) * 1000)
    
    rival_totals = {r_id: sum(laps) for r_id, laps in full_rivals_laps.items()}
    sorted_times = sorted(list(rival_totals.values()) + [simulated_total_time])
    simulated_pos = sorted_times.index(simulated_total_time) + 1
    position_change = actual_pos - simulated_pos
    
    print(f"\n--- Simulation Results ---")
    print(f"Actual Finishing Position: P{actual_pos}")
    print(f"Projected Finishing Position: P{simulated_pos}")
    print(f"Position Change: {position_change}")
    print(f"Actual Total Time: {actual_total_time:.3f}s")
    print(f"Projected Total Time: {simulated_total_time:.3f}s")
    print(f"Net Time Gain: {net_time_gain_ms / 1000.0:.3f}s ({net_time_gain_ms} ms)")

if __name__ == "__main__":
    test_full_sim()
