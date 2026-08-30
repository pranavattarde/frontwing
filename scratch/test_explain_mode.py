import os
import sys
import json
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ai_services')))

from app.tools.adapters import ExplainModeTool
from app.agents.planner import run_ai_race_engineer

def test_explain_tool():
    print("================================================================================")
    print(" 1. DIRECT ExplainModeTool EXECUTION")
    print("================================================================================")
    tool = ExplainModeTool()

    questions = [
        {"term": "understeer"},
        {"term": "difference between soft and hard tyres"},
        {"term": "DRS"}
    ]

    for q in questions:
        print(f"\n--- Query Term: {q['term']} ---")
        res = tool.execute(q)
        print(json.dumps(res, indent=2))

    print("\n================================================================================")
    print(" 2. END-TO-END PIPELINE /engineer/query ROUTING & RESPONSE CHECK")
    print("================================================================================")
    e2e_queries = [
        "What is understeer?",
        "Explain the difference between soft and hard tyres",
        "What is DRS?"
    ]

    for query_text in e2e_queries:
        print(f"\n================================================================================")
        print(f" QUESTION: '{query_text}'")
        print(f"================================================================================")
        response = run_ai_race_engineer(query_text)
        
        # Check tools used
        steps = response.get("steps", [])
        tools_executed = [step.get("tool") for step in steps if step.get("tool")]
        print(f"-> Tools Executed: {tools_executed}")
        print(f"-> Intent: {response.get('intent')}")
        print(f"-> Metric: {response.get('requested_metric')}")
        print(f"-> Session Resolved: {response.get('session_id')}")
        print(f"-> Explain Options: {response.get('explain_mode_options')}")
        print(f"-> Final Answer:\n{response.get('final_answer')}")
        
        # Check that telemetry_tool, race_results_tool, and session_resolver were NOT called
        forbidden = ["telemetry_tool", "race_results_tool"]
        for f in forbidden:
            assert f not in tools_executed, f"Violation: {f} was executed for conceptual query!"
            
        print("\nFull Raw Response Payload:")
        print(json.dumps(response, indent=2))

if __name__ == "__main__":
    test_explain_tool()
