import sys
import os
import json
import dotenv

dotenv.load_dotenv('ai_services/.env')
sys.path.insert(0, 'ai_services')
from app.agents.planner import plan_node, execute_node, synthesize_node

def test_all():
    print("======================================================================")
    print("            FRONTWING DAY 2 TELEMETRY FEATURE TEST                    ")
    print("======================================================================\n")

    queries = [
        "Compare Verstappen and Norris telemetry at Silverstone.",
        "Compare the lap times of Verstappen and Norris at Silverstone.",
        "Compare their sector times at Silverstone.",
        "Where did Verstappen gain time on Norris?",
        "Compare the speed of Verstappen and Norris at Silverstone."
    ]

    for idx, q in enumerate(queries, 1):
        print(f"--- QUERY {idx}: '{q}' ---")
        state = {'question': q}
        p = plan_node(state)
        state.update(p)
        e = execute_node(state)
        state.update(e)
        s = synthesize_node(state)
        state.update(s)

        contract = state.get("semantic_contract", {})
        intent = contract.get("intent")
        metric = contract.get("requested_metric")
        tools = state.get("tools_used", [])
        answer = state.get("final_answer", "")
        telem = state.get("evidence", {}).get("telemetry_tool", {})
        
        drv_a = telem.get("driver_id")
        drv_b = telem.get("comparative_driver_id")
        session_id = telem.get("session_id") or "N/A"
        pts_a = len(telem.get("telemetry", []))
        pts_b = len(telem.get("comparative_telemetry", []))

        print(f"Contract Intent/Metric: {intent} / {metric}")
        print(f"Selected Tools: {tools}")
        print(f"Session: {session_id}")
        print(f"Driver A: {drv_a} ({pts_a} pts), Driver B: {drv_b} ({pts_b} pts)")
        print(f"Delta Lap Time: {telem.get('delta_lap_time_s')}s")
        print(f"Sector Times: {telem.get('sector_times')}")
        print(f"Final Answer:\n{answer}")
        print("----------------------------------------------------------------------\n")

if __name__ == "__main__":
    test_all()
