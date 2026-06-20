import json
from typing import List, Dict, Any, Optional
from ..core.logger import logger
from ..core.db import execute_query
from .tire_model import fit_tire_parameters
from .pitstop_simulator import get_pit_lane_loss, adjust_stints_for_simulated_stop
from .race_projection import project_race_timeline

def load_session_data_from_db(session_id: str, target_driver_id: str) -> Optional[Dict[str, Any]]:
    """Loads all timing and stint data from the PostgreSQL database for a given session."""
    try:
        # 1. Get total laps in session
        total_laps_query = execute_query(
            "SELECT MAX(lap_number) as max_lap FROM laps WHERE session_id = %s",
            (session_id,),
            fetch=True
        )
        if not total_laps_query or not total_laps_query[0]["max_lap"]:
            return None
        total_laps = total_laps_query[0]["max_lap"]
        
        # 2. Get target driver's actual stints
        actual_stints = execute_query(
            """
            SELECT compound, start_lap, end_lap, stint_number 
            FROM stints 
            WHERE session_id = %s AND driver_id = %s 
            ORDER BY stint_number
            """,
            (session_id, target_driver_id),
            fetch=True
        )
        if not actual_stints:
            return None
            
        # 3. Get all lap times for all drivers
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
            
        # 4. Get target driver actual results
        actual_result = execute_query(
            "SELECT position FROM race_results WHERE session_id = %s AND driver_id = %s",
            (session_id, target_driver_id),
            fetch=True
        )
        actual_pos = actual_result[0]["position"] if actual_result else None
        
        # Structure laps
        driver_actual_laps = []
        rivals_laps = {}
        
        for lap in all_laps:
            d_id = lap["driver_id"]
            lap_num = lap["lap_number"]
            time_sec = lap["lap_time_ms"] / 1000.0 if lap["lap_time_ms"] else 75.0
            
            if d_id == target_driver_id:
                # Find tire age
                tire_age = lap_num
                for stint in actual_stints:
                    if stint["start_lap"] <= lap_num <= stint["end_lap"]:
                        tire_age = lap_num - stint["start_lap"] + 1
                        break
                driver_actual_laps.append({
                    "lap_number": lap_num,
                    "lap_time": time_sec,
                    "compound": lap["compound"],
                    "is_pit_out_lap": lap["is_pit_out_lap"],
                    "tire_age": tire_age
                })
            else:
                if d_id not in rivals_laps:
                    rivals_laps[d_id] = []
                rivals_laps[d_id].append(time_sec)
                
        return {
            "total_laps": total_laps,
            "actual_stints": actual_stints,
            "driver_actual_laps": driver_actual_laps,
            "rivals_laps": rivals_laps,
            "actual_position": actual_pos
        }
    except Exception as e:
        logger.warning(f"Database query failed in simulator load: {e}")
        return None

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
    else:
        # Load from PostgreSQL
        db_data = load_session_data_from_db(session_id, driver_id)
        if not db_data:
            raise ValueError(f"No timing data found in database for session {session_id} and driver {driver_id}")
            
        driver_actual_laps = db_data["driver_actual_laps"]
        rivals_laps = db_data["rivals_laps"]
        actual_stints = db_data["actual_stints"]
        total_laps = db_data["total_laps"]
        actual_pos = db_data["actual_position"]
        
        # Calculate pit lane loss for this track/session
        pit_loss = get_pit_lane_loss({"t_pit_lane_opt": 20.80}, driver_id)
        
        if actual_pos is None:
            # Fallback to compute actual finishing position based on actual laps sum
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
    
    # Overtake difficulty index defaults to 0.4s (Spielberg)
    overtake_difficulty = 0.4
    
    # 3. Project simulated race timeline
    simulated_laps = project_race_timeline(
        driver_actual_laps,
        simulated_stints,
        rivals_laps,
        grid_median_deg=None,
        pit_loss=pit_loss,
        overtake_difficulty=overtake_difficulty,
        total_laps=total_laps
    )
    
    simulated_total_time = sum(simulated_laps)
    actual_total_time = sum(lap["lap_time"] for lap in driver_actual_laps)
    
    # 4. Rank simulated driver against rivals' actual total times
    rival_totals = {r_id: sum(laps) for r_id, laps in rivals_laps.items()}
    sorted_times = sorted(list(rival_totals.values()) + [simulated_total_time])
    simulated_pos = sorted_times.index(simulated_total_time) + 1
    
    # Calculate gain/loss metrics
    net_time_gain_ms = int((actual_total_time - simulated_total_time) * 1000)
    position_change = actual_pos - simulated_pos # e.g. +2 means gained 2 positions
    
    actual_pit_lap = None
    if actual_stints:
        actual_pit_lap = actual_stints[0].get("end_lap") or actual_stints[0].get("length")
    
    response = {
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
            "stints": simulated_stints
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
            logger.warning(f"[Simulation] Failed to save simulation to DB: {e}")
            
    return response
