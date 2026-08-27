import os
import sys
import numpy as np
import json
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ai_services')))

from app.core.db import execute_query
from app.simulation.tire_model import get_tire_parameters_for_driver, fit_tire_parameters
from app.simulation.pitstop_simulator import adjust_stints_for_simulated_stop
from app.simulation.race_projection import project_race_timeline

def load_reconstructed_session_data(session_id: str, target_driver_id: str):
    # 1. Total laps
    total_laps_query = execute_query(
        "SELECT MAX(lap_number) as max_lap FROM laps WHERE session_id = %s",
        (session_id,), fetch=True
    )
    if not total_laps_query or not total_laps_query[0]["max_lap"]:
        return None
    total_laps = int(total_laps_query[0]["max_lap"])

    # 2. Driver code
    drv_res = execute_query("SELECT code FROM drivers WHERE id = %s", (target_driver_id,), fetch=True)
    drv_code = drv_res[0]["code"] if drv_res else target_driver_id.upper()[:3]

    # 3. Actual stints
    actual_stints = execute_query(
        """SELECT compound, start_lap, end_lap, stint_number 
           FROM stints 
           WHERE session_id = %s AND (driver_id = %s OR driver_id IN (SELECT id FROM drivers WHERE code = %s))
           ORDER BY stint_number""",
        (session_id, target_driver_id, drv_code), fetch=True
    )
    if not actual_stints:
        return None

    # 4. Actual position from race_results
    actual_result = execute_query(
        """SELECT position FROM race_results 
           WHERE session_id = %s AND (driver_id = %s OR driver_id IN (SELECT id FROM drivers WHERE code = %s))""",
        (session_id, target_driver_id, drv_code), fetch=True
    )
    actual_pos = actual_result[0]["position"] if (actual_result and actual_result[0]["position"]) else 1

    # 5. All laps
    all_laps = execute_query(
        """SELECT driver_id, lap_number, lap_time_ms, compound, is_pit_out_lap, is_valid 
           FROM laps 
           WHERE session_id = %s 
           ORDER BY driver_id, lap_number""",
        (session_id,), fetch=True
    )
    if not all_laps:
        return None

    driver_laps_map = {}
    rivals_laps_map = {}

    for lap in all_laps:
        d_id = lap["driver_id"]
        lap_num = lap["lap_number"]
        time_sec = (lap["lap_time_ms"] / 1000.0) if lap["lap_time_ms"] else None
        
        is_target = (d_id == target_driver_id or d_id == drv_code.lower())
        if is_target:
            driver_laps_map[lap_num] = {
                "lap_number": lap_num,
                "lap_time": time_sec,
                "compound": lap["compound"],
                "is_pit_out_lap": lap["is_pit_out_lap"],
                "is_valid": lap["is_valid"]
            }
        else:
            rivals_laps_map.setdefault(d_id, {})[lap_num] = time_sec

    # Target driver pace stats
    clean_driver_times = [v["lap_time"] for v in driver_laps_map.values() if v["lap_time"] and v["is_valid"] and not v["is_pit_out_lap"]]
    median_pace = float(np.median(clean_driver_times)) if clean_driver_times else 85.0

    # Build 1..total_laps reconstructed driver timeline
    driver_actual_laps = []
    for k in range(1, total_laps + 1):
        # Determine stint compound and tire age
        comp = "MEDIUM"
        tire_age = k
        for st in actual_stints:
            if st["start_lap"] <= k <= st["end_lap"]:
                comp = str(st["compound"]).upper()
                tire_age = k - st["start_lap"] + 1
                break
                
        if k in driver_laps_map and driver_laps_map[k]["lap_time"] is not None:
            l_info = driver_laps_map[k]
            driver_actual_laps.append({
                "lap_number": k,
                "lap_time": l_info["lap_time"],
                "compound": str(l_info.get("compound") or comp).upper(),
                "is_pit_out_lap": bool(l_info.get("is_pit_out_lap")),
                "tire_age": tire_age
            })
        else:
            # Model-based interpolation for non-sampled lap
            driver_actual_laps.append({
                "lap_number": k,
                "lap_time": round(median_pace + 0.05 * (tire_age % 15) - 0.06 * k, 3),
                "compound": comp,
                "is_pit_out_lap": False,
                "tire_age": tire_age
            })

    # Build 1..total_laps reconstructed rivals timeline
    rivals_laps = {}
    for r_id, r_dict in rivals_laps_map.items():
        clean_r_times = [t for t in r_dict.values() if t is not None]
        r_med = float(np.median(clean_r_times)) if clean_r_times else median_pace + 1.0
        r_timeline = []
        for k in range(1, total_laps + 1):
            if k in r_dict and r_dict[k] is not None:
                r_timeline.append(r_dict[k])
            else:
                r_timeline.append(round(r_med + 0.05 * (k % 15) - 0.06 * k, 3))
        rivals_laps[r_id] = r_timeline

    return {
        "total_laps": total_laps,
        "actual_stints": actual_stints,
        "driver_actual_laps": driver_actual_laps,
        "rivals_laps": rivals_laps,
        "actual_position": actual_pos
    }

def run_simulation(session_id, driver_id, simulated_pit_lap, target_compound=None):
    data = load_reconstructed_session_data(session_id, driver_id)
    if not data:
        return {"status": "missing_data", "required_session": session_id}
        
    total_laps = data["total_laps"]
    actual_stints = data["actual_stints"]
    driver_actual_laps = data["driver_actual_laps"]
    rivals_laps = data["rivals_laps"]
    actual_pos = data["actual_position"]

    # Compute real grid median degradation
    stints_all = execute_query(
        "SELECT driver_id, compound, start_lap, end_lap, stint_length FROM stints WHERE session_id = %s AND stint_length >= 3",
        (session_id,), fetch=True
    )
    slopes_by_compound = {}
    for st in stints_all or []:
        comp = str(st['compound']).upper()
        if comp in ['INTERMEDIATE', 'WET', 'UNKNOWN']:
            continue
        laps_st = execute_query(
            """SELECT lap_time_ms FROM laps 
               WHERE session_id = %s AND driver_id = %s 
                 AND lap_number >= %s AND lap_number <= %s 
                 AND is_valid = true AND is_pit_out_lap = false AND lap_time_ms IS NOT NULL
               ORDER BY lap_number""",
            (session_id, st['driver_id'], st['start_lap'], st['end_lap']), fetch=True
        )
        if laps_st and len(laps_st) >= 3:
            times = [l['lap_time_ms'] / 1000.0 for l in laps_st]
            ages = np.arange(1, len(times) + 1)
            corrected = np.array(times) + 0.06 * ages
            slope = float(np.polyfit(ages, corrected, 1)[0])
            if 0.0 < slope < 0.5:
                slopes_by_compound.setdefault(comp, []).append(slope)
                
    grid_median_deg = {}
    for comp in ['SOFT', 'MEDIUM', 'HARD']:
        if comp in slopes_by_compound and len(slopes_by_compound[comp]) > 0:
            grid_median_deg[comp] = round(float(np.median(slopes_by_compound[comp])), 4)
        else:
            grid_median_deg[comp] = 0.080 if comp == 'MEDIUM' else (0.050 if comp == 'HARD' else 0.120)

    # Pit loss: track calculation
    pit_loss = 22.5

    simulated_stints = adjust_stints_for_simulated_stop(
        actual_stints,
        simulated_pit_lap,
        target_compound,
        total_laps
    )

    overtake_difficulty = 0.4

    simulated_laps = project_race_timeline(
        driver_actual_laps=driver_actual_laps,
        simulated_stints=simulated_stints,
        rivals_laps=rivals_laps,
        grid_median_deg=grid_median_deg,
        pit_loss=pit_loss,
        overtake_difficulty=overtake_difficulty,
        total_laps=total_laps
    )

    actual_total_time = sum(l["lap_time"] for l in driver_actual_laps)
    simulated_total_time = sum(simulated_laps)
    net_time_gain_ms = int((actual_total_time - simulated_total_time) * 1000)

    rival_totals = {r_id: sum(laps) for r_id, laps in rivals_laps.items()}
    sorted_times = sorted(list(rival_totals.values()) + [simulated_total_time])
    simulated_pos = sorted_times.index(simulated_total_time) + 1
    position_change = actual_pos - simulated_pos

    actual_pit_lap = actual_stints[0].get("end_lap") if actual_stints else None

    return {
        "session_id": session_id,
        "driver_id": driver_id,
        "simulated_pit_lap": simulated_pit_lap,
        "actual_pit_lap": actual_pit_lap,
        "target_compound": target_compound or (simulated_stints[1]["compound"] if len(simulated_stints) > 1 else "HARD"),
        "actual_finishing_position": actual_pos,
        "projected_finishing_position": simulated_pos,
        "position_change": position_change,
        "actual_total_time_seconds": round(actual_total_time, 3),
        "projected_total_time_seconds": round(simulated_total_time, 3),
        "simulated_net_time_gain_ms": net_time_gain_ms,
        "simulated_lap_times": [round(l, 3) for l in simulated_laps],
        "run_parameters": {
            "pit_loss": pit_loss,
            "overtake_difficulty": overtake_difficulty,
            "stints": simulated_stints,
            "actual_stints": actual_stints,
            "grid_median_deg": grid_median_deg
        }
    }

if __name__ == "__main__":
    res = run_simulation("2024_qatar_gp_race", "verstappen", 30, "HARD")
    print(json.dumps({k: v for k, v in res.items() if k != "simulated_lap_times"}, indent=2))
    print(f"First 5 simulated laps: {res['simulated_lap_times'][:5]}")
    print(f"Laps 28-33 (around pit stop): {res['simulated_lap_times'][27:33]}")
