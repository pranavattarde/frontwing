import os
import sys
import numpy as np
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ai_services')))

from app.simulation.simulation_engine import load_session_data_from_db, compute_grid_median_deg
from app.simulation.pitstop_simulator import adjust_stints_for_simulated_stop, get_pit_lane_loss
from app.simulation.tire_model import get_tire_parameters_for_driver, project_natural_lap_time

def trace_test3():
    session_id = "2024_qatar_gp_race"
    driver_id = "verstappen"
    simulated_pit_lap = 33
    target_compound = None

    db_data = load_session_data_from_db(session_id, driver_id)
    driver_actual_laps = db_data["driver_actual_laps"]
    rivals_laps = db_data["rivals_laps"]
    actual_stints = db_data["actual_stints"]
    total_laps = db_data["total_laps"]
    actual_pos = db_data["actual_position"]

    pit_loss = float(get_pit_lane_loss({"t_pit_lane_opt": 20.80}, driver_id))
    grid_median_deg = compute_grid_median_deg(session_id)

    simulated_stints = adjust_stints_for_simulated_stop(
        actual_stints,
        simulated_pit_lap,
        target_compound,
        total_laps
    )

    print("=== ACTUAL STINTS ===")
    for s in actual_stints:
        print(dict(s))
    print("\n=== SIMULATED STINTS (Pit Lap 33) ===")
    for s in simulated_stints:
        print(dict(s))
    print(f"\nPit Loss Constant: {pit_loss}s")
    print(f"Grid Median Deg: {grid_median_deg}")

    # Tire parameters
    compounds_used = set(s["compound"].upper() for s in simulated_stints)
    tire_params = {}
    for comp in compounds_used:
        alpha, beta = get_tire_parameters_for_driver(driver_actual_laps, comp, grid_median_deg)
        tire_params[comp] = (alpha, beta)
        print(f"Tire params for {comp}: alpha={alpha:.3f}, beta={beta:.4f}")

    # Build cumulative actual times for all rivals
    rival_cumulative = {}
    for r_id, laps in rivals_laps.items():
        cum = []
        curr = 0.0
        for l_time in laps:
            curr += l_time
            cum.append(curr)
        rival_cumulative[r_id] = cum

    simulated_lap_times = []
    cumulative_time = 0.0
    actual_cum_time = 0.0
    tire_age = 0
    current_stint_idx = 0
    overtake_difficulty = 0.4

    print("\n" + "="*110)
    print(f"{'Lap':<4} | {'Actual (s)':<10} | {'Act Cum':<10} | {'Stint':<6} | {'Comp':<6} | {'Age':<4} | {'Natural (s)':<11} | {'Sim Lap (s)':<11} | {'Sim Cum':<10} | {'Delta (s)':<9} | {'Traffic/Note'}")
    print("="*110)

    total_traffic_loss = 0.0

    for k in range(1, total_laps + 1):
        actual_lap = driver_actual_laps[k-1]["lap_time"]
        actual_cum_time += actual_lap

        stint = simulated_stints[current_stint_idx]
        if k > stint["end_lap"] and current_stint_idx < len(simulated_stints) - 1:
            current_stint_idx += 1
            stint = simulated_stints[current_stint_idx]

        comp = stint["compound"].upper()
        alpha, beta = tire_params[comp]

        is_pit = (k == stint["start_lap"] and k > 1)
        if is_pit:
            tire_age = 1
            natural_lap = project_natural_lap_time(alpha, beta, tire_age, k) + pit_loss
        else:
            tire_age += 1
            natural_lap = project_natural_lap_time(alpha, beta, tire_age, k)

        note = ""
        if k == 1:
            actual_lap_1 = next((lap["lap_time"] for lap in driver_actual_laps if lap["lap_number"] == 1), None)
            sim_lap = actual_lap_1 if actual_lap_1 is not None else natural_lap
            cumulative_time = sim_lap
            simulated_lap_times.append(sim_lap)
            delta = sim_lap - actual_lap
            print(f"{k:<4} | {actual_lap:<10.3f} | {actual_cum_time:<10.3f} | {current_stint_idx+1:<6} | {comp:<6} | {tire_age:<4} | {natural_lap:<11.3f} | {sim_lap:<11.3f} | {cumulative_time:<10.3f} | {delta:<+9.3f} | Start lap")
            continue

        rival_ahead_id = None
        rival_ahead_cum_k_minus_1 = -1.0

        for rival_id, cum_times in rival_cumulative.items():
            if len(cum_times) >= k:
                cum_k_minus_1 = cum_times[k-2]
                if cum_k_minus_1 < cumulative_time and cum_k_minus_1 > rival_ahead_cum_k_minus_1:
                    rival_ahead_cum_k_minus_1 = cum_k_minus_1
                    rival_ahead_id = rival_id

        projected_cum = cumulative_time + natural_lap

        if rival_ahead_id is not None:
            gap_k_minus_1 = cumulative_time - rival_ahead_cum_k_minus_1
            rival_actual_lap = rivals_laps[rival_ahead_id][k-1]
            rival_cum_k = rival_cumulative[rival_ahead_id][k-1]

            if gap_k_minus_1 <= 1.0:
                if natural_lap < rival_actual_lap:
                    pace_diff = rival_actual_lap - natural_lap
                    if pace_diff > overtake_difficulty:
                        cumulative_time = projected_cum
                        note = f"Overtook {rival_ahead_id} (diff {pace_diff:.2f}s > {overtake_difficulty})"
                    else:
                        cumulative_time = rival_cum_k + 0.6
                        note = f"BLOCKED by {rival_ahead_id} (+0.6s behind)"
                else:
                    cumulative_time = max(projected_cum, rival_cum_k + 0.6)
                    note = f"Slower than {rival_ahead_id}"
            else:
                if projected_cum < rival_cum_k:
                    cumulative_time = rival_cum_k + 0.6
                    note = f"CAUGHT {rival_ahead_id} (+0.6s behind)"
                else:
                    cumulative_time = projected_cum
                    note = f"Clean air (gap to {rival_ahead_id}: {gap_k_minus_1:.2f}s)"
        else:
            cumulative_time = projected_cum
            note = "P1 / Clear air"

        sim_lap = cumulative_time - sum(simulated_lap_times)
        simulated_lap_times.append(sim_lap)
        delta = sim_lap - actual_lap
        traffic_penalty = sim_lap - natural_lap
        if traffic_penalty > 0.001:
            total_traffic_loss += traffic_penalty

        if is_pit:
            note = f"PIT STOP ({pit_loss:.1f}s loss) + {note}"

        print(f"{k:<4} | {actual_lap:<10.3f} | {actual_cum_time:<10.3f} | {current_stint_idx+1:<6} | {comp:<6} | {tire_age:<4} | {natural_lap:<11.3f} | {sim_lap:<11.3f} | {cumulative_time:<10.3f} | {delta:<+9.3f} | {note}")

    actual_total = sum(l["lap_time"] for l in driver_actual_laps)
    sim_total = sum(simulated_lap_times)
    print("="*110)
    print(f"ACTUAL RACE TOTAL TIME:    {actual_total:.3f} s")
    print(f"SIMULATED RACE TOTAL TIME: {sim_total:.3f} s")
    print(f"NET TIME LOSS (Actual - Sim): {actual_total - sim_total:.3f} s ({(actual_total - sim_total)*1000:.0f} ms)")
    print(f"TOTAL TRAFFIC BOTTLENECK PENALTY: {total_traffic_loss:.3f} s")

if __name__ == "__main__":
    trace_test3()
