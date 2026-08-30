import sys
import os
sys.path.insert(0, os.path.abspath("."))
import json
from app.agents.planner import run_ai_race_engineer

def test_fix1():
    print("=== Testing FIX 1: 'explain drs' ===")
    res1 = run_ai_race_engineer(question="explain drs")
    print(f"Question: {res1.get('question')}")
    print(f"Tools Used: {res1.get('tools_used')}")
    print(f"Evidence Keys: {list(res1.get('evidence', {}).keys())}")
    print(f"Confidence: {res1.get('confidence')}")
    print(f"Final Answer Preview: {res1.get('final_answer')[:150]}...")
    assert "explain_mode_tool" in res1.get("tools_used") or "knowledge_tool" in res1.get("tools_used"), "Tool should be used!"
    assert len(res1.get("evidence", {})) > 0, "Evidence must not be empty!"

    print("\n=== Testing FIX 1: 'Compare lap timings and delta analysis' with driver context ===")
    res2 = run_ai_race_engineer(
        question="Compare lap timings and delta analysis for Verstappen at Qatar GP",
        session_id="2024_qatar_gp_race",
        driver_id="verstappen"
    )
    print(f"Question: {res2.get('question')}")
    print(f"Tools Used: {res2.get('tools_used')}")
    print(f"Evidence Keys: {list(res2.get('evidence', {}).keys())}")
    print(f"Confidence: {res2.get('confidence')}")
    print(f"Final Answer Preview: {res2.get('final_answer')[:150]}...")
    assert len(res2.get("tools_used", [])) > 0, "Tools should be executed!"
    assert len(res2.get("evidence", {})) > 0, "Evidence should be populated!"
    print("\n[PASS] FIX 1 verified successfully!")

if __name__ == "__main__":
    test_fix1()
