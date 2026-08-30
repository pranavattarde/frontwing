import sys
import os
sys.path.insert(0, os.path.abspath("."))
from app.agents.planner import run_ai_race_engineer

def run_test():
    print("--- FIX 1 Verification: Test 1 ('explain drs') ---")
    res1 = run_ai_race_engineer(question="explain drs")
    print(f"Question: {res1.get('question')}")
    print(f"Tools Used: {res1.get('tools_used')}")
    print(f"Evidence Keys: {list(res1.get('evidence', {}).keys())}")
    print(f"Execution Graph: {res1.get('intelligence_trace', {}).get('execution_graph', [])}")
    print(f"Final Answer: {res1.get('final_answer')}")
    
    assert len(res1.get("tools_used", [])) > 0, "Expected tools to be executed!"
    assert len(res1.get("evidence", {})) > 0, "Expected evidence to be populated!"
    
    print("\n--- FIX 1 Verification: Test 2 ('Compare lap timings and delta analysis' with driver context) ---")
    res2 = run_ai_race_engineer(
        question="Compare lap timings and delta analysis for Verstappen and Norris at Qatar GP",
        session_id="2024_qatar_gp_race"
    )
    print(f"Question: {res2.get('question')}")
    print(f"Tools Used: {res2.get('tools_used')}")
    print(f"Evidence Keys: {list(res2.get('evidence', {}).keys())}")
    print(f"Final Answer Preview: {res2.get('final_answer')[:200]}...")
    
    assert len(res2.get("tools_used", [])) > 0, "Expected tools to be executed!"
    assert len(res2.get("evidence", {})) > 0, "Expected evidence to be populated!"
    print("\n[SUCCESS] FIX 1 verified!")

if __name__ == "__main__":
    run_test()
