import os
import sys
sys.path.insert(0, os.path.abspath("."))
import time
from app.agents.planner import run_ai_race_engineer

def verify_fix3_and_fix4():
    print("================================================================")
    print("=== TESTING FIX 3: Follow-Up Context Retention ===")
    print("================================================================")
    
    # Simulate parent investigation
    parent_q = "Compare Verstappen and Norris at Qatar GP"
    print(f"\n[1] Running Parent Investigation: '{parent_q}'")
    parent_res = run_ai_race_engineer(parent_q)
    print(f"Parent Session ID: {parent_res.get('intelligence_trace', {}).get('resolved_session_id', '2024_qatar_gp_race')}")
    print(f"Parent Tools Used: {parent_res.get('tools_used', [])}")
    
    # Simulate clicking follow-up chip: "Compare lap timings and delta analysis"
    followup_q = "Compare lap timings and delta analysis"
    context = {
        "session_id": "2024_qatar_gp_race",
        "drivers": ["Max Verstappen", "Lando Norris"],
        "grand_prix": "Qatar GP",
        "season": 2024
    }
    print(f"\n[2] Running Follow-Up Chip Query with Inherited Context: '{followup_q}'")
    print(f"Passed Context: {context}")
    followup_res = run_ai_race_engineer(followup_q, session_id=context["session_id"], context=context)
    
    print(f"Follow-Up Final Answer: {followup_res.get('final_answer')}")
    print(f"Follow-Up Tools Used: {followup_res.get('tools_used')}")
    print(f"Follow-Up Needs Clarification: {followup_res.get('needs_clarification', False)}")
    
    # Assertions for FIX 3
    assert not followup_res.get("needs_clarification", False), "Follow-up should NOT need clarification when context is passed!"
    assert "telemetry_tool" in followup_res.get("tools_used", []), "Follow-up query should execute telemetry_tool!"
    assert "verstappen" in followup_res.get("final_answer", "").lower() or "norris" in followup_res.get("final_answer", "").lower(), "Final answer must reference resolved context drivers!"
    print("\n[SUCCESS] FIX 3 Verified: Follow-up chip retained session and driver context perfectly!")

    print("\n================================================================")
    print("=== TESTING FIX 4: Knowledge Intent Tool Reconciliation ===")
    print("================================================================")
    
    concept_questions = [
        "Explain how ground effect venturi tunnels generate aerodynamic downforce",
        "What is the difference between thermal tire degradation and mechanical graining?",
        "Explain the function and regulation of the F1 technical directive on plank wear and skid blocks"
    ]
    
    for i, q in enumerate(concept_questions, 1):
        print(f"\n[{i}] Testing Conceptual Question: '{q}'")
        res = run_ai_race_engineer(q)
        answer = res.get("final_answer", "")
        tools = res.get("tools_used", [])
        
        print(f"Tools Used: {tools}")
        print(f"Answer Preview: {answer[:180]}...")
        
        # Assertions for FIX 4
        assert "explain_mode_tool" in tools or "knowledge_tool" in tools, f"Knowledge query must use explain_mode_tool, got {tools}"
        assert not any(t in tools for t in ["telemetry_tool", "scoring_tool", "simulation_tool"]), f"Data tools must NOT execute for knowledge query: {tools}"
        assert "no verified race data exists" not in answer.lower(), f"Knowledge query returned misleading race data error: {answer}"
        assert len(answer) > 50, "Answer should contain substantive explanation."
        print(f"[PASS] Question {i} correctly reconciled to explain mode!")

    print("\n================================================================")
    print("[ALL TESTS PASSED] FIX 3 and FIX 4 successfully verified!")
    print("================================================================")

if __name__ == "__main__":
    verify_fix3_and_fix4()
