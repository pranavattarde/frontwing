import sys
import os
import json
import dotenv

dotenv.load_dotenv('ai_services/.env')
sys.path.insert(0, 'ai_services')
from app.agents.planner import plan_node, execute_node, synthesize_node

def run_test():
    target_queries = [
        "Compare Verstappen and Norris telemetry at Silverstone.",
        "Compare the lap times of Verstappen and Norris at Silverstone.",
        "Compare their sector times at Silverstone.",
        "Where did Verstappen gain time on Norris?",
        "Compare the speed of Verstappen and Norris at Silverstone."
    ]

    print("======================================================================")
    print("         FRONTWING DAY 2 TELEMETRY FEATURE TEST MATRIX                 ")
    print("======================================================================\n")

    for idx, q in enumerate(target_queries, 1):
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
        print(f"Tools Used: {tools}")
        print(f"Session ID: {session_id}")
        print(f"Driver A: {drv_a} ({pts_a} telemetry pts), Driver B: {drv_b} ({pts_b} telemetry pts)")
        print(f"Delta Lap Time: {telem.get('delta_lap_time_s')}s")
        print(f"Sector Times: {telem.get('sector_times')}")
        print(f"Final Answer:\n{answer}\n")

    print("======================================================================")
    print("         DAY 1 BASIC MVP REGRESSION CHECK                             ")
    print("======================================================================\n")

    mvp_queries = [
        ("Who won Monaco?", "Charles Leclerc"),
        ("Who won Monaco in 2026?", "Charles Leclerc"),
        ("Who was third in Chinese GP?", "Lewis Hamilton"),
        ("Tell me the podium from British GP.", "Lewis Hamilton")
    ]

    for q, expected in mvp_queries:
        state = {'question': q}
        p = plan_node(state)
        state.update(p)
        e = execute_node(state)
        state.update(e)
        s = synthesize_node(state)
        state.update(s)
        ans = state.get("final_answer", "")
        passed = expected.lower() in ans.lower()
        print(f"Query: '{q}'\nAnswer: '{ans}'\nPASS: {passed}\n")

if __name__ == "__main__":
    run_test()
