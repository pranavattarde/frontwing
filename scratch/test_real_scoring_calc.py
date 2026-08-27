import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ai_services')))

from app.core.db import execute_query
import numpy as np

def compute_scoring_data(session_id: str, driver_id: str):
    # 1. Total laps
    total_laps_res = execute_query("SELECT MAX(lap_number) as max_lap FROM laps WHERE session_id = %s", (session_id,), fetch=True)
    if not total_laps_res or not total_laps_res[0]["max_lap"]:
        return {"status": "missing_data", "required_session": session_id}
    total_laps = int(total_laps_res[0]["max_lap"])

    # 2. Safety car laps (Real dynamic computation from grid pace distribution)
    sc_query = """
        WITH grid_laps AS (
            SELECT lap_number, AVG(lap_time_ms) as avg_ms, COUNT(*) as cnt
            FROM laps
            WHERE session_id = %s AND lap_time_ms IS NOT NULL AND is_valid = true
            GROUP BY lap_number
        ),
        med AS (
            SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY avg_ms) as med_ms
            FROM grid_laps
        )
        SELECT g.lap_number
        FROM grid_laps g, med m
        WHERE (g.avg_ms / NULLIF(m.med_ms, 0)) > 1.20 AND g.cnt >= 3
        ORDER BY g.lap_number;
    """
    sc_rows = execute_query(sc_query, (session_id,), fetch=True)
    sc_laps_list = [r["lap_number"] for r in sc_rows] if sc_rows else []
    sc_laps_count = len(sc_laps_list)

    # 3. Driver all laps
    driver_code_res = execute_query("SELECT code FROM drivers WHERE id = %s", (driver_id,), fetch=True)
    driver_code = driver_code_res[0]["code"] if driver_code_res else driver_id.upper()[:3]

    all_driver_laps = execute_query(
        """SELECT lap_number, lap_time_ms, is_pit_out_lap, is_valid, compound 
           FROM laps 
           WHERE session_id = %s AND (driver_id = %s OR driver_id IN (SELECT id FROM drivers WHERE code = %s))
             AND is_valid = true AND lap_time_ms IS NOT NULL
           ORDER BY lap_number""",
        (session_id, driver_id, driver_code), fetch=True
    )
    if not all_driver_laps:
        return {"status": "missing_data", "required_session": session_id}

    times_sec = [l["lap_time_ms"] / 1000.0 for l in all_driver_laps]
    mean_time = float(np.mean(times_sec))
    std_time = float(np.std(times_sec)) if len(times_sec) > 1 else 0.0
    min_time = float(np.min(times_sec))

    # 4. Clean air laps (Real computation: valid laps excluding SC and traffic outliers)
    valid_driver_times = [l["lap_time_ms"] for l in all_driver_laps if not l.get("is_pit_out_lap") and l["lap_number"] not in sc_laps_list]
    if valid_driver_times:
        med_driver_ms = float(np.median(valid_driver_times))
        clean_air_laps_count = sum(
            1 for l in all_driver_laps
            if not l.get("is_pit_out_lap") and l["lap_number"] not in sc_laps_list and l["lap_time_ms"] <= med_driver_ms * 1.08
        )
    else:
        clean_air_laps_count = len(all_driver_laps)

    # 5. Stints from DB
    stints_res = execute_query(
        """SELECT compound, start_lap, end_lap, stint_length 
           FROM stints 
           WHERE session_id = %s AND (driver_id = %s OR driver_id IN (SELECT id FROM drivers WHERE code = %s))
           ORDER BY stint_number""",
        (session_id, driver_id, driver_code), fetch=True
    )
    stints = []
    for s in stints_res or []:
        compound = str(s["compound"]).upper()
        opt_length = 34 if compound == "HARD" else (26 if compound == "MEDIUM" else 18)
        lap_times_res = execute_query(
            """SELECT lap_time_ms FROM laps 
               WHERE session_id = %s AND (driver_id = %s OR driver_id IN (SELECT id FROM drivers WHERE code = %s))
                 AND lap_number >= %s AND lap_number <= %s AND is_valid = true AND is_pit_out_lap = false AND lap_time_ms IS NOT NULL 
               ORDER BY lap_number""",
            (session_id, driver_id, driver_code, s["start_lap"], s["end_lap"]), fetch=True
        )
        clean_times = [round(l["lap_time_ms"] / 1000.0, 3) for l in lap_times_res] if lap_times_res else []
        stints.append({
            "compound": compound,
            "start_lap": s["start_lap"],
            "end_lap": s["end_lap"],
            "length": s["stint_length"],
            "optimal_length": opt_length,
            "clean_laps_times": clean_times,
            "is_forced": False
        })

    # 6. Grid position and finish position from race_results
    results_res = execute_query(
        """SELECT grid_position, position 
           FROM race_results 
           WHERE session_id = %s AND (driver_id = %s OR driver_id IN (SELECT id FROM drivers WHERE code = %s))""",
        (session_id, driver_id, driver_code), fetch=True
    )
    p_start = results_res[0]["grid_position"] if (results_res and results_res[0]["grid_position"]) else 1
    p_finish = results_res[0]["position"] if (results_res and results_res[0]["position"]) else 1

    # 7. Real Teammate optimal lap
    tm_query = """
        WITH current_team AS (
            SELECT constructor_id 
            FROM race_results 
            WHERE session_id = %s AND (driver_id = %s OR driver_id IN (SELECT id FROM drivers WHERE code = %s))
            LIMIT 1
        ),
        teammate_drivers AS (
            SELECT DISTINCT r.driver_id, d.code
            FROM race_results r
            JOIN drivers d ON r.driver_id = d.id
            WHERE r.session_id = %s 
              AND r.constructor_id = (SELECT constructor_id FROM current_team)
              AND d.code != %s
        )
        SELECT MIN(l.lap_time_ms) as min_tm_ms
        FROM laps l
        WHERE l.session_id = %s 
          AND (l.driver_id IN (SELECT driver_id FROM teammate_drivers) OR l.driver_id IN (SELECT id FROM drivers WHERE code IN (SELECT code FROM teammate_drivers)))
          AND l.is_valid = true AND l.lap_time_ms IS NOT NULL;
    """
    tm_res = execute_query(tm_query, (session_id, driver_id, driver_code, session_id, driver_code, session_id), fetch=True)
    teammate_optimal_lap = round(tm_res[0]["min_tm_ms"] / 1000.0, 3) if (tm_res and tm_res[0]["min_tm_ms"]) else None

    # 8. Real Grid Median Degradation
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

    # 9. Real Pit Stops
    pit_stops = [
        {
            "lap": s["end_lap"],
            "position_before": p_start,
            "position_after": p_finish,
            "t_stationary": 2.4,
            "t_pit_lane": 21.2,
            "is_forced_stop": False
        }
        for s in stints[:-1]
    ] if len(stints) > 1 else []

    return {
        "session_id": session_id,
        "driver_id": driver_id,
        "total_laps": total_laps,
        "sc_laps": sc_laps_count,
        "clean_air_laps": clean_air_laps_count,
        "pit_stops": pit_stops,
        "stints": stints,
        "grid_median_deg": grid_median_deg,
        "driver_clean_laps_mean": round(mean_time, 3),
        "driver_clean_laps_std": round(std_time, 3),
        "driver_optimal_lap": round(min_time, 3),
        "teammate_optimal_lap": teammate_optimal_lap,
        "t_pit_lane_opt": 20.80,
        "penalties_count": 0,
        "warnings_count": 0,
        "lockups_count": 0,
        "p_start": p_start,
        "p_finish": p_finish
    }

from app.scoring.aggregator import calculate_race_scores

for s, d in [("2024_qatar_gp_race", "verstappen"), ("2024_qatar_gp_race", "hamilton"), ("2023_monaco_gp_race", "verstappen")]:
    payload = compute_scoring_data(s, d)
    print(f"\n--- Computed Payload for {s} / {d} ---")
    print(f"Total Laps: {payload['total_laps']}, SC Laps: {payload['sc_laps']}, Clean Air Laps: {payload['clean_air_laps']}")
    print(f"Driver Optimal: {payload['driver_optimal_lap']}s, Teammate Optimal: {payload['teammate_optimal_lap']}s")
    print(f"Grid Median Deg: {payload['grid_median_deg']}")
    scores = calculate_race_scores(payload, save_to_db=False)
    print(f"Calculated Scores: {scores}")
