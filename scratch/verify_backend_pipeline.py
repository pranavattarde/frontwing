import sys
import os
sys.path.insert(0, os.path.abspath('.'))
import logging
from typing import Dict, Any

# Mute noisy loggers for clean output
logging.getLogger("app.core.logger").setLevel(logging.WARNING)
logging.getLogger("app.agents.planner").setLevel(logging.WARNING)
logging.getLogger("fastf1").setLevel(logging.ERROR)

from app.core.session_resolver import SessionResolver
from app.core.entity_resolver import EntityResolver
from app.agents.planner import run_ai_race_engineer
from app.tools.adapters import RaceResultsTool

step4_queries = [
    "Who won Monaco GP?",
    "Who won British GP?",
    "Who won Hungarian GP?",
    "Who won Austrian GP?",
    "Who finished P3 in Monaco GP?"
]

step6_queries = [
    "Who won Spanish GP?",
    "Who won Belgian GP?",
    "Who won Miami GP?",
    "Who won Canadian GP?",
    "Who won Imola GP?"
]

def run_query_verification(query: str, query_idx: int):
    print(f"\n==================== QUERY #{query_idx} ====================")
    print(f"Question: {query}")
    
    # 1. Pipeline Execution
    res = run_ai_race_engineer(query)
    
    trace_info = res.get("intelligence_trace", {})
    entities = trace_info.get("entities", {})
    intent = trace_info.get("intent", "race_result")
    
    gp_name = entities.get("grand_prix", query)
    season = entities.get("season", 2024)
    
    resolved = SessionResolver.resolve_session(grand_prix=gp_name, season=season)
    
    resolved_gp = resolved.get("grand_prix")
    resolved_session = resolved.get("session_id")
    rows_found = resolved.get("rows_returned", 0)
    fastf1_downloaded = "YES" if resolved.get("fastf1_downloaded") else "NO"
    rows_inserted = rows_found if fastf1_downloaded == "YES" else 0
    
    evidence = res.get("evidence", {})
    tool_output = evidence.get("race_results_tool", {})
    synthesizer_output = res.get("final_answer", "")
    final_response = synthesizer_output

    print(f"Planner Intent: {intent}")
    print(f"Planner Entities: {entities}")
    print(f"Resolved GP: {resolved_gp}")
    print(f"Resolved Session: {resolved_session}")
    print(f"Database Rows Found: {rows_found}")
    print(f"FastF1 Download Triggered? {fastf1_downloaded}")
    print(f"Rows Inserted: {rows_inserted}")
    print(f"Race Result Tool Output: Winner: {tool_output.get('winner')}, Session: {tool_output.get('session')}")
    print(f"Synthesizer Output: {synthesizer_output}")
    print(f"Final Response: {final_response}")
    print("--------------------------------------------------")

if __name__ == "__main__":
    print("==================================================")
    print("FRONTWING BACKEND VERIFICATION SPRINT - 10 QUERIES")
    print("==================================================")
    
    all_queries = step4_queries + step6_queries
    for idx, q in enumerate(all_queries, 1):
        run_query_verification(q, idx)
