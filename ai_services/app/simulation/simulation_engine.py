import json
import numpy as np
from typing import List, Dict, Any, Optional
from ..core.logger import logger
from ..core.db import execute_query
from .tire_model import fit_tire_parameters
from .pitstop_simulator import get_pit_lane_loss, adjust_stints_for_simulated_stop
from .race_projection import project_race_timeline

def load_session_data_from_db(session_id: str, target_driver_id: str) -> Optional[Dict[str, Any]]:
    """Loads all timing, stint, and competitor data from PostgreSQL for a given session."""
    try:
        # 1. Total laps in session
        total_laps_query = execute_query(
            "SELECT MAX(lap_number) as max_lap FROM laps WHERE session_id = %s",
            (session_id,),
            fetch=True
        )
        if not total_laps_query or not total_laps_query[0]["max_lap"]:
            return None
        total_laps = int(total_laps_query[0]["max_lap"])

        # 2. Driver code resolution
        d_str = str(target_driver_id).lower().strip()
        last_word = d_str.replace("_", " ").split()[-1]
        drv_res = execute_query(
            """SELECT id, code FROM drivers 
               WHERE id = %s OR code ILIKE %s OR last_name ILIKE %s OR id ILIKE %s OR (first_name || ' ' || last_name) ILIKE %s LIMIT 1""",
            (d_str, d_str, f"%{last_word}%", f"%{last_word}%", f"%{d_str}%"),
            fetch=True
        )
        canonical_driver_id = drv_res[0]["id"] if drv_res else d_str
        drv_code = drv_res[0]["code"] if drv_res else last_word.upper()[:3]
        cand_ids = [d_str, canonical_driver_id, drv_code.lower(), drv_code.upper()]
        
        # 3. Target driver actual stints
        actual_stints = execute_query(
            """
            SELECT compound, start_lap, end_lap, stint_number 
            FROM stints 
            WHERE session_id = %s AND (driver_id = ANY(%s) OR driver_id IN (SELECT id FROM drivers WHERE code = %s))
            ORDER BY stint_number
            """,
            (session_id, cand_ids, drv_code),
            fetch=True
        )
        if not actual_stints:
            return None
            
        # 4. Target driver actual finishing position
        actual_result = execute_query(
            """
            SELECT position FROM race_results 
            WHERE session_id = %s AND (driver_id = ANY(%s) OR driver_id IN (SELECT id FROM drivers WHERE code = %s))
            """,
            (session_id, cand_ids, drv_code),
            fetch=True
        )
        actual_pos = actual_result[0]["position"] if (actual_result and actual_result[0]["position"]) else 1
        
        # 5. All laps for all drivers in session
        all_laps = execute_query(
            """
            SELECT driver_id, lap_number, lap_time_ms, compound, is_pit_out_lap, is_valid
            FROM laps 
            WHERE session_id = %s 
            ORDER BY driver_id, lap_number
            """,
            (session_id,),
            fetch=True
        )
        if not all_laps:
            return None
            
        driver_laps_map = {}
        rivals_laps_map = {}
        
        for lap in all_laps:
            d_id = lap["driver_id"]
            lap_num = lap["lap_number"]
            time_sec = (lap["lap_time_ms"] / 1000.0) if lap["lap_time_ms"] else None
            
            is_target = (d_id in cand_ids or str(d_id).lower() in [c.lower() for c in cand_ids])
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
                
        # Reconstruct full 1..total_laps timeline for target driver
        clean_driver_times = [
            v["lap_time"] for v in driver_laps_map.values()
            if v["lap_time"] and v["is_valid"] and not v["is_pit_out_lap"]
        ]
        median_pace = float(np.median(clean_driver_times)) if clean_driver_times else 85.0
        
        driver_actual_laps = []
        for k in range(1, total_laps + 1):
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
                    "lap_time": float(l_info["lap_time"]),
                    "compound": str(l_info.get("compound") or comp).upper(),
                    "is_pit_out_lap": bool(l_info.get("is_pit_out_lap")),
                    "tire_age": tire_age
                })
            else:
                # Interpolated pace for non-sampled lap
                driver_actual_laps.append({
                    "lap_number": k,
                    "lap_time": round(float(median_pace + 0.05 * (tire_age % 15) - 0.06 * k), 3),
                    "compound": comp,
                    "is_pit_out_lap": False,
                    "tire_age": tire_age
                })
                
        # Reconstruct full 1..total_laps timeline for each rival
        rivals_laps = {}
        for r_id, r_dict in rivals_laps_map.items():
            clean_r_times = [t for t in r_dict.values() if t is not None]
            r_med = float(np.median(clean_r_times)) if clean_r_times else (median_pace + 1.0)
            r_timeline = []
            for k in range(1, total_laps + 1):
                if k in r_dict and r_dict[k] is not None:
                    r_timeline.append(float(r_dict[k]))
                else:
                    r_timeline.append(round(float(r_med + 0.05 * (k % 15) - 0.06 * k), 3))
            rivals_laps[r_id] = r_timeline

        # Query Safety Car / Neutralized laps pace
        sc_query = """
            WITH grid_laps AS (
                SELECT lap_number, AVG(lap_time_ms) as avg_ms, COUNT(*) as cnt
                FROM laps
                WHERE session_id = %s AND is_valid = true AND lap_time_ms IS NOT NULL AND is_pit_out_lap = false
                GROUP BY lap_number
            ),
            med AS (
                SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY avg_ms) as med_ms
                FROM grid_laps
            )
            SELECT g.lap_number, g.avg_ms / 1000.0 as avg_s
            FROM grid_laps g, med m
            WHERE (g.avg_ms / NULLIF(m.med_ms, 0)) > 1.20 AND g.cnt >= 3
            ORDER BY g.lap_number;
        """
        sc_rows = execute_query(sc_query, (session_id,), fetch=True)
        sc_pace = {r["lap_number"]: float(r["avg_s"]) for r in sc_rows} if sc_rows else {}
            
        return {
            "total_laps": total_laps,
            "actual_stints": actual_stints,
            "driver_actual_laps": driver_actual_laps,
            "rivals_laps": rivals_laps,
            "actual_position": actual_pos,
            "sc_pace": sc_pace
        }
    except Exception as e:
        logger.error(f"[Simulation] Database query failed in simulator load for session {session_id}, driver {target_driver_id}: {e}", exc_info=True)
        return None

def compute_grid_median_deg(session_id: str) -> Dict[str, float]:
    """Calculates real grid median tire degradation slopes per compound from session stints."""
    try:
        stints_all = execute_query(
            "SELECT driver_id, compound, start_lap, end_lap, stint_length FROM stints WHERE session_id = %s AND stint_length >= 3",
            (session_id,), fetch=True
        )
        slopes_by_compound = {}
        for st in (stints_all or []):
            comp = str(st["compound"]).upper()
            if comp in ["INTERMEDIATE", "WET", "UNKNOWN"]:
                continue
            laps_st = execute_query(
                """SELECT lap_time_ms FROM laps 
                   WHERE session_id = %s AND driver_id = %s 
                     AND lap_number >= %s AND lap_number <= %s 
                     AND is_valid = true AND is_pit_out_lap = false AND lap_time_ms IS NOT NULL
                   ORDER BY lap_number""",
                (session_id, st["driver_id"], st["start_lap"], st["end_lap"]), fetch=True
            )
            if laps_st and len(laps_st) >= 3:
                times = [l["lap_time_ms"] / 1000.0 for l in laps_st]
                ages = np.arange(1, len(times) + 1)
                corrected = np.array(times) + 0.06 * ages
                slope = float(np.polyfit(ages, corrected, 1)[0])
                if 0.0 < slope < 0.5:
                    slopes_by_compound.setdefault(comp, []).append(slope)
                    
        grid_median_deg = {}
        for comp in ["SOFT", "MEDIUM", "HARD"]:
            if comp in slopes_by_compound and len(slopes_by_compound[comp]) > 0:
                grid_median_deg[comp] = round(float(np.median(slopes_by_compound[comp])), 4)
            else:
                grid_median_deg[comp] = 0.080 if comp == "MEDIUM" else (0.050 if comp == "HARD" else 0.120)
        return grid_median_deg
    except Exception as ex:
        logger.error(f"[Simulation] Error computing grid median deg for session {session_id}: {ex}", exc_info=True)
        return {"MEDIUM": 0.080, "HARD": 0.050, "SOFT": 0.120}

def run_strategy_simulation(
    session_id: str,
    driver_id: str,
    simulated_pit_lap: int,
    target_compound: str = None,
    actual_laps_cache: List[Dict] = None,
    rivals_laps_cache: Dict[str, List[float]] = None,
    actual_stints_cache: List[Dict] = None,
    actual_position_cache: int = None,
    total_laps_cache: int = 71,
    save_to_db: bool = True
) -> Dict[str, Any]:
    """Orchestrates strategy simulation, projecting times and ranks, and logging results."""
    logger.info(f"[Simulation] Starting What-If run for driver: {driver_id}, pit_lap: {simulated_pit_lap}, compound: {target_compound}")
    
    # 1. Load data either from cache (unit tests/mock) or database
    if actual_laps_cache is not None and rivals_laps_cache is not None:
        # Running in decoupled cache mode (e.g. unit tests)
        driver_actual_laps = actual_laps_cache
        rivals_laps = rivals_laps_cache
        actual_stints = actual_stints_cache or []
        actual_pos = actual_position_cache or 1
        total_laps = total_laps_cache
        pit_loss = 22.0
        grid_median_deg = {"MEDIUM": 0.080, "HARD": 0.050, "SOFT": 0.120}
        sc_pace = {}
    else:
        # Load from PostgreSQL
        db_data = load_session_data_from_db(session_id, driver_id)
        if not db_data:
            raise ValueError(f"Telemetry for this session has not been ingested yet. (No timing data found in database for session {session_id} and driver {driver_id})")
            
        driver_actual_laps = db_data["driver_actual_laps"]
        rivals_laps = db_data["rivals_laps"]
        actual_stints = db_data["actual_stints"]
        total_laps = db_data["total_laps"]
        actual_pos = db_data["actual_position"]
        sc_pace = db_data.get("sc_pace", {})
        
        # Calculate pit lane loss for this track/session
        pit_loss = float(get_pit_lane_loss({"t_pit_lane_opt": 20.80}, driver_id))
        grid_median_deg = compute_grid_median_deg(session_id)
        
        if actual_pos is None:
            rival_totals = {r_id: sum(laps) for r_id, laps in rivals_laps.items()}
            driver_actual_total = sum(lap["lap_time"] for lap in driver_actual_laps)
            all_totals = sorted(list(rival_totals.values()) + [driver_actual_total])
            actual_pos = all_totals.index(driver_actual_total) + 1

    # 2. Setup simulated stints
    simulated_stints = adjust_stints_for_simulated_stop(
        actual_stints,
        simulated_pit_lap,
        target_compound,
        total_laps
    )
    
    overtake_difficulty = 0.4
    
    # 3. Project simulated race timeline
    simulated_laps, total_traffic_loss = project_race_timeline(
        driver_actual_laps=driver_actual_laps,
        simulated_stints=simulated_stints,
        rivals_laps=rivals_laps,
        grid_median_deg=grid_median_deg,
        pit_loss=pit_loss,
        overtake_difficulty=overtake_difficulty,
        total_laps=total_laps,
        return_details=True
    )
    
    # 3b. Apply Safety Car / Neutralized pace ceiling to simulated laps
    if sc_pace:
        capped_sim_laps = []
        for k, l_time in enumerate(simulated_laps, 1):
            if k in sc_pace:
                capped_sim_laps.append(max(float(l_time), sc_pace[k]))
            else:
                capped_sim_laps.append(float(l_time))
        simulated_laps = capped_sim_laps

    actual_pit_lap = None
    if actual_stints:
        actual_pit_lap = actual_stints[0].get("end_lap") or actual_stints[0].get("length")

    # 3c. Pre-Divergence Identity Blending:
    # Prior to the divergence point min(actual_pit_lap, simulated_pit_lap),
    # the driver is on the exact same tyre compound and age under identical race conditions.
    # Preserve actual recorded lap times up to the divergence point.
    div_point = min(actual_pit_lap or simulated_pit_lap, simulated_pit_lap)
    blended_simulated_laps = []
    for idx, sim_t in enumerate(simulated_laps, 1):
        if idx <= div_point and idx <= len(driver_actual_laps) and driver_actual_laps[idx - 1].get("lap_time") is not None:
            blended_simulated_laps.append(float(driver_actual_laps[idx - 1]["lap_time"]))
        else:
            blended_simulated_laps.append(float(sim_t))
    simulated_laps = blended_simulated_laps

    simulated_total_time = float(sum(simulated_laps))
    actual_total_time = float(sum(lap["lap_time"] for lap in driver_actual_laps))
    
    # Check if this what-if scenario is identical to the driver's actual strategy
    actual_compound_out = None
    if actual_stints and len(actual_stints) > 1:
        actual_compound_out = str(actual_stints[1].get("compound", "HARD")).upper()

    is_identical_strategy = (
        actual_pit_lap is not None
        and int(simulated_pit_lap) == int(actual_pit_lap)
        and (target_compound is None or str(target_compound).upper() == actual_compound_out)
    )

    if is_identical_strategy:
        strategy_delta_s = 0.0
        net_time_gain_ms = 0
        counterfactual_real_total = actual_total_time
        simulated_pos = int(actual_pos)
        position_change = 0
    else:
        net_time_gain_ms = int((actual_total_time - simulated_total_time) * 1000)
        strategy_delta_s = actual_total_time - simulated_total_time
        counterfactual_real_total = simulated_total_time

        # 4. Rank simulated driver against rivals' actual total times using counterfactual race time
        rival_totals = {r_id: sum(laps) for r_id, laps in rivals_laps.items()}
        sorted_times = sorted(list(rival_totals.values()) + [counterfactual_real_total])
        simulated_pos = int(sorted_times.index(counterfactual_real_total) + 1)
        position_change = int(actual_pos - simulated_pos)
    
    actual_pit_lap = None
    if actual_stints:
        actual_pit_lap = actual_stints[0].get("end_lap") or actual_stints[0].get("length")
    
    actual_lap_times = [
        {
            "lap_number": int(lap.get("lap_number", idx + 1)),
            "lap_time": round(float(lap["lap_time"]), 3),
            "compound": str(lap.get("compound", "MEDIUM")).upper(),
            "is_pit_out_lap": bool(lap.get("is_pit_out_lap", False))
        }
        for idx, lap in enumerate(driver_actual_laps)
        if lap.get("lap_time") is not None
    ]

    response = {
        "session_id": session_id,
        "driver_id": driver_id,
        "simulated_pit_lap": int(simulated_pit_lap),
        "actual_pit_lap": int(actual_pit_lap) if actual_pit_lap else None,
        "target_compound": str(target_compound or (simulated_stints[1]["compound"] if len(simulated_stints) > 1 else "HARD")),
        "actual_finishing_position": int(actual_pos),
        "projected_finishing_position": int(simulated_pos),
        "position_change": int(position_change),
        "actual_total_time_seconds": round(actual_total_time, 3),
        "projected_total_time_seconds": round(counterfactual_real_total, 3),
        "simulated_baseline_total_seconds": round(actual_total_time, 3),
        "simulated_scenario_total_seconds": round(simulated_total_time, 3),
        "simulated_net_time_gain_ms": int(net_time_gain_ms),
        "undercut_gain": round(float(net_time_gain_ms / 1000.0), 3),
        "actual_lap_times": actual_lap_times,
        "simulated_lap_times": [round(float(l), 3) for l in simulated_laps],
        "traffic_loss": round(float(total_traffic_loss), 3),
        "run_parameters": {
            "pit_loss": float(pit_loss),
            "traffic_loss": round(float(total_traffic_loss), 3),
            "overtake_difficulty": float(overtake_difficulty),
            "stints": simulated_stints,
            "actual_stints": actual_stints,
            "grid_median_deg": grid_median_deg
        }
    }
    
    # 5. Persist simulation outcome to Postgres if save_to_db is true
    if save_to_db:
        try:
            execute_query(
                """
                INSERT INTO simulation_runs (
                    session_id, driver_id, simulated_pit_lap, actual_pit_lap,
                    simulated_net_time_gain_ms, simulated_position_change, run_parameters
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    session_id,
                    driver_id,
                    simulated_pit_lap,
                    actual_pit_lap,
                    net_time_gain_ms,
                    position_change,
                    json.dumps(response["run_parameters"])
                )
            )
            logger.info(f"[Simulation] Saved run outcomes to database for driver: {driver_id}")
        except Exception as e:
            logger.error(f"[Simulation] Failed to save simulation to DB: {e}", exc_info=True)
            
    return response

