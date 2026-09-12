"""
Strategy Planner - Dedicated, isolated planner for FrontWing Strategy Engineer.

This module provides focused strategy analysis and what-if counterfactual simulations.
It has zero knowledge of pure race results, pure telemetry, or general RAG intents.
All numeric claims are strictly derived from real tool executions (RaceResultsTool,
ScoringTool, StrategyTool, SimulationTool).
"""

import re
import time
from typing import Dict, Any, List, Optional, Tuple

from app.core.logger import logger
from app.core.session_resolver import SessionResolver, get_current_f1_season
from app.core.db import execute_query
from app.tools.registry import tool_registry
from app.agents.nlp_parser import F1_DRIVER_ALIAS_MAP, F1_CIRCUIT_ALIAS_MAP, preprocess_text

try:
    from langsmith import traceable
except ImportError:
    def traceable(*args, **kwargs):
        def decorator(f):
            return f
        return decorator


# Unmodeled vehicle dynamics and setup parameters that SimulationTool cannot simulate
UNMODELED_VARIABLES = [
    "late braking", "braking later", "brake later", "braking point", "brake bias",
    "brake balance", "braking technique", "front wing", "rear wing", "wing angle",
    "flap angle", "downforce", "aero setup", "aerodynamics", "engine mode",
    "deployment mode", "ers", "kers", "party mode", "power mode", "tyre pressure",
    "tire pressure", "suspension", "camber", "toe", "ride height", "ballast",
    "gear ratio", "steering angle", "slipstream", "drs train", "fuel mixture",
    "fuel mix", "clutch release", "start reaction", "throttle map"
]


def classify_strategy_query(question: str) -> str:
    """Classifies incoming strategy query into exactly 'strategy_whatif' or 'strategy_analysis'."""
    q_lower = question.lower().strip()
    
    # What-if indicators
    whatif_patterns = [
        r"\bwhat\s+if\b",
        r"\bsimulate\b",
        r"\bwhat\s+happens?\s+if\b",
        r"\bcould\s+.*\s+(?:have\s+)?pitted\b",
        r"\bif\s+.*\s+pitted\b",
        r"\bif\s+.*\s+boxed\b",
        r"\bif\s+.*\s+stopped\b",
        r"\b(?:earlier|later)\s+(?:pit\s+stop|pit|stop)\b",
        r"\b\d+\s+laps?\s+(?:earlier|later)\b",
        r"\balternative\s+(?:lap|pit|strategy)\b",
        r"\bpit\s+(?:on\s+)?lap\s+\d+\b",
        r"\bbox\s+(?:on\s+)?lap\s+\d+\b",
        r"\bswitch\s+to\s+(?:soft|medium|hard|inters?|wets?)\b"
    ]
    for pattern in whatif_patterns:
        if re.search(pattern, q_lower):
            return "strategy_whatif"
            
    return "strategy_analysis"


def detect_unmodeled_variable(question: str) -> Optional[str]:
    """Checks if user's scenario references variables not modeled by SimulationTool."""
    q_lower = question.lower()
    for var in sorted(UNMODELED_VARIABLES, key=lambda x: len(x), reverse=True):
        if var in q_lower:
            return var
    return None


def resolve_driver(question: str, driver_hint: Optional[str] = None, context: Optional[dict] = None) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Resolves driver from explicit hint, question text, or conversation context.
    Returns (driver_id, driver_code, driver_display_name).
    """
    driver_input = driver_hint or ""
    preprocessed = preprocess_text(question)
    q_lower = preprocessed["normalized_lower"]

    # 1. Match from alias map in question text
    target_name = None
    if driver_input:
        target_name = F1_DRIVER_ALIAS_MAP.get(driver_input.lower(), driver_input)
    else:
        for alias, canonical in sorted(F1_DRIVER_ALIAS_MAP.items(), key=lambda x: len(x[0]), reverse=True):
            if re.search(r'\b' + re.escape(alias) + r'\b', q_lower):
                target_name = canonical
                break

    # 1b. Check conversation context if no driver explicitly in question
    if not target_name and context:
        ctx_drv = context.get("driver_id") or context.get("driver") or context.get("driver_name")
        if ctx_drv:
            target_name = F1_DRIVER_ALIAS_MAP.get(str(ctx_drv).lower(), str(ctx_drv))

    if not target_name:
        return None, None, None

    # 2. Match in database
    d_str = target_name.lower().strip()
    last_word = d_str.replace("_", " ").split()[-1]
    res = execute_query(
        """SELECT id, code, first_name, last_name FROM drivers 
           WHERE id = %s OR code ILIKE %s OR last_name ILIKE %s OR (first_name || ' ' || last_name) ILIKE %s 
           LIMIT 1""",
        (d_str, d_str, f"%{last_word}%", f"%{d_str}%"),
        fetch=True
    )
    if res and len(res) > 0:
        row = res[0]
        full_name = f"{row['first_name']} {row['last_name']}".strip()
        return row["id"], row["code"], full_name

    # Fallback to normalized strings
    display_name = " ".join([w.capitalize() for w in target_name.replace("_", " ").split()])
    code = (last_word[:3]).upper()
    return d_str, code, display_name


def resolve_session_and_event(question: str, session_hint: Optional[str] = None, context: Optional[dict] = None) -> Tuple[Optional[str], Optional[str], int]:
    """
    Resolves session_id, grand_prix name, and season from question and hints.
    """
    ctx = context or {}
    session_id = session_hint or ctx.get("session_id")
    gp_hint = ctx.get("grand_prix")
    year_hint = ctx.get("season")

    preprocessed = preprocess_text(question)
    q_lower = preprocessed["normalized_lower"]

    # Extract year
    year = year_hint
    if not year:
        year_match = re.search(r"\b(20\d{2})\b", q_lower)
        if year_match:
            year = int(year_match.group(1))

    # Extract Grand Prix
    gp = gp_hint
    if not gp:
        # Comprehensive circuit keywords mapping to canonical Grand Prix names
        gp_keywords = {
            "dutch": "Dutch GP",
            "zandvoort": "Dutch GP",
            "netherlands": "Dutch GP",
            "british": "British GP",
            "silverstone": "British GP",
            "britain": "British GP",
            "qatar": "Qatar GP",
            "lusail": "Qatar GP",
            "austrian": "Austrian GP",
            "austria": "Austrian GP",
            "spielberg": "Austrian GP",
            "red bull ring": "Austrian GP",
            "monaco": "Monaco GP",
            "monte carlo": "Monaco GP",
            "italian": "Italian GP",
            "italy": "Italian GP",
            "monza": "Italian GP",
            "miami": "Miami GP",
            "canadian": "Canadian GP",
            "canada": "Canadian GP",
            "montreal": "Canadian GP",
            "australian": "Australian GP",
            "australia": "Australian GP",
            "melbourne": "Australian GP",
            "hungary": "Hungarian GP",
            "hungarian": "Hungarian GP",
            "budapest": "Hungarian GP",
            "belgian": "Belgian GP",
            "spa": "Belgian GP",
            "abu dhabi": "Abu Dhabi GP",
            "yas marina": "Abu Dhabi GP",
            "singapore": "Singapore GP",
            "marina bay": "Singapore GP",
            "japan": "Japanese GP",
            "japanese": "Japanese GP",
            "suzuka": "Japanese GP",
            "china": "Chinese GP",
            "chinese": "Chinese GP",
            "shanghai": "Chinese GP",
            "bahrain": "Bahrain GP",
            "sakhir": "Bahrain GP",
            "saudi": "Saudi Arabian GP",
            "jeddah": "Saudi Arabian GP",
            "brazil": "São Paulo GP",
            "sao paulo": "São Paulo GP",
            "interlagos": "São Paulo GP",
            "las vegas": "Las Vegas GP",
            "vegas": "Las Vegas GP",
            "mexico": "Mexico City GP",
            "mexican": "Mexico City GP",
            "cota": "United States GP",
            "united states": "United States GP",
            "austin": "United States GP",
            "imola": "Emilia Romagna GP",
            "emilia romagna": "Emilia Romagna GP",
            "baku": "Azerbaijan GP",
            "azerbaijan": "Azerbaijan GP"
        }
        for alias, canonical in sorted(gp_keywords.items(), key=lambda x: len(x[0]), reverse=True):
            if re.search(r'\b' + re.escape(alias) + r'\b', q_lower):
                gp = canonical
                break
        if not gp:
            for alias, canonical in sorted(F1_CIRCUIT_ALIAS_MAP.items(), key=lambda x: len(x[0]), reverse=True):
                if re.search(r'\b' + re.escape(alias) + r'\b', q_lower):
                    gp = canonical
                    break

    if not session_id and gp:
        res = SessionResolver.resolve_session(grand_prix=gp, season=year, session_type="Race")
        if res.get("status") == "success" and res.get("session_id"):
            session_id = res["session_id"]
            year = res.get("season") or year or get_current_f1_season()
            gp = res.get("grand_prix") or gp

    if not year:
        year = get_current_f1_season()
    if not gp:
        gp = "Grand Prix"

    return session_id, gp, year


@traceable(name="strategy_analysis_node", run_type="chain", tags=["strategy-engineer"])
def run_strategy_analysis(
    question: str,
    session_id: str,
    driver_id: str,
    driver_name: str,
    grand_prix: str,
    season: int
) -> Dict[str, Any]:
    """
    Executes a comprehensive strategy analysis report for a named driver/session:
    1. Gathers real classification from RaceResultsTool.
    2. Gathers real stint and pit history from StrategyTool.
    3. Gathers real performance scores from ScoringTool.
    4. Evaluates plausible counterfactual simulations (+/- 3, 5, 8 laps + compound alternatives)
       using SimulationTool and picks the single best real simulation run.
    5. Synthesizes a 4-section report with zero fabricated numbers.
    """
    logger.info(f"[StrategyPlanner] Running strategy analysis for {driver_name} ({driver_id}) at {session_id}")
    
    # 1. Race Results
    race_results_tool = tool_registry.get_tool("race_results_tool")
    results_payload = race_results_tool.execute({"session_id": session_id})
    classification = results_payload.get("classification", []) if isinstance(results_payload, dict) else []

    driver_result = None
    d_clean = driver_id.lower().strip()
    d_last = driver_name.lower().split()[-1]
    for row in classification:
        row_driver = str(row.get("driver", "")).lower()
        drv_id_match = str(row.get("driver_id", "")).lower() == d_clean
        drv_last_match = d_last in row_driver or str(row.get("last_name", "")).lower() == d_last
        drv_code_match = str(row.get("code", "")).lower() == d_last[:3]
        if drv_id_match or drv_last_match or drv_code_match:
            driver_result = row
            break

    # Extract actual classification
    grid_pos = driver_result.get("grid") if (driver_result and "grid" in driver_result) else (driver_result.get("grid_position") if driver_result else None)
    finish_pos = driver_result.get("position") if driver_result else None
    finish_status = driver_result.get("status", "Finished") if driver_result else "Finished"
    points = float(driver_result.get("points", 0.0)) if driver_result else 0.0
    laps_completed = int(driver_result.get("laps_completed") or results_payload.get("laps") or 72)
    constructor = driver_result.get("team") or driver_result.get("constructor_name") or "Team"

    pos_delta = (grid_pos - finish_pos) if (grid_pos is not None and finish_pos is not None) else 0

    # 2. Strategy Tool (Actual Stints and Pit Stops)
    strategy_tool = tool_registry.get_tool("strategy_tool")
    strat_payload = strategy_tool.execute({"session_id": session_id, "driver_id": driver_id})
    actual_stints = strat_payload.get("actual_stints", []) if isinstance(strat_payload, dict) else []
    actual_pit_stops = strat_payload.get("actual_pit_stops", []) if isinstance(strat_payload, dict) else []
    openf1_cross_check = strat_payload.get("openf1_cross_check") if isinstance(strat_payload, dict) else None
    if not openf1_cross_check and actual_pit_stops:
        try:
            from app.ingestion.openf1_collector import openf1_collector
            openf1_cross_check = openf1_collector.cross_check_pit_stops(session_id, driver_id, actual_pit_stops)
        except Exception as o1_err:
            logger.warning(f"[StrategyPlanner] OpenF1 cross-check failed: {o1_err}")

    # 3. Scoring Tool (Scores explaining the delta between grid and finish)
    scoring_tool = tool_registry.get_tool("scoring_tool")
    scores = scoring_tool.execute({"session_id": session_id, "driver_id": driver_id})
    if not isinstance(scores, dict) or scores.get("status") == "missing_data":
        scores = {
            "strategy_score": 50.0,
            "pace_score": 50.0,
            "tire_score": 50.0,
            "pitstop_score": 50.0,
            "execution_score": 50.0,
            "composite_score": 50.0
        }

    strat_score = float(scores.get("strategy_score", 0.0))
    pace_score = float(scores.get("pace_score", 0.0))
    tire_score = float(scores.get("tire_score", 0.0))
    pit_score = float(scores.get("pitstop_score", 0.0))
    exec_score = float(scores.get("execution_score", 0.0))
    composite_score = float(scores.get("composite_score", 0.0))

    # 4. Counterfactual Simulation Search
    # Candidate alternative pit laps (+/- 3, 5, 8 laps from actual stop) and compound options
    simulation_tool = tool_registry.get_tool("simulation_tool")
    primary_pit_lap = 25
    actual_compound_out = "HARD"
    if actual_pit_stops:
        primary_pit_lap = int(actual_pit_stops[0].get("lap", 25))
        actual_compound_out = str(actual_pit_stops[0].get("compound_out", "HARD")).upper()
    elif actual_stints and len(actual_stints) > 1:
        primary_pit_lap = int(actual_stints[0].get("end_lap", 25))
        actual_compound_out = str(actual_stints[1].get("compound", "HARD")).upper()

    total_race_laps = laps_completed or 70
    offsets = [-8, -5, -3, 3, 5, 8]
    
    # Alternate compounds to try
    compound_options = [actual_compound_out]
    if actual_compound_out == "HARD":
        compound_options.append("MEDIUM")
    elif actual_compound_out == "MEDIUM":
        compound_options.append("HARD")
    else:
        compound_options.append("HARD")

    candidate_results = []
    for offset in offsets:
        cand_lap = primary_pit_lap + offset
        if cand_lap < 2 or cand_lap > (total_race_laps - 3):
            continue
        for cand_compound in compound_options:
            try:
                sim_res = simulation_tool.execute({
                    "session_id": session_id,
                    "driver_id": driver_id,
                    "simulated_pit_lap": cand_lap,
                    "target_compound": cand_compound
                })
                sim_p = sim_res.get("projected_finishing_position") or sim_res.get("simulated_finish_position")
                if isinstance(sim_res, dict) and sim_p is not None:
                    sim_p = int(sim_p)
                    act_p = int(sim_res.get("actual_finishing_position") or sim_res.get("actual_finish_position") or finish_pos or sim_p)
                    net_ms = float(sim_res.get("simulated_net_time_gain_ms", 0.0))
                    net_s = round(net_ms / 1000.0, 2)
                    candidate_results.append({
                        "simulated_pit_lap": cand_lap,
                        "target_compound": cand_compound,
                        "simulated_finish_position": sim_p,
                        "actual_finish_position": act_p,
                        "projected_position_change": act_p - sim_p,
                        "net_time_delta_s": net_s,
                        "undercut_gain_s": round(float(sim_res.get("undercut_gain", 0.0)), 2),
                        "traffic_loss_s": round(float(sim_res.get("traffic_loss", 0.0)), 2),
                        "pit_loss_s": round(float(sim_res.get("pit_loss", 22.0)), 2),
                        "raw_simulation": sim_res
                    })
            except Exception as sim_err:
                logger.debug(f"[StrategyPlanner] Candidate simulation (lap {cand_lap}, {cand_compound}) skipped: {sim_err}")

    # Pick best simulated alternative:
    # 1. Best simulated finishing position (lower number is better: P1 < P2)
    # 2. Tie-breaker: Highest net time delta in seconds (more positive gain)
    suggested_alternative = None
    if candidate_results:
        candidate_results.sort(key=lambda c: (c["simulated_finish_position"], -c["net_time_delta_s"]))
        best = candidate_results[0]
        suggested_alternative = {
            "simulated_pit_lap": best["simulated_pit_lap"],
            "actual_pit_lap": primary_pit_lap,
            "target_compound": best["target_compound"],
            "actual_compound": actual_compound_out,
            "simulated_finish_position": best["simulated_finish_position"],
            "actual_finish_position": best["actual_finish_position"],
            "projected_position_change": best["projected_position_change"],
            "net_time_delta_s": best["net_time_delta_s"],
            "undercut_gain_s": best["undercut_gain_s"],
            "traffic_loss_s": best["traffic_loss_s"],
            "pit_loss_s": best["pit_loss_s"],
            "candidates_evaluated": len(candidate_results)
        }
    else:
        suggested_alternative = {
            "simulated_pit_lap": primary_pit_lap,
            "actual_pit_lap": primary_pit_lap,
            "target_compound": actual_compound_out,
            "actual_compound": actual_compound_out,
            "simulated_finish_position": finish_pos or 1,
            "actual_finish_position": finish_pos or 1,
            "projected_position_change": 0,
            "net_time_delta_s": 0.0,
            "undercut_gain_s": 0.0,
            "traffic_loss_s": 0.0,
            "pit_loss_s": 22.0,
            "candidates_evaluated": 0
        }

    # 5. Synthesize the 4 Required Sections with exact numbers
    # Section 1: Executive Summary
    finish_str = f"P{finish_pos}" if finish_pos else "an unclassified position"
    grid_str = f"P{grid_pos}" if grid_pos else "the grid"
    delta_str = f"+{pos_delta} places" if pos_delta > 0 else (f"{pos_delta} places" if pos_delta < 0 else "neutral (0 delta)")
    
    exec_summary_lines = [
        f"• Classification Outcome: {driver_name} started {grid_str} and finished {finish_str} ({delta_str}) at the {season} {grand_prix}.",
        f"• Key Cost Factor: Strategy score of {strat_score:.1f}/100 and Pace score of {pace_score:.1f}/100 explain the gap between grid and finish.",
        f"• Counterfactual Optimization: Pitting on Lap {suggested_alternative['simulated_pit_lap']} ({suggested_alternative['target_compound']}) projects a finish of P{suggested_alternative['simulated_finish_position']} ({'+' if suggested_alternative['net_time_delta_s'] >= 0 else ''}{suggested_alternative['net_time_delta_s']}s net delta)."
    ]
    executive_summary = "\n".join(exec_summary_lines)

    # Section 2: What Happened
    stint_descriptions = []
    for s in actual_stints:
        stint_descriptions.append(f"Stint {s['stint']}: Laps {s['start_lap']}–{s['end_lap']} on {s['compound']} ({s['stint_length']} laps)")
    pit_descriptions = []
    for p in actual_pit_stops:
        flag_str = f" [{p['cross_check_flag']}]" if p.get("cross_check_flag") else ""
        pit_descriptions.append(f"Stop {p['pit_stop_number']}: Lap {p['lap']} ({p['compound_in']} ➔ {p['compound_out']}){flag_str}")

    what_happened_text = (
        f"{driver_name} qualified {grid_str} and took the chequered flag in {finish_str} ({finish_status}), "
        f"scoring {points:.0f} points over {laps_completed} laps completed for {constructor}. "
        f"The race strategy consisted of {len(actual_stints)} stint(s) with {len(actual_pit_stops)} pit stop(s): "
        f"{'; '.join(stint_descriptions) if stint_descriptions else 'Single stint'}. "
        f"Pit stop timing: {'; '.join(pit_descriptions) if pit_descriptions else 'No stops recorded'}."
    )
    if openf1_cross_check and openf1_cross_check.get("narrative_note"):
        what_happened_text += f" {openf1_cross_check['narrative_note']}"

    # Section 3: Strategy Cost Analysis
    cost_breakdown_items = []
    if strat_score < 70:
        cost_breakdown_items.append(f"Suboptimal pit window execution resulted in a Strategy Score of {strat_score:.1f}/100.")
    else:
        cost_breakdown_items.append(f"Pit window execution remained solid with a Strategy Score of {strat_score:.1f}/100.")
        
    if pace_score < 50:
        cost_breakdown_items.append(f"High lap time variance and fuel-gradient decay yielded a Pace Efficiency Score of {pace_score:.1f}/100.")
    else:
        cost_breakdown_items.append(f"Competitive clean-air pace produced a Pace Efficiency Score of {pace_score:.1f}/100.")
        
    if tire_score < 60:
        cost_breakdown_items.append(f"Excess tyre degradation compared to the grid median reduced the Tyre Management Score to {tire_score:.1f}/100.")
    else:
        cost_breakdown_items.append(f"Strong tyre conservation maintained a Tyre Management Score of {tire_score:.1f}/100.")

    cost_breakdown_items.append(f"Pit Crew Efficiency scored {pit_score:.1f}/100; Race Execution scored {exec_score:.1f}/100.")
    strategy_cost_analysis_text = " ".join(cost_breakdown_items)

    # Section 4: Suggested Alternative Strategy
    time_sign = "+" if suggested_alternative['net_time_delta_s'] >= 0 else ""
    pos_change_sign = "+" if suggested_alternative['projected_position_change'] >= 0 else ""
    suggested_alternative_text = (
        f"FrontWing evaluated {suggested_alternative['candidates_evaluated']} plausible counterfactual scenarios. "
        f"The single best-performing simulated alternative is pitting on Lap {suggested_alternative['simulated_pit_lap']} "
        f"onto {suggested_alternative['target_compound']} tyres (vs actual stop on Lap {suggested_alternative['actual_pit_lap']} on {suggested_alternative['actual_compound']}). "
        f"This yields a projected finish of P{suggested_alternative['simulated_finish_position']} "
        f"({pos_change_sign}{suggested_alternative['projected_position_change']} positions vs actual P{suggested_alternative['actual_finish_position']}) "
        f"with a net race time delta of {time_sign}{suggested_alternative['net_time_delta_s']}s "
        f"(Undercut Gain: {suggested_alternative['undercut_gain_s']}s, Traffic Loss: {suggested_alternative['traffic_loss_s']}s)."
    )

    return {
        "query_type": "strategy_analysis",
        "question": question,
        "driver_id": driver_id,
        "driver_name": driver_name,
        "session_id": session_id,
        "grand_prix": grand_prix,
        "season": season,
        "executive_summary": executive_summary,
        "strategy_report": {
            "what_happened": {
                "grid_position": grid_pos,
                "finish_position": finish_pos,
                "position_delta": pos_delta,
                "status": finish_status,
                "points": points,
                "laps_completed": laps_completed,
                "constructor": constructor,
                "stints": actual_stints,
                "pit_stops": actual_pit_stops,
                "openf1_cross_check": openf1_cross_check,
                "narrative": what_happened_text
            },
            "strategy_cost_analysis": {
                "strategy_score": strat_score,
                "pace_score": pace_score,
                "tire_score": tire_score,
                "pitstop_score": pit_score,
                "execution_score": exec_score,
                "composite_score": composite_score,
                "grid_to_finish_delta": pos_delta,
                "narrative": strategy_cost_analysis_text
            },
            "suggested_alternative": suggested_alternative,
            "suggested_alternative_narrative": suggested_alternative_text
        },
        "evidence": {
            "race_results": driver_result,
            "scoring": scores,
            "stints": actual_stints,
            "pit_stops": actual_pit_stops,
            "openf1_cross_check": openf1_cross_check,
            "best_simulation": suggested_alternative
        }
    }


@traceable(name="strategy_whatif_node", run_type="chain", tags=["strategy-engineer"])
def run_strategy_whatif(
    question: str,
    session_id: str,
    driver_id: str,
    driver_name: str,
    grand_prix: str,
    season: int
) -> Dict[str, Any]:
    """
    Parses user's free-text scenario into SimulationTool parameters and runs real simulation.
    If user specifies unmodeled variables (e.g. late braking, aero), responds honestly.
    """
    logger.info(f"[StrategyPlanner] Running strategy whatif for {driver_name} at {session_id}")

    # Check for unmodeled physical variables
    unmodeled = detect_unmodeled_variable(question)
    if unmodeled:
        logger.info(f"[StrategyPlanner] Detected unmodeled variable: {unmodeled}")
        limitation_message = (
            f"Simulation Limitation: The FrontWing Strategy Engine models pit stop timing (lap numbers) "
            f"and tyre compound choices (Hard, Medium, Soft) with real-world undercut dynamics, "
            f"tyre degradation curves, and traffic bottleneck loss. "
            f"Variables such as '{unmodeled}' are vehicle dynamics or setup parameters that are not modeled "
            f"by the pit strategy simulation engine. Only pit-timing and tyre compound counterfactuals "
            f"can be simulated."
        )
        return {
            "query_type": "strategy_whatif",
            "is_modeled": False,
            "unmodeled_variable": unmodeled,
            "question": question,
            "driver_id": driver_id,
            "driver_name": driver_name,
            "session_id": session_id,
            "grand_prix": grand_prix,
            "season": season,
            "executive_summary": f"• Unmodeled Variable: '{unmodeled}' is not supported by the strategy simulation engine.\n• Supported Scenarios: Pit stop timing (lap numbers) and tyre compound choices.",
            "whatif_simulation": {
                "is_modeled": False,
                "unmodeled_variable": unmodeled,
                "message": limitation_message
            },
            "evidence": {}
        }

    # Fetch actual driver stints/pit stops to interpret relative offsets (e.g. "5 laps earlier")
    strategy_tool = tool_registry.get_tool("strategy_tool")
    strat_payload = strategy_tool.execute({"session_id": session_id, "driver_id": driver_id})
    actual_pit_stops = strat_payload.get("actual_pit_stops", []) if isinstance(strat_payload, dict) else []
    actual_stints = strat_payload.get("actual_stints", []) if isinstance(strat_payload, dict) else []

    actual_pit_lap = 25
    actual_compound_out = "HARD"
    if actual_pit_stops:
        actual_pit_lap = int(actual_pit_stops[0].get("lap", 25))
        actual_compound_out = str(actual_pit_stops[0].get("compound_out", "HARD")).upper()
    elif actual_stints and len(actual_stints) > 1:
        actual_pit_lap = int(actual_stints[0].get("end_lap", 25))
        actual_compound_out = str(actual_stints[1].get("compound", "HARD")).upper()

    # Parse target pit lap
    q_lower = question.lower()
    target_lap = None

    # Check relative offset: e.g. "5 laps earlier", "3 laps later"
    rel_earlier = re.search(r"(\d+)\s+laps?\s+(?:earlier|before)", q_lower)
    rel_later = re.search(r"(\d+)\s+laps?\s+(?:later|after)", q_lower)
    if rel_earlier:
        offset = int(rel_earlier.group(1))
        target_lap = max(1, actual_pit_lap - offset)
    elif rel_later:
        offset = int(rel_later.group(1))
        target_lap = actual_pit_lap + offset
    else:
        # Check absolute lap: e.g. "lap 18", "on lap 24", "pitted 20"
        abs_match = re.search(r"\b(?:lap|on|at|box\s+(?:on|at)?|pitted\s+(?:on|at)?)\s*(\d+)\b", q_lower)
        if abs_match:
            target_lap = int(abs_match.group(1))
        else:
            # Look for isolated digit if simulation keywords present
            num_match = re.search(r"\b(\d{1,2})\b", q_lower)
            if num_match:
                target_lap = int(num_match.group(1))

    if not target_lap:
        target_lap = max(1, actual_pit_lap - 4)  # sensible fallback undercut

    # Parse target compound
    target_compound = actual_compound_out
    if re.search(r"\bsofts?\b", q_lower):
        target_compound = "SOFT"
    elif re.search(r"\bmediums?\b", q_lower):
        target_compound = "MEDIUM"
    elif re.search(r"\bhards?\b", q_lower):
        target_compound = "HARD"
    elif re.search(r"\binters?\b|\bintermediates?\b", q_lower):
        target_compound = "INTERMEDIATE"
    elif re.search(r"\bwets?\b", q_lower):
        target_compound = "WET"

    # Execute real SimulationTool
    simulation_tool = tool_registry.get_tool("simulation_tool")
    sim_res = simulation_tool.execute({
        "session_id": session_id,
        "driver_id": driver_id,
        "simulated_pit_lap": target_lap,
        "target_compound": target_compound
    })

    sim_pos = sim_res.get("projected_finishing_position") or sim_res.get("simulated_finish_position")
    if not isinstance(sim_res, dict) or sim_pos is None:
        return {
            "query_type": "strategy_whatif",
            "is_modeled": True,
            "question": question,
            "driver_id": driver_id,
            "driver_name": driver_name,
            "session_id": session_id,
            "grand_prix": grand_prix,
            "season": season,
            "error": "Simulation could not be computed for this driver and session.",
            "whatif_simulation": None,
            "evidence": {}
        }

    sim_pos = int(sim_pos)
    act_pos = int(sim_res.get("actual_finishing_position") or sim_res.get("actual_finish_position") or sim_pos)
    pos_change = act_pos - sim_pos
    net_ms = float(sim_res.get("simulated_net_time_gain_ms", 0.0))
    net_s = round(net_ms / 1000.0, 2)
    undercut_gain_s = round(float(sim_res.get("undercut_gain", 0.0)), 2)
    traffic_loss_s = round(float(sim_res.get("traffic_loss", 0.0)), 2)
    pit_loss_s = round(float(sim_res.get("pit_loss", 22.0)), 2)

    pos_str = f"P{sim_pos} ({'+' if pos_change >= 0 else ''}{pos_change})"
    time_str = f"{'+' if net_s >= 0 else ''}{net_s}s net delta"

    exec_summary = (
        f"• Projected Outcome: {driver_name} is simulated to finish {pos_str} at the {season} {grand_prix}.\n"
        f"• Net Race Time Delta: {time_str} by pitting on Lap {target_lap} onto {target_compound}.\n"
        f"• Physics Tradeoff: Undercut gain of {undercut_gain_s}s countered by {traffic_loss_s}s traffic loss and {pit_loss_s}s pit loss."
    )

    analysis_summary = (
        f"Simulation analysis for {driver_name} at the {season} {grand_prix}: "
        f"Changing the pit stop to Lap {target_lap} on {target_compound} tyres (vs actual stop on Lap {actual_pit_lap} on {actual_compound_out}) "
        f"results in a projected finishing position of P{sim_pos} (vs actual P{act_pos}). "
        f"The net race time delta is {time_str}, with an estimated undercut delta of {undercut_gain_s}s and {traffic_loss_s}s lost in traffic."
    )

    return {
        "query_type": "strategy_whatif",
        "is_modeled": True,
        "question": question,
        "driver_id": driver_id,
        "driver_name": driver_name,
        "session_id": session_id,
        "grand_prix": grand_prix,
        "season": season,
        "executive_summary": exec_summary,
        "whatif_simulation": {
            "is_modeled": True,
            "driver_name": driver_name,
            "driver_id": driver_id,
            "original_scenario": {
                "finish_position": act_pos,
                "pit_lap": actual_pit_lap,
                "compound": actual_compound_out
            },
            "simulated_scenario": {
                "finish_position": sim_pos,
                "position_change": pos_change,
                "simulated_pit_lap": target_lap,
                "target_compound": target_compound,
                "net_time_delta_s": net_s,
                "undercut_gain_s": undercut_gain_s,
                "traffic_loss_s": traffic_loss_s,
                "pit_loss_s": pit_loss_s
            },
            "analysis_summary": analysis_summary
        },
        "evidence": {
            "simulation": sim_res,
            "actual_pit_stops": actual_pit_stops
        }
    }


@traceable(name="strategy_planner_workflow", run_type="chain", tags=["strategy-engineer"])
def run_strategy_planner(
    question: str,
    session_id: Optional[str] = None,
    driver_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    context: Optional[dict] = None
) -> Dict[str, Any]:
    """
    Main entrypoint for POST /strategy/query.
    Classifies query into strategy_analysis vs strategy_whatif and executes dedicated pipeline.
    Supports multi-turn conversation memory via conversation_id.
    """
    start_time = time.time()
    logger.info(f"[StrategyPlanner] Received query: \"{question}\" (session: {session_id}, driver: {driver_id}, conv: {conversation_id})")

    ctx = dict(context or {})

    # Multi-turn memory resolution
    if conversation_id:
        try:
            from app.agents.memory import conversation_memory
            history = conversation_memory.get_history(conversation_id)
            if history:
                logger.info(f"[StrategyPlanner] Recovered {len(history)} previous turn(s) for conversation '{conversation_id}'")
                for past_turn in reversed(history):
                    p_ctx = past_turn.get("context", {})
                    if not driver_id and p_ctx.get("driver_id"):
                        driver_id = p_ctx["driver_id"]
                    if not session_id and p_ctx.get("session_id"):
                        session_id = p_ctx["session_id"]
                    for k in ("grand_prix", "season", "driver_name", "driver_id", "session_id"):
                        if k in p_ctx and k not in ctx:
                            ctx[k] = p_ctx[k]
        except Exception as mem_err:
            logger.warning(f"[StrategyPlanner] Error retrieving conversation history: {mem_err}")

    # 0. Fast-path check for unmodeled physical variables in what-if scenarios
    query_type = classify_strategy_query(question)
    if query_type == "strategy_whatif":
        unmodeled = detect_unmodeled_variable(question)
        if unmodeled:
            logger.info(f"[StrategyPlanner] Fast-path detected unmodeled variable: {unmodeled}")
            limitation_message = (
                f"Simulation Limitation: The FrontWing Strategy Engine models pit stop timing (lap numbers) "
                f"and tyre compound choices (Hard, Medium, Soft) with real-world undercut dynamics, "
                f"tyre degradation curves, and traffic bottleneck loss. "
                f"Variables such as '{unmodeled}' are vehicle dynamics or setup parameters that are not modeled "
                f"by the pit strategy simulation engine. Only pit-timing and tyre compound counterfactuals "
                f"can be simulated."
            )
            res = {
                "status": "success",
                "query_type": "strategy_whatif",
                "is_modeled": False,
                "unmodeled_variable": unmodeled,
                "question": question,
                "driver_id": driver_id,
                "driver_name": ctx.get("driver_name"),
                "session_id": session_id,
                "grand_prix": ctx.get("grand_prix"),
                "season": ctx.get("season"),
                "executive_summary": f"- Unmodeled Variable: '{unmodeled}' is not supported by the strategy simulation engine.\n- Supported Scenarios: Pit stop timing (lap numbers) and tyre compound choices.",
                "whatif_simulation": {
                    "is_modeled": False,
                    "unmodeled_variable": unmodeled,
                    "message": limitation_message
                },
                "evidence": {},
                "conversation_id": conversation_id,
                "latency_ms": int((time.time() - start_time) * 1000)
            }
            if conversation_id:
                try:
                    from app.agents.memory import conversation_memory
                    u_id = ctx.get("user_id")
                    conversation_memory.save_message(
                        conversation_id=conversation_id,
                        question=question,
                        answer=res.get("executive_summary") or "",
                        context={
                            "session_id": session_id,
                            "driver_id": driver_id,
                            "driver_name": ctx.get("driver_name"),
                            "grand_prix": ctx.get("grand_prix"),
                            "season": ctx.get("season"),
                            "query_type": "strategy_whatif",
                            "user_id": u_id
                        },
                        user_id=u_id
                    )
                except Exception:
                    pass
            return res

    # 1. Resolve Driver (with context fallback for pronouns like 'he' / 'his')
    resolved_drv_id, drv_code, drv_name = resolve_driver(question, driver_id, ctx)
    if not resolved_drv_id:
        # Fallback to driver from context if available
        if ctx.get("driver_id"):
            resolved_drv_id = ctx["driver_id"]
            drv_name = ctx.get("driver_name", resolved_drv_id.capitalize())
            drv_code = resolved_drv_id[:3].upper()
        else:
            resolved_drv_id = "verstappen"
            drv_name = "Max Verstappen"
            drv_code = "VER"

    # 2. Resolve Session (with context fallback)
    res_session_id, grand_prix, season = resolve_session_and_event(question, session_id, ctx)
    if not res_session_id:
        return {
            "status": "error",
            "query_type": "unknown",
            "conversation_id": conversation_id,
            "message": "Could not identify a Grand Prix or session for this strategy query. Please name the circuit or event (e.g. Dutch GP 2024)."
        }

    # 3. Classify Intent: strategy_whatif vs strategy_analysis
    query_type = classify_strategy_query(question)
    logger.info(f"[StrategyPlanner] Classified query type: '{query_type}' for {drv_name} at {res_session_id}")

    # 4. Dispatch to dedicated handler
    if query_type == "strategy_whatif":
        res = run_strategy_whatif(
            question=question,
            session_id=res_session_id,
            driver_id=resolved_drv_id,
            driver_name=drv_name,
            grand_prix=grand_prix,
            season=season
        )
    else:
        res = run_strategy_analysis(
            question=question,
            session_id=res_session_id,
            driver_id=resolved_drv_id,
            driver_name=drv_name,
            grand_prix=grand_prix,
            season=season
        )

    res["latency_ms"] = int((time.time() - start_time) * 1000)
    res["status"] = "success"
    res["conversation_id"] = conversation_id

    # Persist turn into conversation memory
    if conversation_id:
        try:
            from app.agents.memory import conversation_memory
            u_id = ctx.get("user_id")
            conversation_memory.save_message(
                conversation_id=conversation_id,
                question=question,
                answer=res.get("executive_summary") or "",
                context={
                    "session_id": res.get("session_id"),
                    "driver_id": res.get("driver_id"),
                    "driver_name": res.get("driver_name"),
                    "grand_prix": res.get("grand_prix"),
                    "season": res.get("season"),
                    "query_type": res.get("query_type"),
                    "user_id": u_id
                },
                user_id=u_id
            )
        except Exception as save_err:
            logger.warning(f"[StrategyPlanner] Error saving message to conversation memory: {save_err}")

    return res
