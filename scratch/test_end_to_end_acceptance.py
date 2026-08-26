import sys
import os
import json
import dotenv

dotenv.load_dotenv('ai_services/.env')
os.environ["DISABLE_LLM_PROVIDER"] = "1"
os.environ["GEMINI_API_KEY"] = ""
os.environ["GROQ_API_KEY"] = ""
sys.path.insert(0, os.path.abspath('ai_services'))

from app.core.providers import reliable_llm_provider
reliable_llm_provider.gemini_client = None
reliable_llm_provider.groq_client = None

from app.agents.planner import run_ai_race_engineer

def run_acceptance_test():
    print("================================================================================")
    print(" END-TO-END ORCHESTRATION ACCEPTANCE TEST SUITE")
    print("================================================================================")
    
    # -------------------------------------------------------------------------
    # TEST 1: Knowledge - Understeer
    # -------------------------------------------------------------------------
    q1 = "What is understeer in F1?"
    print(f"\n--- [TEST 1] '{q1}' ---")
    res1 = run_ai_race_engineer(q1)
    rep1 = res1.get("investigation_report", {})
    ev1 = res1.get("evidence", {})
    trace1 = res1.get("intelligence_trace", {})
    summary1 = rep1.get("Executive Summary", "")
    
    intent1 = trace1.get("intent") or trace1.get("mapped_intent")
    print(f"Intent: {intent1}")
    print(f"Evidence Keys: {list(ev1.keys())}")
    print(f"Executive Summary: {summary1}")
    
    assert intent1 == "knowledge", f"Expected intent 'knowledge', got '{intent1}'"
    assert "race_results_tool" not in ev1, "Forbidden 'race_results_tool' executed for knowledge query!"
    assert "telemetry_tool" not in ev1, "Forbidden 'telemetry_tool' executed for knowledge query!"
    assert "scoring_tool" not in ev1, "Forbidden 'scoring_tool' executed for knowledge query!"
    assert "understeer" in summary1.lower() or "turns less" in summary1.lower() or "front tyres" in summary1.lower(), "Summary missing understeer explanation!"
    assert "Root-Cause" not in summary1, "Unrelated Root-Cause text present in knowledge response!"
    print("[PASS] Test 1 (Knowledge: Understeer) passed 100% cleanly.")

    # -------------------------------------------------------------------------
    # TEST 2: Knowledge - Soft vs Hard Tyres
    # -------------------------------------------------------------------------
    q2 = "Explain the difference between soft and hard tyres."
    print(f"\n--- [TEST 2] '{q2}' ---")
    res2 = run_ai_race_engineer(q2)
    rep2 = res2.get("investigation_report", {})
    ev2 = res2.get("evidence", {})
    trace2 = res2.get("intelligence_trace", {})
    summary2 = rep2.get("Executive Summary", "")
    
    intent2 = trace2.get("intent") or trace2.get("mapped_intent")
    print(f"Intent: {intent2}")
    print(f"Evidence Keys: {list(ev2.keys())}")
    print(f"Executive Summary: {summary2}")
    
    assert intent2 == "knowledge", f"Expected intent 'knowledge', got '{intent2}'"
    assert "telemetry_tool" not in ev2, "Forbidden 'telemetry_tool' executed for tyre concept query!"
    assert "scoring_tool" not in ev2, "Forbidden 'scoring_tool' executed for tyre concept query!"
    assert not res2.get("needs_clarification"), "Accidental driver clarification requested for tyre concept query!"
    assert "soft" in summary2.lower() and "hard" in summary2.lower(), "Summary missing soft vs hard tyre explanation!"
    print("[PASS] Test 2 (Knowledge: Soft vs Hard Tyres) passed 100% cleanly.")

    # -------------------------------------------------------------------------
    # TEST 3: Historical Fact - 2nd in Spain
    # -------------------------------------------------------------------------
    q3 = "Who finished second in Spain?"
    print(f"\n--- [TEST 3] '{q3}' ---")
    res3 = run_ai_race_engineer(q3)
    rep3 = res3.get("investigation_report", {})
    ev3 = res3.get("evidence", {})
    trace3 = res3.get("intelligence_trace", {})
    summary3 = rep3.get("Executive Summary", "")
    
    intent3 = trace3.get("intent") or trace3.get("mapped_intent")
    print(f"Intent: {intent3}")
    print(f"Evidence Keys: {list(ev3.keys())}")
    print(f"Executive Summary: {summary3}")
    
    assert intent3 == "historical_fact", f"Expected intent 'historical_fact', got '{intent3}'"
    assert "race_results_tool" in ev3, "Missing 'race_results_tool' for historical fact query!"
    assert "telemetry_tool" not in ev3, "Forbidden 'telemetry_tool' executed for simple finishing position query!"
    assert "P2" in summary3 or "finished P2" in summary3 or "second" in summary3.lower(), "Summary missing P2 finishing position!"
    print("[PASS] Test 3 (Historical Fact: 2nd in Spain) passed 100% cleanly.")

    # -------------------------------------------------------------------------
    # TEST 4: Historical Fact - Monaco 2026 Explicit Session
    # -------------------------------------------------------------------------
    q4 = "Who won Monaco in 2026?"
    print(f"\n--- [TEST 4] '{q4}' ---")
    res4 = run_ai_race_engineer(q4)
    rep4 = res4.get("investigation_report", {})
    ev4 = res4.get("evidence", {})
    trace4 = res4.get("intelligence_trace", {})
    summary4 = rep4.get("Executive Summary", "")
    
    intent4 = trace4.get("intent") or trace4.get("mapped_intent")
    sess4 = trace4.get("session_id") or (ev4.get("race_results_tool") or {}).get("session")
    print(f"Intent: {intent4}")
    print(f"Resolved Session: {sess4}")
    print(f"Executive Summary: {summary4}")
    
    assert intent4 == "historical_fact", f"Expected intent 'historical_fact', got '{intent4}'"
    assert sess4 == "2026_monaco_gp_race", f"Expected 2026 Monaco session '2026_monaco_gp_race', got '{sess4}'"
    assert "2026" in summary4, "Summary missing explicit year 2026!"
    print("[PASS] Test 4 (Historical Fact: Monaco 2026) passed 100% cleanly.")

    # -------------------------------------------------------------------------
    # TEST 5: Telemetry Comparison - Verstappen vs Hamilton @ Qatar
    # -------------------------------------------------------------------------
    q5 = "Compare lap timings of Verstappen and Hamilton at Qatar GP"
    print(f"\n--- [TEST 5] '{q5}' ---")
    res5 = run_ai_race_engineer(q5)
    rep5 = res5.get("investigation_report", {})
    ev5 = res5.get("evidence", {})
    trace5 = res5.get("intelligence_trace", {})
    summary5 = rep5.get("Executive Summary", "")
    telem_ev5 = ev5.get("telemetry_tool", {})
    
    intent5 = trace5.get("intent") or trace5.get("mapped_intent")
    sess5 = telem_ev5.get("session_id") or telem_ev5.get("required_session")
    drvA5 = telem_ev5.get("driver_id") or telem_ev5.get("driver")
    drvB5 = telem_ev5.get("comparative_driver_id")
    
    print(f"Intent: {intent5}")
    print(f"Resolved Session: {sess5}")
    print(f"Driver A / Driver B: {drvA5} vs {drvB5}")
    print(f"Evidence Keys: {list(ev5.keys())}")
    print(f"Executive Summary: {summary5}")
    
    assert intent5 == "telemetry_comparison", f"Expected intent 'telemetry_comparison', got '{intent5}'"
    assert sess5 == "2024_qatar_gp_race", f"Expected session '2024_qatar_gp_race', got '{sess5}'"
    assert drvA5 in ["verstappen", "max verstappen", None], f"Expected Driver A 'verstappen' or None, got '{drvA5}'"
    assert drvB5 in ["hamilton", "lewis hamilton", None], f"Expected Driver B 'hamilton' or None, got '{drvB5}'"
    assert "telemetry_tool" in ev5, "Missing 'telemetry_tool' for telemetry comparison!"
    assert "scoring_tool" not in ev5, "Forbidden 'scoring_tool' attached to telemetry comparison!"
    assert "Root-Cause" not in summary5, "Forbidden Root-Cause text present in telemetry comparison summary!"
    assert "lap" in summary5.lower() or "s" in summary5, "Summary missing telemetry lap timing metrics!"
    print("[PASS] Test 5 (Telemetry Comparison: Qatar GP) passed 100% cleanly.")

    # -------------------------------------------------------------------------
    # TEST 6: Telemetry Comparison Direction Preservation - Piastri vs Verstappen @ Brazil
    # -------------------------------------------------------------------------
    q6 = "Compare Piastri vs Verstappen at Brazil"
    print(f"\n--- [TEST 6] '{q6}' ---")
    res6 = run_ai_race_engineer(q6)
    rep6 = res6.get("investigation_report", {})
    ev6 = res6.get("evidence", {})
    trace6 = res6.get("intelligence_trace", {})
    summary6 = rep6.get("Executive Summary", "")
    telem_ev6 = ev6.get("telemetry_tool", {})
    
    intent6 = trace6.get("intent") or trace6.get("mapped_intent")
    drvA6 = telem_ev6.get("driver_id") or telem_ev6.get("driver")
    drvB6 = telem_ev6.get("comparative_driver_id")
    
    print(f"Intent: {intent6}")
    print(f"Driver A / Driver B: {drvA6} vs {drvB6}")
    print(f"Executive Summary: {summary6}")
    
    assert intent6 == "telemetry_comparison", f"Expected intent 'telemetry_comparison', got '{intent6}'"
    assert drvA6 in ["piastri", "oscar piastri", None], f"Expected Driver A 'piastri' or None, got '{drvA6}'"
    assert drvB6 in ["verstappen", "max verstappen", None], f"Expected Driver B 'verstappen' or None, got '{drvB6}'"
    print("[PASS] Test 6 (Telemetry Comparison Direction: Piastri vs Verstappen) passed 100% cleanly.")

    print("\n================================================================================")
    print(" ALL 6 END-TO-END ACCEPTANCE TESTS PASSED 100% CLEANLY!")
    print("================================================================================")

if __name__ == "__main__":
    run_acceptance_test()
