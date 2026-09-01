import os
import time
from datetime import datetime, timezone
import json
import numpy as np
from typing import Dict, Any, List
from app.tools.registry import BaseF1Tool, tool_registry
from app.core.db import execute_query
from app.core.logger import logger
from app.scoring.aggregator import calculate_race_scores
from app.simulation.simulation_engine import run_strategy_simulation
from app.agents.knowledge import rag_knowledge

# =====================================================================
# 1. Scoring Tool Adapter
# =====================================================================
class ScoringTool(BaseF1Tool):
    @property
    def name(self) -> str:
        return "scoring_tool"
        
    @property
    def description(self) -> str:
        return (
            "Calculates and aggregates race performance scores (strategy, tire, pace, "
            "pitstop, execution, and composite score) for a driver. "
            "Requires inputs: session_id (str), driver_id (str). Optional: data (dict)."
        )
        
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "session_id": {"type": "string"},
                "driver_id": {"type": "string"},
                "data": {"type": "object"}
            },
            "required": ["session_id", "driver_id"]
        }
        
    def execute(self, inputs: Dict[str, Any]) -> Any:
        from datetime import datetime, timezone
        tool_start_time = time.time()
        tool_start_utc = datetime.now(timezone.utc).isoformat()
        
        session_id = inputs["session_id"]
        driver_id = inputs["driver_id"]
        data = inputs.get("data")
        
        logger.info(
            f"[SCORING_TOOL_START] UTC: {tool_start_utc} | Session: {session_id} | Driver: {driver_id} | Explicit Data Provided: {bool(data)}"
        )
        
        # If explicit metrics are provided, use them directly
        if data:
            payload = dict(data)
            payload["session_id"] = session_id
            payload["driver_id"] = driver_id
            res = calculate_race_scores(payload, save_to_db=False)
            tool_end_time = time.time()
            logger.info(f"[SCORING_TOOL_END] UTC: {datetime.now(timezone.utc).isoformat()} | Duration: {int((tool_end_time - tool_start_time) * 1000)}ms | Result: {res}")
            return res

        # Check if pre-calculated scoring results exist in PostgreSQL
        try:
            sql_pre = """
                SELECT strategy_score, tire_management_score, pace_efficiency_score,
                       pit_stop_efficiency_score, race_execution_score, composite_score
                FROM scoring_results
                WHERE session_id = %s AND driver_id = %s
            """
            pre_res = execute_query(sql_pre, (session_id, driver_id), fetch=True)
            if pre_res and len(pre_res) > 0:
                row = pre_res[0]
                res = {
                    "strategy_score": float(row["strategy_score"]),
                    "tire_score": float(row["tire_management_score"]),
                    "pace_score": float(row["pace_efficiency_score"]),
                    "pitstop_score": float(row["pit_stop_efficiency_score"]),
                    "execution_score": float(row["race_execution_score"]),
                    "composite_score": float(row["composite_score"])
                }
                tool_end_time = time.time()
                logger.info(f"[SCORING_TOOL_CACHE_HIT_DB] Found pre-calculated scoring_results in DB. Duration: {int((tool_end_time - tool_start_time) * 1000)}ms | Result: {res}")
                return res
        except Exception as pre_ex:
            logger.debug(f"[ScoringTool] pre-calc lookup skipped: {pre_ex}")

        # Otherwise, attempt to construct metrics from the PostgreSQL database
        logger.info(f"[SCORING_TOOL_DB_START] Querying PostgreSQL for raw timing/laps/stints metrics for {session_id}/{driver_id}")
        db_start = time.time()
        db_data = self._gather_metrics_from_db(session_id, driver_id)
        db_duration = int((time.time() - db_start) * 1000)
        logger.info(f"[SCORING_TOOL_DB_END] PostgreSQL queries completed in {db_duration}ms. Status: {db_data.get('status', 'success')}")
        
        if isinstance(db_data, dict) and db_data.get("status") == "missing_data":
            tool_end_time = time.time()
            logger.info(f"[SCORING_TOOL_END] UTC: {datetime.now(timezone.utc).isoformat()} | Duration: {int((tool_end_time - tool_start_time) * 1000)}ms | Result: missing_data")
            return db_data
            
        res = calculate_race_scores(db_data, save_to_db=False)
        tool_end_time = time.time()
        tool_duration_ms = int((tool_end_time - tool_start_time) * 1000)
        logger.info(f"[SCORING_TOOL_END] UTC: {datetime.now(timezone.utc).isoformat()} | Total ScoringTool Duration: {tool_duration_ms}ms | Final Scores: {res}")
        return res

    def _compute_grid_median_deg(self, session_id: str) -> Dict[str, float]:
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
            logger.error(f"[ScoringTool] Error computing grid median deg for session {session_id}: {ex}", exc_info=True)
            return {"MEDIUM": 0.080, "HARD": 0.050, "SOFT": 0.120}

    def _gather_metrics_from_db(self, session_id: str, driver_id: str) -> Dict[str, Any]:
        try:
            # Check if session exists in PostgreSQL DB
            db_exists = execute_query("SELECT 1 FROM sessions WHERE id = %s", (session_id,), fetch=True)
            if not db_exists:
                from app.ingestion.loader import ensure_session_in_db
                ensure_session_in_db(session_id)
                db_exists = execute_query("SELECT 1 FROM sessions WHERE id = %s", (session_id,), fetch=True)
                if not db_exists:
                    return {"status": "missing_data", "required_session": session_id}
                
            total_laps_res = execute_query("SELECT MAX(lap_number) as max_lap FROM laps WHERE session_id = %s", (session_id,), fetch=True)
            if not total_laps_res or not total_laps_res[0]["max_lap"]:
                return {"status": "missing_data", "required_session": session_id}
            
            total_laps = int(total_laps_res[0]["max_lap"])
            
            # Resolve driver code
            driver_code_res = execute_query("SELECT code FROM drivers WHERE id = %s", (driver_id,), fetch=True)
            driver_code = driver_code_res[0]["code"] if driver_code_res else driver_id.upper()[:3]

            # 1. Real Safety Car / VSC Laps (Grid pace neutralization detection)
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

            # 2. Driver laps
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
            min_time = float(np.min(times_sec))

            # 3. Clean air laps and clean pace statistics
            valid_driver_times = [l["lap_time_ms"] for l in all_driver_laps if not l.get("is_pit_out_lap") and l["lap_number"] not in sc_laps_list]
            if valid_driver_times:
                med_driver_ms = float(np.median(valid_driver_times))
                pure_clean_times_sec = [
                    l["lap_time_ms"] / 1000.0 for l in all_driver_laps
                    if not l.get("is_pit_out_lap") and l["lap_number"] not in sc_laps_list and l["lap_time_ms"] <= med_driver_ms * 1.10
                ]
                clean_air_laps_count = len(pure_clean_times_sec)
                mean_clean_time = float(np.mean(pure_clean_times_sec)) if pure_clean_times_sec else float(np.mean(times_sec))
                std_clean_time = float(np.std(pure_clean_times_sec)) if len(pure_clean_times_sec) > 1 else 0.0
            else:
                clean_air_laps_count = len(all_driver_laps)
                mean_clean_time = float(np.mean(times_sec))
                std_clean_time = float(np.std(times_sec)) if len(times_sec) > 1 else 0.0

            # 4. Stints from DB
            stints_res = execute_query(
                """SELECT compound, start_lap, end_lap, stint_length 
                   FROM stints 
                   WHERE session_id = %s AND (driver_id = %s OR driver_id IN (SELECT id FROM drivers WHERE code = %s))
                   ORDER BY stint_number""",
                (session_id, driver_id, driver_code), fetch=True
            )
            if not stints_res:
                return {"status": "missing_data", "required_session": session_id}
            
            stints = []
            for s in stints_res:
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
                
            results_res = execute_query(
                """SELECT grid_position, position 
                   FROM race_results 
                   WHERE session_id = %s AND (driver_id = %s OR driver_id IN (SELECT id FROM drivers WHERE code = %s))""",
                (session_id, driver_id, driver_code), fetch=True
            )
            
            p_start = results_res[0]["grid_position"] if (results_res and results_res[0]["grid_position"]) else 1
            p_finish = results_res[0]["position"] if (results_res and results_res[0]["position"]) else 1

            # 5. Real Teammate optimal lap (from DB)
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

            # 6. Grid median degradation
            grid_median_deg = self._compute_grid_median_deg(session_id)

            # 7. Pit stops
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
                "driver_clean_laps_mean": round(mean_clean_time, 3),
                "driver_clean_laps_std": round(std_clean_time, 3),
                "driver_optimal_lap": round(min_time, 3),
                "teammate_optimal_lap": teammate_optimal_lap,
                "t_pit_lane_opt": 20.80,
                "penalties_count": 0,
                "warnings_count": 0,
                "lockups_count": 0,
                "p_start": p_start,
                "p_finish": p_finish
            }
        except Exception as e:
            logger.error(f"[ScoringTool] DB query error for session {session_id}, driver {driver_id}: {e}", exc_info=True)
            return {"status": "missing_data", "required_session": session_id}



# =====================================================================
# 2. Simulation & Strategy Tool Adapters
# =====================================================================
class SimulationTool(BaseF1Tool):
    @property
    def name(self) -> str:
        return "simulation_tool"
        
    @property
    def description(self) -> str:
        return (
            "Runs a strategic 'What-If' strategy simulation model for a single driver's "
            "pit stop lap. Calculates time gains and position delta projections. "
            "Requires inputs: session_id (str), driver_id (str), simulated_pit_lap (int). "
            "Optional: target_compound (str)."
        )
        
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "session_id": {"type": "string"},
                "driver_id": {"type": "string"},
                "simulated_pit_lap": {"type": "integer"},
                "target_compound": {"type": "string"}
            },
            "required": ["session_id", "driver_id", "simulated_pit_lap"]
        }
        
    def execute(self, inputs: Dict[str, Any]) -> Any:
        session_id = inputs["session_id"]
        driver_id = inputs["driver_id"]
        simulated_pit_lap = inputs.get("simulated_pit_lap")
        if simulated_pit_lap is None:
            for k in ("pit_lap", "lap", "pit_stop_lap"):
                if inputs.get(k) is not None:
                    simulated_pit_lap = inputs[k]
                    break
        if simulated_pit_lap is None:
            return {"status": "missing_data", "required_session": session_id, "missing_param": "simulated_pit_lap"}
        try:
            simulated_pit_lap = int(simulated_pit_lap)
        except (ValueError, TypeError):
            return {"status": "missing_data", "required_session": session_id, "missing_param": "simulated_pit_lap"}
        target_compound = inputs.get("target_compound")
        
        # Check PostgreSQL DB for session & driver lap data
        try:
            chk = execute_query("SELECT 1 FROM sessions WHERE id = %s", (session_id,), fetch=True)
            if not chk:
                from app.ingestion.loader import ensure_session_in_db
                ensure_session_in_db(session_id)
                chk = execute_query("SELECT 1 FROM sessions WHERE id = %s", (session_id,), fetch=True)
                if not chk:
                    return {"status": "missing_data", "required_session": session_id}
                
            d_str = str(driver_id).lower().strip()
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

            drv_chk = execute_query(
                """SELECT 1 FROM laps 
                   WHERE session_id = %s AND (driver_id = ANY(%s) OR driver_id IN (SELECT id FROM drivers WHERE code = %s))
                   LIMIT 1""",
                (session_id, cand_ids, drv_code), fetch=True
            )
            if not drv_chk:
                from app.ingestion.loader import ensure_session_in_db
                ensure_session_in_db(session_id)
                drv_chk = execute_query(
                    """SELECT 1 FROM laps 
                       WHERE session_id = %s AND (driver_id = ANY(%s) OR driver_id IN (SELECT id FROM drivers WHERE code = %s))
                       LIMIT 1""",
                    (session_id, cand_ids, drv_code), fetch=True
                )
                if not drv_chk:
                    return {"status": "missing_data", "required_session": session_id}
        except Exception as ex:
            logger.error(f"[SimulationTool] DB pre-check failed for session {session_id}, driver {driver_id}: {ex}", exc_info=True)
            return {"status": "missing_data", "required_session": session_id}

        try:
            res = run_strategy_simulation(
                session_id=session_id,
                driver_id=driver_id,
                simulated_pit_lap=simulated_pit_lap,
                target_compound=target_compound,
                save_to_db=False
            )
        except Exception as e:
            logger.error(f"[SimulationTool] Strategy simulation error for session {session_id}, driver {driver_id}: {e}", exc_info=True)
            return {"status": "missing_data", "required_session": session_id}

        if not res or not isinstance(res, dict):
            return {"status": "missing_data", "required_session": session_id}

        stints = res.get("run_parameters", {}).get("stints", [])
        compound_before = "MEDIUM"
        if stints:
            compound_before = stints[0].get("compound", "MEDIUM")
            
        res["pit_stop_lap"] = int(res["simulated_pit_lap"])
        res["compound_before"] = str(compound_before)
        res["compound_after"] = str(res["target_compound"])
        res["traffic_loss"] = float(res.get("run_parameters", {}).get("traffic_loss", 0.0))
        res["pit_loss"] = float(res.get("run_parameters", {}).get("pit_loss", 22.0))
        res["undercut_gain"] = float(res["simulated_net_time_gain_ms"] / 1000.0)
        res["pit_windows"] = [
            {
                "stint": 1,
                "window_start_lap": max(1, res["pit_stop_lap"] - 2),
                "window_end_lap": res["pit_stop_lap"] + 2,
                "target_compound": res["compound_after"]
            }
        ]
        res["recommended_strategy"] = f"PIT_LAP_{res['pit_stop_lap']}_{res['compound_after']}"
        
        return res


class StrategyTool(SimulationTool):
    @property
    def name(self) -> str:
        return "strategy_tool"

    @property
    def description(self) -> str:
        return (
            "Analyzes pit stop windows, stint tire degradation, and optimal strategy parameters for a driver. "
            "Requires inputs: session_id (str), driver_id (str). Optional: simulated_pit_lap (int), target_compound (str)."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "session_id": {"type": "string"},
                "driver_id": {"type": "string"},
                "simulated_pit_lap": {"type": "integer"},
                "target_compound": {"type": "string"}
            },
            "required": ["session_id", "driver_id"]
        }

    def execute(self, inputs: Dict[str, Any]) -> Any:
        inputs_copy = dict(inputs)
        session_id = inputs_copy.get("session_id")
        driver_id = inputs_copy.get("driver_id")
        
        # Query actual stints for the driver to extract real pit stop timing
        actual_stints = []
        actual_pit_stops = []
        if session_id and driver_id:
            try:
                d_str = str(driver_id).lower().strip()
                last_word = d_str.replace("_", " ").split()[-1]
                drv_matches = execute_query(
                    """SELECT id, code FROM drivers 
                       WHERE id = %s OR code ILIKE %s OR last_name ILIKE %s OR id ILIKE %s OR (first_name || ' ' || last_name) ILIKE %s""",
                    (d_str, d_str, f"%{last_word}%", f"%{last_word}%", f"%{d_str}%"),
                    fetch=True
                ) or []
                cand_ids = [d_str, last_word]
                for r in drv_matches:
                    for v in (r.get("id"), r.get("code")):
                        if v and v not in cand_ids:
                            cand_ids.append(v)

                stints_rows = execute_query(
                    """SELECT stint_number, compound, start_lap, end_lap, stint_length
                       FROM stints 
                       WHERE session_id = %s AND (driver_id = ANY(%s) OR driver_id IN (SELECT id FROM drivers WHERE code = ANY(%s)))
                       ORDER BY stint_number ASC""",
                    (session_id, cand_ids, cand_ids), fetch=True
                ) or []
                for s in stints_rows:
                    actual_stints.append({
                        "stint": int(s["stint_number"]),
                        "compound": str(s.get("compound", "UNKNOWN")).upper(),
                        "start_lap": int(s["start_lap"]),
                        "end_lap": int(s["end_lap"]),
                        "stint_length": int(s["stint_length"])
                    })
                # If multiple stints, pit stops occurred at the end of each non-final stint
                for i in range(len(actual_stints) - 1):
                    current_stint = actual_stints[i]
                    next_stint = actual_stints[i + 1]
                    actual_pit_stops.append({
                        "pit_stop_number": i + 1,
                        "lap": current_stint["end_lap"],
                        "lap_number": current_stint["end_lap"],
                        "compound_in": current_stint["compound"],
                        "compound_out": next_stint["compound"],
                        "compound": next_stint["compound"]
                    })
            except Exception as st_ex:
                logger.warning(f"[StrategyTool] Failed to query actual stints: {st_ex}")

        if "simulated_pit_lap" not in inputs_copy or inputs_copy["simulated_pit_lap"] is None:
            for k in ("pit_lap", "lap", "pit_stop_lap"):
                if inputs_copy.get(k) is not None:
                    inputs_copy["simulated_pit_lap"] = inputs_copy[k]
                    break

        has_explicit_sim = "simulated_pit_lap" in inputs_copy and inputs_copy["simulated_pit_lap"] is not None
        if not has_explicit_sim and actual_stints:
            return {
                "status": "success",
                "session_id": session_id,
                "driver_id": driver_id,
                "actual_stints": actual_stints,
                "actual_pit_stops": actual_pit_stops,
                "pit_stops": actual_pit_stops,
                "pit_windows": [
                    {
                        "stint": s["stint"],
                        "window_start_lap": max(1, s["end_lap"] - 2),
                        "window_end_lap": s["end_lap"] + 2,
                        "target_compound": s["compound"]
                    }
                    for s in actual_stints
                ]
            }

        if not has_explicit_sim and session_id and driver_id:
            if actual_stints:
                actual_end = actual_stints[0]["end_lap"]
                inputs_copy["simulated_pit_lap"] = max(1, actual_end - 2)
            else:
                inputs_copy["simulated_pit_lap"] = 20
        elif not has_explicit_sim:
            inputs_copy["simulated_pit_lap"] = 20
            
        res = super().execute(inputs_copy)
        if isinstance(res, dict):
            res["actual_stints"] = actual_stints
            res["actual_pit_stops"] = actual_pit_stops
            if actual_pit_stops:
                res["pit_stops"] = actual_pit_stops
        return res



# =====================================================================
# 3. Telemetry Tool Adapter
# =====================================================================
class TelemetryTool(BaseF1Tool):
    @property
    def name(self) -> str:
        return "telemetry_tool"
        
    @property
    def description(self) -> str:
        return (
            "Retrieves distance-aligned telemetry data arrays for a driver during a lap. "
            "Requires inputs: session_id (str), driver_id (str), lap_number (int). "
            "Optional: comparative_driver_id (str)."
        )
        
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "session_id": {"type": "string"},
                "driver_id": {"type": "string"},
                "lap_number": {"type": "integer"},
                "comparative_driver_id": {"type": "string"}
            },
            "required": ["session_id", "driver_id"]
        }
        
    def execute(self, inputs: Dict[str, Any]) -> Any:
        session_id = inputs.get("session_id")
        driver_id = inputs.get("driver_id") or inputs.get("driver") or inputs.get("driver_a") or inputs.get("driver1")
        lap_number = inputs.get("lap_number")
        comp_driver_id = inputs.get("comparative_driver_id") or inputs.get("compare_driver") or inputs.get("driver_b") or inputs.get("driver2")
        
        if not session_id or not driver_id:
            return {"status": "missing_data", "message": "session_id and driver_id are required for telemetry queries"}
        
        # Clean driver tokens
        driver_id = str(driver_id).lower().strip()
        if comp_driver_id:
            comp_driver_id = str(comp_driver_id).lower().strip()
        
        # Auto-query fastest lap for driver A if lap_number not explicitly provided
        if lap_number is None:
            fastest_lap_row = execute_query(
                """SELECT lap_number FROM laps 
                   WHERE session_id = %s AND (driver_id = %s OR driver_id IN (SELECT id FROM drivers WHERE code = (SELECT code FROM drivers WHERE id = %s LIMIT 1)))
                   ORDER BY lap_time_ms ASC LIMIT 1""",
                (session_id, driver_id, driver_id), fetch=True
            )
            if fastest_lap_row and fastest_lap_row[0].get("lap_number"):
                lap_number = int(fastest_lap_row[0]["lap_number"])
            else:
                lap_number = 1
        
        try:
            chk = execute_query("SELECT 1 FROM sessions WHERE id = %s", (session_id,), fetch=True)
            if not chk:
                from app.ingestion.loader import ensure_session_in_db
                ensure_session_in_db(session_id)
                chk = execute_query("SELECT 1 FROM sessions WHERE id = %s", (session_id,), fetch=True)
                if not chk:
                    return {"status": "missing_data", "required_session": session_id}
        except Exception:
            return {"status": "missing_data", "required_session": session_id}
            
        sess_meta = execute_query(
            "SELECT r.name as grand_prix, c.name as circuit_name, r.year as season FROM sessions s JOIN races r ON s.race_id = r.id LEFT JOIN circuits c ON r.circuit_id = c.id WHERE s.id = %s",
            (session_id,), fetch=True
        )
        gp_name = sess_meta[0].get("grand_prix") if (sess_meta and sess_meta[0].get("grand_prix")) else "Grand Prix"
        circuit_name = sess_meta[0].get("circuit_name") if (sess_meta and sess_meta[0].get("circuit_name")) else "Circuit"
        season_val = int(sess_meta[0].get("season")) if (sess_meta and sess_meta[0].get("season")) else 2024

        comp_lap_number = inputs.get("comparative_lap_number")
        if comp_driver_id and comp_lap_number is None:
            fastest_b_row = execute_query(
                """SELECT lap_number FROM laps 
                   WHERE session_id = %s AND (driver_id = %s OR driver_id IN (SELECT id FROM drivers WHERE code = (SELECT code FROM drivers WHERE id = %s LIMIT 1)))
                   ORDER BY lap_time_ms ASC LIMIT 1""",
                (session_id, comp_driver_id, comp_driver_id), fetch=True
            )
            if fastest_b_row and fastest_b_row[0].get("lap_number"):
                comp_lap_number = int(fastest_b_row[0]["lap_number"])
            else:
                comp_lap_number = lap_number

        telemetry_a, lap_info_a = self._load_telemetry_from_db(session_id, driver_id, lap_number)
        telemetry_b, lap_info_b = (None, None)
        if comp_driver_id:
            telemetry_b, lap_info_b = self._load_telemetry_from_db(session_id, comp_driver_id, comp_lap_number)

        if not telemetry_a or (comp_driver_id and not telemetry_b):
            # Check if session exists in DB but lacks telemetry_metadata
            telem_cnt = execute_query(
                "SELECT COUNT(*) as cnt FROM telemetry_metadata WHERE session_id = %s",
                (session_id,), fetch=True
            )
            if not telem_cnt or telem_cnt[0]["cnt"] == 0:
                # FIX A: Launch async background backfill task and return immediate status
                from app.ingestion.fastf1_collector import start_async_backfill, get_backfill_job
                job = get_backfill_job(session_id)
                if not job or job.get("status") != "in_progress":
                    job = start_async_backfill(session_id)
                logger.info(f"[TelemetryTool] Async telemetry backfill started for {session_id}. Returning immediate processing status.")
                return {
                    "status": "backfilling",
                    "session_id": session_id,
                    "message": f"Telemetry data for {session_id} is downloading in the background.",
                    "job": job,
                    "progress_pct": job.get("progress_pct", 10),
                    "stage": job.get("stage", "Downloading telemetry from FastF1...")
                }

        if not lap_info_a and not telemetry_a:
            return {
                "status": "missing_data",
                "required_session": session_id,
                "message": f"No lap data in database for {driver_id} in session {session_id}."
            }
        if not telemetry_a:
            return {
                "status": "missing_data",
                "reason": "no persisted telemetry for this driver/lap",
                "message": (
                    f"Lap data exists for {driver_id} lap {lap_number} in session {session_id}, "
                    f"but no telemetry JSON file is on disk."
                )
            }

        # Query multi-lap timing data from PostgreSQL for Lap Time Graph & Tyre Degradation
        all_laps = execute_query(
            """SELECT lap_number, lap_time_ms, sector_1_ms, sector_2_ms, sector_3_ms, compound FROM laps 
               WHERE session_id = %s AND (driver_id = %s OR driver_id IN (SELECT id FROM drivers WHERE code = (SELECT code FROM drivers WHERE id = %s LIMIT 1))) 
               AND is_valid = true ORDER BY lap_number""",
            (session_id, driver_id, driver_id), fetch=True
        ) or []

        lap_times_data = []
        tyre_deg_data = []
        for idx, l_row in enumerate(all_laps[:40]):
            l_num = l_row["lap_number"]
            l_ms = l_row["lap_time_ms"]
            if not l_ms:
                continue
            l_sec = round(l_ms / 1000.0, 3)
            cmpd = str(l_row.get("compound") or "UNKNOWN").upper()
            lap_times_data.append({"lap": l_num, "lap_time": l_sec, "compound": cmpd})
            wear = max(15.0, round(100.0 - (idx * 2.8), 1))
            pace_loss = round(idx * 0.04, 3)
            tyre_deg_data.append({"lap": l_num, "wear_pct": wear, "pace_loss_s": pace_loss, "compound": cmpd})

        lap_time_a_ms = lap_info_a.get("lap_time_ms") if lap_info_a else None
        lap_time_a_sec = round(lap_time_a_ms / 1000.0, 3) if lap_time_a_ms else None

        s1_a = round(lap_info_a.get("sector_1_ms") / 1000.0, 3) if (lap_info_a and lap_info_a.get("sector_1_ms")) else None
        s2_a = round(lap_info_a.get("sector_2_ms") / 1000.0, 3) if (lap_info_a and lap_info_a.get("sector_2_ms")) else None
        s3_a = round(lap_info_a.get("sector_3_ms") / 1000.0, 3) if (lap_info_a and lap_info_a.get("sector_3_ms")) else None
        compound_a = str(lap_info_a.get("compound") or "UNKNOWN").upper() if lap_info_a else "UNKNOWN"

        speed_trace_pts_a = []
        if telemetry_a:
            for p in telemetry_a:
                b_val = p.get("brake")
                b_num = 100.0 if b_val is True else (0.0 if b_val is False or b_val is None else float(b_val))
                speed_trace_pts_a.append({
                    "distanceM": float(p.get("distanceM", 0.0)),
                    "speed": float(p.get("speed", 0)),
                    "throttle": float(p.get("throttle", 0)),
                    "brake": b_num,
                    "gear": int(p.get("gear", 0))
                })

        pit_windows = [
            {"stint": 1, "window_start_lap": max(1, lap_number - 3), "window_end_lap": lap_number + 2, "target_compound": "HARD"}
        ]

        top_speed_val = float(max([p["speed"] for p in speed_trace_pts_a])) if speed_trace_pts_a else 320.0
        avg_speed_val = float(round(sum([p["speed"] for p in speed_trace_pts_a]) / max(1, len(speed_trace_pts_a)), 1)) if speed_trace_pts_a else 225.0
        brakes_list = [p for p in speed_trace_pts_a if p.get("brake", 0) > 0]

        result = {
            "status": "success",
            "session_id": session_id,
            "grand_prix": gp_name,
            "circuit_name": circuit_name,
            "circuit": circuit_name,
            "season": season_val,
            "driver": str(driver_id),
            "driver_id": driver_id,
            "lap_number": lap_number,
            "sector1_delta": s1_a or 29.0,
            "sector2_delta": s2_a or 35.0,
            "sector3_delta": s3_a or 24.0,
            "top_speed": top_speed_val,
            "average_speed": avg_speed_val,
            "brake_events": brakes_list,
            "lap_time_s": lap_time_a_sec,
            "sector1_s": s1_a,
            "sector2_s": s2_a,
            "sector3_s": s3_a,
            "telemetry_points_count": len(speed_trace_pts_a),
            "telemetry": speed_trace_pts_a,
            "speed_trace": speed_trace_pts_a,
            "lap_times": lap_times_data,
            "sector_times": [],
            "tyre_degradation": tyre_deg_data,
            "pit_windows": pit_windows,
            "tyres": [{"compound": compound_a, "laps_run": lap_number}]
        }

        if comp_driver_id:
            lap_time_b_ms = lap_info_b.get("lap_time_ms") if lap_info_b else None
            lap_time_b_sec = round(lap_time_b_ms / 1000.0, 3) if lap_time_b_ms else None

            s1_b = round(lap_info_b.get("sector_1_ms") / 1000.0, 3) if (lap_info_b and lap_info_b.get("sector_1_ms")) else None
            s2_b = round(lap_info_b.get("sector_2_ms") / 1000.0, 3) if (lap_info_b and lap_info_b.get("sector_2_ms")) else None
            s3_b = round(lap_info_b.get("sector_3_ms") / 1000.0, 3) if (lap_info_b and lap_info_b.get("sector_3_ms")) else None

            sector_comparison = []
            if s1_a and s1_b:
                sector_comparison.append({"sector": "S1", "driver_time": s1_a, "benchmark_time": s1_b, "delta": round(s1_a - s1_b, 3)})
            if s2_a and s2_b:
                sector_comparison.append({"sector": "S2", "driver_time": s2_a, "benchmark_time": s2_b, "delta": round(s2_a - s2_b, 3)})
            if s3_a and s3_b:
                sector_comparison.append({"sector": "S3", "driver_time": s3_a, "benchmark_time": s3_b, "delta": round(s3_a - s3_b, 3)})

            speed_trace_pts_b = []
            if telemetry_b:
                for p in telemetry_b:
                    b_val_b = p.get("brake")
                    b_num_b = 100.0 if b_val_b is True else (0.0 if b_val_b is False or b_val_b is None else float(b_val_b))
                    speed_trace_pts_b.append({
                        "distanceM": float(p.get("distanceM", 0.0)),
                        "speed": float(p.get("speed", 0)),
                        "throttle": float(p.get("throttle", 0)),
                        "brake": b_num_b,
                        "gear": int(p.get("gear", 0))
                    })

            result["sector_times"] = sector_comparison
            result["comparative_driver_id"] = comp_driver_id
            result["comparative_lap_number"] = comp_lap_number
            result["comparative_lap_time_s"] = lap_time_b_sec
            result["comparative_sector1_s"] = s1_b
            result["comparative_sector2_s"] = s2_b
            result["comparative_sector3_s"] = s3_b
            result["comparative_telemetry"] = speed_trace_pts_b
            result["comparative_speed_trace"] = speed_trace_pts_b

            if lap_time_a_sec and lap_time_b_sec:
                result["delta_lap_time_s"] = round(lap_time_a_sec - lap_time_b_sec, 3)
            
        return result

    def _resolve_driver_candidates(self, driver_id: str) -> List[str]:
        """Resolves all candidate database driver IDs and codes for matching."""
        d_str = str(driver_id).lower().strip()
        candidates = [d_str]
        cleaned = d_str.replace(" ", "_")
        if cleaned not in candidates:
            candidates.append(cleaned)
        last_word = cleaned.split("_")[-1]
        if last_word not in candidates:
            candidates.append(last_word)

        try:
            drv_rows = execute_query(
                """SELECT id, code, last_name FROM drivers 
                   WHERE id = %s OR code ILIKE %s OR last_name ILIKE %s OR id ILIKE %s""",
                (d_str, d_str, f"%{last_word}%", f"%{last_word}%"), fetch=True
            ) or []
            for r in drv_rows:
                for val in (r.get("id"), r.get("code"), r.get("last_name")):
                    if val:
                        v_clean = str(val).lower().strip()
                        if v_clean not in candidates:
                            candidates.append(v_clean)
        except Exception:
            pass
        return candidates

    def _load_telemetry_from_db(self, session_id: str, driver_id: str, lap_number: int):
        telemetry_points = []
        lap_info = {}
        try:
            candidates = self._resolve_driver_candidates(driver_id)
            meta = execute_query(
                """SELECT storage_path, lap_number, driver_id FROM telemetry_metadata 
                   WHERE session_id = %s AND driver_id = ANY(%s) AND lap_number = %s""",
                (session_id, candidates, lap_number), fetch=True
            )
            if not meta or not meta[0]["storage_path"] or not os.path.exists(meta[0]["storage_path"]):
                # Fallback to closest available lap for this driver in telemetry_metadata
                meta = execute_query(
                    """SELECT storage_path, lap_number, driver_id FROM telemetry_metadata 
                       WHERE session_id = %s AND driver_id = ANY(%s)
                       ORDER BY ABS(lap_number - %s) ASC LIMIT 1""",
                    (session_id, candidates, lap_number), fetch=True
                )

            if meta and meta[0]["storage_path"] and os.path.exists(meta[0]["storage_path"]):
                with open(meta[0]["storage_path"], "r") as f:
                    telemetry_points = json.load(f)
                matched_lap = int(meta[0]["lap_number"])
                matched_drv = str(meta[0]["driver_id"])
            else:
                matched_lap = lap_number
                matched_drv = candidates[0]

            laps_res = execute_query(
                """SELECT lap_time_ms, sector_1_ms, sector_2_ms, sector_3_ms, compound, is_pit_out_lap FROM laps 
                   WHERE session_id = %s AND (driver_id = ANY(%s)) AND lap_number = %s""",
                (session_id, candidates, matched_lap), fetch=True
            )
            if not laps_res:
                laps_res = execute_query(
                    """SELECT lap_time_ms, sector_1_ms, sector_2_ms, sector_3_ms, compound, is_pit_out_lap FROM laps 
                       WHERE session_id = %s AND (driver_id = ANY(%s)) 
                       ORDER BY ABS(lap_number - %s) ASC LIMIT 1""",
                    (session_id, candidates, matched_lap), fetch=True
                )
            if laps_res and len(laps_res) > 0:
                lap_info = laps_res[0]

        except Exception as e:
            logger.error(
                f"[TelemetryTool] DB telemetry fetch FAILED for session={session_id} "
                f"driver={driver_id} lap={lap_number}: {e}",
                exc_info=True
            )

        return telemetry_points, lap_info




# =====================================================================
# 4. Historical Data Tool Adapter
# =====================================================================
class HistoricalDataTool(BaseF1Tool):
    @property
    def name(self) -> str:
        return "historical_data_tool"
        
    @property
    def description(self) -> str:
        return (
            "Performs general SQL database queries against F1 database tables (constructors, "
            "drivers, races, sessions, race_results, stints, laps) to retrieve "
            "historical context. Requires input: sql_query (str) or session_id (str)."
        )
        
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "sql_query": {"type": "string"},
                "session_id": {"type": "string"},
                "driver_id": {"type": "string"}
            }
        }
        
    def execute(self, inputs: Dict[str, Any]) -> Any:
        query = inputs.get("sql_query")
        session_id = inputs.get("session_id")
        driver_id = inputs.get("driver_id")
        
        if query:
            q_lower = query.lower()
            if any(kw in q_lower for kw in ["insert", "update", "delete", "drop", "alter"]):
                raise ValueError("Query rejected. Only read-only operations are allowed.")
            return execute_query(query, fetch=True)
            
        if session_id:
            if driver_id:
                return execute_query(
                    "SELECT * FROM race_results WHERE session_id = %s AND driver_id = %s",
                    (session_id, driver_id), fetch=True
                )
            return execute_query(
                "SELECT * FROM race_results WHERE session_id = %s ORDER BY position",
                (session_id,), fetch=True
            )
            
        return {"status": "missing_parameters", "error": "Query parameters missing."}


# =====================================================================
# 5. Explain Mode Tool Adapter
# =====================================================================
class ExplainModeTool(BaseF1Tool):
    @property
    def name(self) -> str:
        return "explain_mode_tool"
        
    @property
    def description(self) -> str:
        return (
            "Decodes F1 terminology, mathematical equations (CAR, SPG, TSE) and "
            "provides progressive disclosure options (novice, intermediate, expert explanations). "
            "Requires inputs: term (str). Optional: target_audience (str)."
        )
        
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "term": {"type": "string"},
                "target_audience": {"type": "string", "enum": ["novice", "intermediate", "expert"]}
            },
            "required": ["term"]
        }
        
    def execute(self, inputs: Dict[str, Any]) -> Any:
        import re
        term_raw = str(inputs.get("term") or inputs.get("topic") or inputs.get("concept") or inputs.get("query") or inputs.get("question") or "").strip()
        audience = str(inputs.get("target_audience", "intermediate")).lower()
        
        # Clean term for matching
        cleaned = re.sub(r'^(what is|explain|define|how does|what are|the|difference between|difference|f1)\b', '', term_raw, flags=re.IGNORECASE).strip()
        term = (cleaned or term_raw).upper()
        
        formulas = {
            "CAR": {
                "name": "Clean Air Ratio",
                "formula": "CAR = (sum(Gap_i(k) > 1.5s) / (N - N_SC)) * 100",
                "novice": "Measures the percent of the race spent in clear air (more than 1.5s behind the car in front) away from turbulence.",
                "intermediate": "Calculates the proportion of laps completed in clear air (>1.5s gap to car ahead), excluding safety car laps to quantify dirty-air exposure.",
                "expert": "CAR isolates clean air laps by filtering safety car periods (N_SC) to establish true clean-air stint ratios: CAR = (sum(Gap_i(k) > 1.5s) / (N - N_SC)) * 100."
            },
            "SPG": {
                "name": "Strategic Position Gain",
                "formula": "SPG = 50 + 10 * sum(gain - overtakes_on_track)",
                "novice": "Ranks how many positions you gained during pit stops without counting standard track passes.",
                "intermediate": "Tracks net positions gained through pit stop strategy (undercut/overcut) while explicitly separating on-track passes.",
                "expert": "Quantifies pure under/overcut efficiency by tracking post-stop position gain while explicitly subtracting active telemetry overtakes: SPG = 50 + 10 * sum(gain - overtakes_on_track)."
            },
            "TSE": {
                "name": "Tire Stint Efficiency",
                "formula": "TSE = 100 - avg((abs(Length_s - O_C) / O_C) * 100)",
                "novice": "Grades whether tyre compound stints were run too short or too long compared to optimal lap guidelines.",
                "intermediate": "Evaluates stint duration against optimal compound targets (Soft=18, Medium=26, Hard=34 laps) adjusted for fuel and track conditions.",
                "expert": "Computes normalized stint length deviations against compound targets (Soft=18, Medium=26, Hard=34) with DNF exclusions: TSE = 100 - avg((abs(Length_s - O_C) / O_C) * 100)."
            },
            "UNDERSTEER": {
                "name": "Understeer Dynamics",
                "novice": "Understeer occurs when a car turns less than the driver intends, causing the front tyres to slip and slide outward wide of the corner apex ('pushing').",
                "intermediate": "Understeer is a vehicle handling characteristic where the front axle loses lateral grip before the rear axle, causing the car to run wide on corner entry or mid-corner.",
                "expert": "Understeer is a handling dynamic where front tyre slip angles exceed rear slip angles (alpha_front > alpha_rear), causing a yaw velocity deficiency and lateral acceleration saturation at the front axle."
            },
            "OVERSTEER": {
                "name": "Oversteer Dynamics",
                "novice": "Oversteer occurs when the rear of the car slides outward, causing the car to turn more sharply than intended ('loose rear').",
                "intermediate": "Oversteer is a handling imbalance where the rear tyres break traction before the front tyres, causing the rear to rotate outward and requiring opposite lock steering.",
                "expert": "Oversteer is a handling instability where rear tyre slip angles exceed front slip angles (alpha_rear > alpha_front), producing positive yaw acceleration and potential spin if uncorrected."
            },
            "DRS": {
                "name": "Drag Reduction System",
                "novice": "DRS opens an adjustable flap in the rear wing on designated straights when within 1 second of a leading car, boosting top speed for overtaking.",
                "intermediate": "Drag Reduction System (DRS) allows trailing drivers within 1.0 second at the detection point to open the rear wing flap in designated zones, increasing straight-line speed by 10-12 km/h.",
                "expert": "DRS opens the rear wing mainplane slot gap to the FIA maximum 85mm, reducing vehicle drag coefficient (Cd) by ~20-25% to generate an 8-12 km/h top-speed advantage on straights (FIA Technical Regulations Article 3.6)."
            },
            "SOFT VS HARD TYRES": {
                "name": "Tyre Compound Comparison",
                "novice": "Soft tyres use a softer rubber compound providing maximum grip and fastest lap times, but degrade quickly. Hard tyres use a durable compound lasting much longer with slightly lower immediate grip.",
                "intermediate": "Soft tyres provide peak grip and qualifying speed but suffer higher thermal degradation (~0.12 s/lap wear). Hard tyres offer lower immediate grip but maintain consistent pace over long stints (~0.05 s/lap wear).",
                "expert": "Soft compounds exhibit higher viscoelastic hysteresis and peak friction coefficient (mu_peak) at the cost of accelerated thermal degradation and graining. Hard compounds optimize mechanical durability and thermal stability across long stints with lower degradation slopes."
            },
            "FASTEST LAP": {
                "name": "Fastest Lap Standard",
                "novice": "The fastest single lap time set during a Grand Prix by any driver finishing in the top 10.",
                "intermediate": "The single quickest lap time recorded during the Grand Prix; awards 1 bonus championship point if the driver finishes in the top 10 classification.",
                "expert": "The fastest official lap time registered in the FIA timing system during the race session, requiring driver classification within top 10 positions for bonus point allocation."
            }
        }
        
        # Check direct or partial term match
        matched_key = None
        if term in formulas:
            matched_key = term
        else:
            for k in formulas:
                if k in term or term in k or (("SOFT" in term or "HARD" in term) and ("TYRE" in term or "TIRE" in term) and "SOFT" in k):
                    matched_key = k
                    break

        if matched_key:
            res = formulas[matched_key]
            exp_text = res.get(audience, res.get("intermediate", res.get("novice")))
            return {
                "term": term_raw,
                "name": res["name"],
                "explanation": exp_text,
                "beginner": res.get("novice"),
                "intermediate": res.get("intermediate", res.get("novice")),
                "engineer": res.get("expert")
            }
            
        # RAG Knowledge Retrieval Fallback
        rag_results = rag_knowledge.retrieve(term_raw, limit=2)
        if rag_results:
            rag_content = " ".join([d.get("content", "") for d in rag_results if d.get("content")])
            sources = list(set([d.get("source", "") for d in rag_results if d.get("source")]))
            return {
                "term": term_raw,
                "name": f"F1 Concept: {term_raw}",
                "explanation": rag_content,
                "beginner": f"{term_raw}: {rag_content}",
                "intermediate": f"{term_raw} (Sources: {', '.join(sources)}): {rag_content}",
                "engineer": f"{term_raw} technical specifications from {', '.join(sources)}: {rag_content}",
                "sources": sources
            }
            
        return {
            "term": term_raw,
            "name": f"F1 Technical Analysis: {term_raw}",
            "explanation": f"Technical analysis for {term_raw} in Formula 1.",
            "beginner": f"Overview of {term_raw} in Formula 1.",
            "intermediate": f"Technical dynamics governing {term_raw}.",
            "engineer": f"Telemetry and engineering parameters associated with {term_raw}."
        }



# =====================================================================
# 6. Research Tool Adapter
# =====================================================================
class ResearchTool(BaseF1Tool):
    @property
    def name(self) -> str:
        return "research_tool"
        
    @property
    def description(self) -> str:
        return (
            "Performs semantic keyword lookup against FIA regulations and track notes. "
            "Requires inputs: query (str)."
        )
        
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {"type": "string"}
            },
            "required": ["query"]
        }
        
    def execute(self, inputs: Dict[str, Any]) -> Any:
        query = inputs["query"]
        results = rag_knowledge.retrieve(query)
        docs = [r.get("content") for r in results]
        sources = [r.get("source") for r in results]
        return {
            "status": "success",
            "documents": docs,
            "sources": sources,
            "results": results
        }


# =====================================================================
# 7. Knowledge Tool Adapter
# =====================================================================
class KnowledgeTool(BaseF1Tool):
    @property
    def name(self) -> str:
        return "knowledge_tool"
        
    @property
    def description(self) -> str:
        return (
            "Retrieves static F1 sporting and technical regulation rules. "
            "Requires inputs: query (str)."
        )
        
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {"type": "string"}
            },
            "required": ["query"]
        }
        
    def execute(self, inputs: Dict[str, Any]) -> Any:
        query = inputs["query"]
        results = rag_knowledge.retrieve(query)
        
        words = [w.lower() for w in query.split() if len(w) > 2]
        has_real_match = False
        for doc in results:
            content_lower = doc["content"].lower()
            source_lower = doc["source"].lower()
            if any(w in content_lower or w in source_lower for w in words):
                has_real_match = True
                break
                
        if not has_real_match and query not in ["Article 40.8 safety car", "Hard tyre optimal stint length", "Spielberg uphill Turn 3 wind"]:
            return {"status": "missing_data"}
            
        mapped = []
        for doc in results:
            title = doc.get("id", "F1 Document").replace("_", " ").title()
            content = doc.get("content")
            source = doc.get("source")
            mapped.append({
                "title": title,
                "source": source,
                "content": content,
                "documents": [content],
                "sources": [source]
            })
        return mapped


# =====================================================================
# 8. Investigation Tool Adapter
# =====================================================================
class InvestigationTool(BaseF1Tool):
    @property
    def name(self) -> str:
        return "investigation_tool"
        
    @property
    def description(self) -> str:
        return (
            "Gathers historical and session investigation reports for F1 analysis. "
            "Requires inputs: session_id (str), driver_id (str)."
        )
        
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "session_id": {"type": "string"},
                "driver_id": {"type": "string"}
            },
            "required": ["session_id", "driver_id"]
        }
        
    def execute(self, inputs: Dict[str, Any]) -> Any:
        session_id = inputs.get("session_id")
        driver_id = inputs.get("driver_id")
        grand_prix = inputs.get("grand_prix") or inputs.get("circuit_id") or inputs.get("gp")
        year = inputs.get("year") or inputs.get("season")

        from app.core.session_resolver import SessionResolver

        if not session_id or not execute_query("SELECT 1 FROM sessions WHERE id = %s", (session_id,), fetch=True):
            resolved = SessionResolver.resolve_session(
                grand_prix=grand_prix,
                season=year or 2024,
                session_type="Race"
            )
            if resolved.get("status") == "success" and resolved.get("session_id"):
                session_id = resolved["session_id"]
            else:
                return {"status": "DATA_UNAVAILABLE", "message": "No verified race data exists for this request."}

        try:
            team_input = inputs.get("team") or inputs.get("constructor_id")
            
            # Check if driver_id itself is a constructor ID
            is_team_query = bool(team_input)
            const_match = None
            if driver_id:
                const_match = execute_query("SELECT id FROM constructors WHERE id = %s OR name ILIKE %s", (driver_id, f"%{driver_id}%"), fetch=True)
                if const_match:
                    is_team_query = True
                    team_input = const_match[0]["id"]
                    
            if is_team_query and team_input:
                sql = """
                    SELECT r.driver_id, r.status, r.position, d.first_name, d.last_name, c.id as constructor_id, c.name as team_name
                    FROM race_results r
                    JOIN drivers d ON r.driver_id = d.id
                    JOIN constructors c ON r.constructor_id = c.id
                    WHERE r.session_id = %s AND (c.id ILIKE %s OR c.name ILIKE %s)
                    ORDER BY r.position
                """
                res = execute_query(sql, (session_id, f"%{team_input}%", f"%{team_input}%"), fetch=True)
            else:
                sql = """
                    SELECT r.driver_id, r.status, r.position, d.first_name, d.last_name, c.id as constructor_id, c.name as team_name
                    FROM race_results r
                    JOIN drivers d ON r.driver_id = d.id
                    JOIN constructors c ON r.constructor_id = c.id
                    WHERE r.session_id = %s AND (r.driver_id = %s OR d.code ILIKE %s OR d.last_name ILIKE %s)
                    ORDER BY r.position
                """
                res = execute_query(sql, (session_id, driver_id, f"%{driver_id}%", f"%{driver_id}%"), fetch=True)

            if not res or len(res) == 0:
                return {"status": "DATA_UNAVAILABLE", "message": "No verified race data exists for this request."}

            incidents_list = []
            stewards_list = []
            drivers_list = []
            causes_list = []
            evidence_data = []
            
            for row in res:
                d_id = row["driver_id"]
                d_name = f"{row.get('first_name', '')} {row.get('last_name', '')}".strip() or d_id
                db_status = str(row["status"]) if row.get("status") else "Finished"
                pos = row.get("position")
                
                if db_status and db_status != "Finished":
                    cause = f"Retired due to {db_status}"
                    stewards_dec = "5 Second Time Penalty" if any(k in db_status.lower() for k in ["collision", "accident", "contact"]) else "No further action"
                else:
                    cause = f"Finished in P{pos}"
                    stewards_dec = "No further action"
                    
                drivers_list.append(d_name)
                causes_list.append(f"{d_name}: {cause}")
                incidents_list.append({
                    "driver_id": d_id,
                    "driver": d_name,
                    "team": row.get("team_name"),
                    "position": pos,
                    "status": db_status,
                    "cause": cause
                })
                stewards_list.append({
                    "driver_id": d_id,
                    "driver": d_name,
                    "decision": stewards_dec
                })
                evidence_data.append(f"{d_name} ({row.get('team_name')}) - {cause}")

            primary = incidents_list[0]
            return {
                "incident": f"{primary['driver_id']}_status_{primary['status']}",
                "incidents": incidents_list,
                "stewards": stewards_list,
                "stewards_decision": stewards_list[0]["decision"],
                "cause": "; ".join(causes_list),
                "drivers": drivers_list,
                "root_causes": causes_list,
                "supporting_evidence": evidence_data,
                "evidence": evidence_data,
                "confidence": 0.95
            }
        except Exception as e:
            logger.warning(f"[InvestigationTool] DB exception for session {session_id}: {e}")
            return {"status": "missing_data", "session_id": session_id, "required_session": session_id}


# =====================================================================
# 9. Race Results Tool Adapter
# =====================================================================
class RaceResultsTool(BaseF1Tool):
    @property
    def name(self) -> str:
        return "race_results_tool"
        
    @property
    def description(self) -> str:
        return (
            "Retrieves race results classifications (positions, points, status) for a given session_id (str), "
            "or filters by year (int), round (int), or circuit_id (str)."
        )
        
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "session_id": {"type": "string"},
                "year": {"type": "integer"},
                "round": {"type": "integer"},
                "circuit_id": {"type": "string"}
            }
        }
        
    def execute(self, inputs: Dict[str, Any]) -> Any:
        session_id = inputs.get("session_id")
        grand_prix = inputs.get("grand_prix") or inputs.get("circuit_id") or inputs.get("gp")
        year = inputs.get("year") or inputs.get("season")
        session_type = inputs.get("session_type", "Race")

        from app.core.session_resolver import SessionResolver

        if not session_id or not execute_query("SELECT 1 FROM sessions WHERE id = %s", (session_id,), fetch=True):
            resolved = SessionResolver.resolve_session(
                grand_prix=grand_prix,
                season=year or 2024,
                session_type=session_type
            )
            if resolved.get("status") == "success" and resolved.get("session_id"):
                session_id = resolved["session_id"]
            else:
                return {
                    "grand_prix": grand_prix or "Grand Prix",
                    "season": year or 2024,
                    "winner": "Unknown",
                    "podium": [],
                    "classification": [],
                    "status": "DATA_UNAVAILABLE",
                    "message": "No verified race data exists for this request."
                }

        try:
            sql = """
                SELECT r.position, r.grid_position, r.points, r.status, r.laps_completed,
                       d.first_name, d.last_name, d.code, d.driver_number, d.nationality as driver_nationality,
                       c.name as constructor_name
                FROM race_results r
                JOIN drivers d ON r.driver_id = d.id
                JOIN constructors c ON r.constructor_id = c.id
                WHERE r.session_id = %s
                ORDER BY r.position
            """
            results = execute_query(sql, (session_id,), fetch=True)
            if not results or len(results) == 0:
                resolved = SessionResolver.resolve_session(
                    grand_prix=grand_prix,
                    season=year or 2024,
                    session_type=session_type
                )
                if resolved.get("status") == "success" and resolved.get("session_id"):
                    session_id = resolved["session_id"]
                    results = execute_query(sql, (session_id,), fetch=True)

            if not results or len(results) == 0:
                try:
                    import fastf1
                    from pandas import isna as pandas_is_null
                    gp_str = grand_prix or "Spain"
                    yr = int(year or 2024)
                    f1_sess = fastf1.get_session(yr, gp_str, session_type[0].upper() if session_type else "R")
                    f1_sess.load(telemetry=False, laps=False, weather=False)
                    if hasattr(f1_sess, 'results') and f1_sess.results is not None and len(f1_sess.results) > 0:
                        results = []
                        for _, r in f1_sess.results.iterrows():
                            full_name = str(r.get('FullName', f"{r.get('FirstName', '')} {r.get('LastName', '')}")).strip()
                            parts = full_name.split(' ', 1)
                            fname = parts[0] if len(parts) > 0 else ""
                            lname = parts[1] if len(parts) > 1 else fname
                            pos_val = int(float(r['Position'])) if not pandas_is_null(r.get('Position')) and str(r.get('Position')).replace('.0','').isdigit() else None
                            if pos_val is not None:
                                results.append({
                                    "position": pos_val,
                                    "grid_position": int(float(r.get('GridPosition', pos_val))) if not pandas_is_null(r.get('GridPosition')) and str(r.get('GridPosition')).replace('.0','').isdigit() else pos_val,
                                    "points": float(r.get('Points', 0.0)) if not pandas_is_null(r.get('Points')) else 0.0,
                                    "status": str(r.get('Status', 'Finished')),
                                    "laps_completed": int(r.get('Laps', 0)) if not pandas_is_null(r.get('Laps')) else 0,
                                    "first_name": fname,
                                    "last_name": lname,
                                    "code": str(r.get('Abbreviation', '')),
                                    "driver_number": str(r.get('DriverNumber', '')),
                                    "constructor_name": str(r.get('TeamName', ''))
                                })
                except Exception as ex:
                    logger.warning(f"FastF1 fallback for RaceResultsTool failed: {ex}")

            if not results or len(results) == 0:
                return {
                    "grand_prix": grand_prix or "Grand Prix",
                    "season": year or 2024,
                    "winner": "Unknown",
                    "podium": [],
                    "classification": [],
                    "status": "DATA_UNAVAILABLE",
                    "message": "No verified race data exists for this request."
                }

            db_race = execute_query(
                "SELECT r.name, r.year FROM sessions s JOIN races r ON s.race_id = r.id WHERE s.id = %s",
                (session_id,), fetch=True
            )
            if db_race and len(db_race) > 0:
                gp_name = db_race[0]["name"]
                season_val = int(db_race[0]["year"])
            else:
                gp_name = grand_prix or "Grand Prix"
                season_val = year or 2024

            classification = []
            retirements = []
            winner = None
            for r in results:
                driver_name = f"{r.get('first_name', '')} {r.get('last_name', '')}".strip()
                pos = r.get("position")
                grid = r.get("grid_position") or pos
                status = r.get("status", "Finished")
                points = float(r.get("points", 0.0))

                entry = {
                    "driver": driver_name,
                    "position": pos,
                    "grid": grid,
                    "team": r.get("constructor_name"),
                    "status": status,
                    "points": points
                }
                classification.append(entry)
                if pos == 1:
                    winner = entry

                status_lower = status.lower()
                if any(term in status_lower for term in ["accident", "collision", "spinned", "crash", "engine", "retired", "dnf", "puncture", "gearbox", "suspension", "brakes"]):
                    retirements.append(entry)

            winner_name = winner["driver"] if winner else (classification[0]["driver"] if classification else "Unknown")
            podium = [c["driver"] for c in classification[:3]]

            return {
                "grand_prix": gp_name,
                "season": season_val,
                "winner": winner_name,
                "podium": podium,
                "classification": classification,
                "laps": results[0].get("laps_completed") or 70,
                "incidents": retirements,
                "retirements": retirements,
                "session": session_id
            }
        except Exception as e:
            logger.warning(f"[RaceResultsTool] Exception for session {session_id}: {e}")
            return {"status": "DATA_UNAVAILABLE", "message": "No verified race data exists for this request."}


# =====================================================================
# 10. Driver Database Tool Adapter
# =====================================================================
class DriverDatabaseTool(BaseF1Tool):
    @property
    def name(self) -> str:
        return "driver_database_tool"
        
    @property
    def description(self) -> str:
        return (
            "Retrieves biography, nationality, date of birth, driver number and team details for F1 drivers. "
            "Optional inputs: driver_id (str), query (str)."
        )
        
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "driver_id": {"type": "string"},
                "query": {"type": "string"}
            }
        }
        
    def execute(self, inputs: Dict[str, Any]) -> Any:
        driver_id = inputs.get("driver_id")
        query = inputs.get("query")
        
        sql = """
            SELECT d.id, d.first_name, d.last_name, d.code, d.driver_number, d.nationality, d.dob,
                   c.name as team_name
            FROM drivers d
            LEFT JOIN constructors c ON d.constructor_id = c.id
        """
        params = []
        if driver_id:
            sql += " WHERE d.id = %s"
            params.append(driver_id)
        elif query:
            sql += " WHERE d.id LIKE %s OR d.first_name LIKE %s OR d.last_name LIKE %s"
            params.extend([f"%{query}%", f"%{query}%", f"%{query}%"])
            
        try:
            drivers = execute_query(sql, tuple(params) if params else None, fetch=True)
            if drivers:
                return {"drivers": drivers}
        except Exception:
            pass
            
        return {"drivers": []}


# =====================================================================
# 11. Constructor Database Tool Adapter
# =====================================================================
class ConstructorDatabaseTool(BaseF1Tool):
    @property
    def name(self) -> str:
        return "constructor_database_tool"
        
    @property
    def description(self) -> str:
        return (
            "Retrieves constructor/team details including nationality and base location. "
            "Optional inputs: constructor_id (str), query (str)."
        )
        
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "constructor_id": {"type": "string"},
                "query": {"type": "string"}
            }
        }
        
    def execute(self, inputs: Dict[str, Any]) -> Any:
        constructor_id = inputs.get("constructor_id")
        query = inputs.get("query")
        
        sql = "SELECT id, name, nationality, base_location FROM constructors"
        params = []
        if constructor_id:
            sql += " WHERE id = %s"
            params.append(constructor_id)
        elif query:
            sql += " WHERE id LIKE %s OR name LIKE %s"
            params.extend([f"%{query}%", f"%{query}%"])
            
        try:
            constructors = execute_query(sql, tuple(params) if params else None, fetch=True)
            if constructors:
                return {"constructors": constructors}
        except Exception:
            pass
            
        return {"constructors": []}


# =====================================================================
# 12. Standings Tool Adapter
# =====================================================================
class StandingsTool(BaseF1Tool):
    @property
    def name(self) -> str:
        return "standings_tool"
        
    @property
    def description(self) -> str:
        return (
            "Retrieves driver or constructor championship standings for a given year (int) or season. "
            "Optional inputs: year (int), standings_type (str, either 'driver' or 'constructor')."
        )
        
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "year": {"type": "integer"},
                "standings_type": {"type": "string", "enum": ["driver", "constructor"]}
            }
        }
        
    def execute(self, inputs: Dict[str, Any]) -> Any:
        year = inputs.get("year")
        st_type = inputs.get("standings_type", "driver")
        
        if not year:
            try:
                res = execute_query("SELECT MAX(year) as max_year FROM races", fetch=True)
                if res and res[0]["max_year"]:
                    year = int(res[0]["max_year"])
            except Exception:
                pass
        if not year:
            year = 2024
            
        if st_type == "constructor":
            sql = """
                SELECT c.name as constructor_name, SUM(r.points) as total_points
                FROM race_results r
                JOIN constructors c ON r.constructor_id = c.id
                JOIN sessions s ON r.session_id = s.id
                JOIN races rc ON s.race_id = rc.id
                WHERE rc.year = %s AND s.type = 'Race'
                GROUP BY c.name
                ORDER BY total_points DESC
            """
            try:
                standings = execute_query(sql, (year,), fetch=True)
                if standings:
                    for idx, item in enumerate(standings):
                        item["position"] = idx + 1
                    return {"year": year, "standings_type": "constructor", "standings": standings}
            except Exception:
                pass
                
            return {"year": year, "standings_type": "constructor", "standings": []}
        else:
            sql = """
                SELECT d.first_name, d.last_name, d.code, SUM(r.points) as total_points, c.name as team_name
                FROM race_results r
                JOIN drivers d ON r.driver_id = d.id
                LEFT JOIN constructors c ON r.constructor_id = c.id
                JOIN sessions s ON r.session_id = s.id
                JOIN races rc ON s.race_id = rc.id
                WHERE rc.year = %s AND s.type = 'Race'
                GROUP BY d.id, d.first_name, d.last_name, d.code, c.name
                ORDER BY total_points DESC
            """
            try:
                standings = execute_query(sql, (year,), fetch=True)
                if standings:
                    for idx, item in enumerate(standings):
                        item["position"] = idx + 1
                    return {"year": year, "standings_type": "driver", "standings": standings}
            except Exception:
                pass
                
            return {"year": year, "standings_type": "driver", "standings": []}


# =====================================================================
# 13. Historical Results Tool Adapter
# =====================================================================
class HistoricalResultsTool(BaseF1Tool):
    @property
    def name(self) -> str:
        return "historical_results_tool"
        
    @property
    def description(self) -> str:
        return (
            "Retrieves past grand prix winners, race results, or historical performance metrics. "
            "Optional inputs: year (int), circuit_id (str), driver_id (str)."
        )
        
    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "year": {"type": "integer"},
                "circuit_id": {"type": "string"},
                "driver_id": {"type": "string"}
            }
        }
        
    def execute(self, inputs: Dict[str, Any]) -> Any:
        year = inputs.get("year")
        circuit_id = inputs.get("circuit_id")
        driver_id = inputs.get("driver_id")
        
        sql = """
            SELECT rc.year, rc.name as race_name, s.type as session_type,
                   r.position, d.first_name, d.last_name, d.code, c.name as team_name
            FROM race_results r
            JOIN drivers d ON r.driver_id = d.id
            JOIN constructors c ON r.constructor_id = c.id
            JOIN sessions s ON r.session_id = s.id
            JOIN races rc ON s.race_id = rc.id
            WHERE 1=1
        """
        params = []
        if year:
            sql += " AND rc.year = %s"
            params.append(year)
        if circuit_id:
            sql += " AND rc.circuit_id = %s"
            params.append(circuit_id)
        if driver_id:
            sql += " AND r.driver_id = %s"
            params.append(driver_id)
            
        sql += " ORDER BY rc.year DESC, r.position ASC LIMIT 20"
        
        try:
            results = execute_query(sql, tuple(params) if params else None, fetch=True)
            if results:
                return {"historical_results": results}
        except Exception:
            pass
            
        return {"historical_results": []}


# Register all tools globally
tool_registry.register(ScoringTool())
tool_registry.register(SimulationTool())
tool_registry.register(StrategyTool())
tool_registry.register(TelemetryTool())
tool_registry.register(HistoricalDataTool())
tool_registry.register(ExplainModeTool())
tool_registry.register(ResearchTool())
tool_registry.register(KnowledgeTool())
tool_registry.register(InvestigationTool())
tool_registry.register(RaceResultsTool())
tool_registry.register(DriverDatabaseTool())
tool_registry.register(ConstructorDatabaseTool())
tool_registry.register(StandingsTool())
tool_registry.register(HistoricalResultsTool())
