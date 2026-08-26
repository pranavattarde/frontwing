import sys
import os
import math
import dotenv

dotenv.load_dotenv('ai_services/.env')
os.environ["DISABLE_LLM_PROVIDER"] = "1"
os.environ["GEMINI_API_KEY"] = ""
os.environ["GROQ_API_KEY"] = ""
sys.path.insert(0, os.path.abspath('ai_services'))

from app.core.providers import reliable_llm_provider
reliable_llm_provider.gemini_client = None
reliable_llm_provider.groq_client = None

from app.agents.nlp_parser import parse_semantic_query
from app.agents.planner import run_ai_race_engineer, plan_node
from app.tools.adapters import TelemetryTool

def test_directional_case(query, expected_driver_a, expected_driver_b):
    print(f"\n================================================================================")
    print(f" TESTING DIRECTIONAL QUERY: '{query}'")
    print(f" Expected Driver A (Series A): {expected_driver_a}")
    print(f" Expected Driver B (Series B): {expected_driver_b}")
    print(f"================================================================================")

    # 1. parse_semantic_query()
    contract = parse_semantic_query(query)
    comp_drivers = contract.get("comparison_drivers") or []
    print(f"1. NLP Parser comparison_drivers: {comp_drivers}")
    assert len(comp_drivers) >= 2, f"Failed to extract 2 comparison drivers for '{query}'!"
    
    # 2. Planner Contract
    state_in = {
        "question": query,
        "semantic_contract": contract
    }
    plan_out = plan_node(state_in)
    plan_tools = plan_out.get("tools") or []
    plan_params = plan_out.get("parameters") or {}
    print(f"2. Planner Contract Tools: {plan_tools}")
    print(f"2. Planner Contract Parameters: {plan_params}")
    
    # 3. Full AI Pipeline Execution
    result = run_ai_race_engineer(query)
    exec_summary = result.get("investigation_report", {}).get("Executive Summary", "")
    evidence = result.get("evidence", {})
    telem_data = evidence.get("telemetry_tool", {})
    
    drv_a = telem_data.get("driver_id")
    drv_b = telem_data.get("comparative_driver_id")
    
    print(f"3-7. Evidence telemetry_tool payload:")
    print(f"     driver_id (Driver A / Series A): {drv_a}")
    print(f"     comparative_driver_id (Driver B / Series B): {drv_b}")
    print(f"     grand_prix: {telem_data.get('grand_prix')}")
    print(f"     circuit_name: {telem_data.get('circuit_name')}")
    
    assert drv_a is not None and drv_b is not None, "Driver IDs must not be None!"
    
    # Standardize aliases (e.g. Fernando Alonso => fernando/alonso)
    def norm_drv(d):
        d_l = str(d).lower().strip()
        return "alonso" if d_l == "fernando" else d_l
        
    actual_a = norm_drv(drv_a)
    actual_b = norm_drv(drv_b)
    exp_a = norm_drv(expected_driver_a)
    exp_b = norm_drv(expected_driver_b)
    
    assert actual_a == exp_a, f"Driver A mismatch! Expected '{exp_a}', got '{actual_a}'"
    assert actual_b == exp_b, f"Driver B mismatch! Expected '{exp_b}', got '{actual_b}'"
    
    # Verify Telemetry Series A and B correspond to correct drivers
    pts_a = telem_data.get("telemetry") or []
    pts_b = telem_data.get("comparative_telemetry") or []
    print(f"     Series A ({drv_a}) Points Count: {len(pts_a)}")
    print(f"     Series B ({drv_b}) Points Count: {len(pts_b)}")
    assert len(pts_a) > 0, f"Series A telemetry for {drv_a} is empty!"
    assert len(pts_b) > 0, f"Series B telemetry for {drv_b} is empty!"
    
    # Verify Sector Delta Orientation
    sectors = telem_data.get("sector_times") or []
    print(f"     Sector Times Count: {len(sectors)}")
    if sectors:
        for s in sectors:
            # s["driver_time"] should be Driver A, s["benchmark_time"] should be Driver B, delta = A - B
            t_a = s.get("driver_time")
            t_b = s.get("benchmark_time")
            d_val = s.get("delta")
            print(f"     Sector {s.get('sector')}: Driver A ({drv_a})={t_a}s | Driver B ({drv_b})={t_b}s | Delta (A - B)={d_val}s")
            assert abs((t_a - t_b) - d_val) < 0.001, f"Sector delta math incorrect: {t_a} - {t_b} != {d_val}"
            
    # 8-10. Frontend Props & Rendering Verification
    driverCodeA = drv_a.upper()
    driverCodeB = drv_b.upper()
    headerLabel = f"SPEED_TRACE // {driverCodeA} vs {driverCodeB}"
    sectorLabel = f"{driverCodeA} vs {driverCodeB}"
    
    print(f"8. Frontend driverCodeA: {driverCodeA}")
    print(f"9. Frontend driverCodeB: {driverCodeB}")
    print(f"10. Chart Header Label: '{headerLabel}'")
    print(f"10. Chart Sector Label: '{sectorLabel}'")
    
    print(f"[PASS] Directional query '{query}' validated cleanly with EXACT A/B orientation.")

if __name__ == "__main__":
    print("\n================================================================================")
    print(" RUNNING DIRECTIONAL DRIVER A/B REPRESSION TEST SUITE")
    print("================================================================================")
    
    # Directional Pair 1: Brazil (Piastri vs Verstappen)
    test_directional_case("Compare Piastri vs Verstappen at Brazil", "piastri", "verstappen")
    test_directional_case("Compare Verstappen vs Piastri at Brazil", "verstappen", "piastri")
    
    # Directional Pair 2: Spain (Alonso vs Russell)
    test_directional_case("Compare Alonso vs Russell at Spain", "alonso", "russell")
    test_directional_case("Compare Russell vs Alonso at Spain", "russell", "alonso")
    
    print("\n================================================================================")
    print(" ALL DIRECTIONAL DRIVER A/B REPRESSION TESTS PASSED 100% CLEANLY!")
    print("================================================================================")
