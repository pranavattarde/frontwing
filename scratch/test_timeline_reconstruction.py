import os
import sys
import numpy as np
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ai_services')))

from app.core.db import execute_query

def inspect_session_timeline(session_id, driver_id):
    # 1. Total laps
    total_laps_res = execute_query("SELECT MAX(lap_number) as max_lap FROM laps WHERE session_id = %s", (session_id,), fetch=True)
    total_laps = int(total_laps_res[0]["max_lap"])
    print(f"Total Laps in Session: {total_laps}")

    # 2. Driver code & actual finishing position
    drv_res = execute_query("SELECT code FROM drivers WHERE id = %s", (driver_id,), fetch=True)
    drv_code = drv_res[0]["code"] if drv_res else driver_id.upper()[:3]
    
    rr_res = execute_query(
        """SELECT position, grid_position, status FROM race_results 
           WHERE session_id = %s AND (driver_id = %s OR driver_id IN (SELECT id FROM drivers WHERE code = %s))""",
        (session_id, driver_id, drv_code), fetch=True
    )
    actual_pos = rr_res[0]["position"] if (rr_res and rr_res[0]["position"]) else 1
    print(f"Actual Position in Race: P{actual_pos} (Grid: P{rr_res[0]['grid_position'] if rr_res else '?'})")

    # 3. All laps in session
    all_laps = execute_query(
        """SELECT driver_id, lap_number, lap_time_ms, compound, is_pit_out_lap, is_valid 
           FROM laps 
           WHERE session_id = %s 
           ORDER BY driver_id, lap_number""",
        (session_id,), fetch=True
    )
    
    # Reconstruct 1..total_laps for target driver and rivals
    driver_laps_dict = {}
    rivals_laps_dict = {}
    
    for l in all_laps:
        d = l["driver_id"]
        lap_num = l["lap_number"]
        time_s = (l["lap_time_ms"] / 1000.0) if l["lap_time_ms"] else None
        
        # Check if target driver
        is_target = (d == driver_id or d == drv_code.lower())
        if is_target:
            driver_laps_dict[lap_num] = {
                "lap_number": lap_num,
                "lap_time": time_s,
                "compound": l["compound"],
                "is_pit_out_lap": l["is_pit_out_lap"],
                "is_valid": l["is_valid"]
            }
        else:
            rivals_laps_dict.setdefault(d, {})[lap_num] = time_s

    # Fill in full 1..total_laps timeline for target driver
    valid_driver_times = [v["lap_time"] for v in driver_laps_dict.values() if v["lap_time"] and v["is_valid"] and not v["is_pit_out_lap"]]
    median_pace = float(np.median(valid_driver_times)) if valid_driver_times else 85.0
    print(f"Target driver median clean pace: {median_pace:.3f}s (from {len(valid_driver_times)} clean laps)")

    full_driver_actual_laps = []
    for k in range(1, total_laps + 1):
        if k in driver_laps_dict and driver_laps_dict[k]["lap_time"] is not None:
            full_driver_actual_laps.append(driver_laps_dict[k])
        else:
            # Interpolate or use estimated clean lap time
            full_driver_actual_laps.append({
                "lap_number": k,
                "lap_time": round(median_pace, 3),
                "compound": "MEDIUM",
                "is_pit_out_lap": False,
                "is_valid": True,
                "tire_age": k
            })

    print(f"Reconstructed Driver Actual Laps: {len(full_driver_actual_laps)} laps, Total time: {sum(l['lap_time'] for l in full_driver_actual_laps):.2f}s")

    # Reconstruct 1..total_laps timeline for each rival
    full_rivals_laps = {}
    for r_id, r_laps in rivals_laps_dict.items():
        valid_r_times = [t for t in r_laps.values() if t is not None]
        r_med = float(np.median(valid_r_times)) if valid_r_times else median_pace + 1.0
        r_timeline = []
        for k in range(1, total_laps + 1):
            if k in r_laps and r_laps[k] is not None:
                r_timeline.append(r_laps[k])
            else:
                r_timeline.append(round(r_med, 3))
        full_rivals_laps[r_id] = r_timeline

    print(f"Rivals reconstructed: {len(full_rivals_laps)} drivers with {total_laps} laps each.")
    return total_laps, actual_pos, full_driver_actual_laps, full_rivals_laps

if __name__ == "__main__":
    inspect_session_timeline("2024_qatar_gp_race", "verstappen")
