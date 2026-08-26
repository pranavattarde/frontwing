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
from app.agents.planner import run_ai_race_engineer
from app.core.session_resolver import SessionResolver

def print_banner(title):
    print("\n" + "="*80)
    print(f" {title}")
    print("="*80)

# Matrix Cases (Requirement 8)
TEST_MATRIX = [
    {
        "name": "Verstappen vs Hamilton @ Qatar",
        "query": "compare lap timings of verstappen and hamilton at qatar gp",
        "expected_driver_a": "verstappen",
        "expected_driver_b": "hamilton",
        "gp_keyword": "qatar",
        "unexpected_circuit_keyword": "spielberg"
    },
    {
        "name": "Verstappen vs Hamilton @ Abu Dhabi",
        "query": "compare lap timings of verstappen and hamilton at abu dhabi gp",
        "expected_driver_a": "verstappen",
        "expected_driver_b": "hamilton",
        "gp_keyword": "abu dhabi",
        "unexpected_circuit_keyword": "spielberg"
    },
    {
        "name": "Norris vs Leclerc @ Monaco",
        "query": "compare lap timings of norris and leclerc at monaco gp",
        "expected_driver_a": "norris",
        "expected_driver_b": "leclerc",
        "gp_keyword": "monaco",
        "unexpected_circuit_keyword": "spielberg"
    },
    {
        "name": "Alonso vs Russell @ Spain",
        "query": "compare lap timings of alonso and russell at spanish gp",
        "expected_driver_a": "alonso",
        "expected_driver_b": "russell",
        "gp_keyword": "spanish",
        "unexpected_circuit_keyword": "spielberg"
    },
    {
        "name": "Piastri vs Verstappen @ Brazil",
        "query": "compare lap timings of piastri and verstappen at sao paulo gp",
        "expected_driver_a": "piastri",
        "expected_driver_b": "verstappen",
        "gp_keyword": "sâo paulo",
        "unexpected_circuit_keyword": "spielberg"
    }
]

def validate_telemetry_series(series_name, points, driver_code):
    """Validate EVERY point in telemetry series (Requirements 3 & 4)."""
    assert points is not None, f"Telemetry series {series_name} for {driver_code} is None!"
    assert len(points) > 0, f"Telemetry series {series_name} for {driver_code} is empty!"
    
    for idx, pt in enumerate(points):
        assert isinstance(pt, dict), f"Point {idx} in {series_name} is not a dict: {pt}"
        
        # Check brake channel (Requirement 3)
        brake_val = pt.get("brake")
        assert brake_val is not None, f"Point {idx} in {series_name} missing brake channel!"
        assert isinstance(brake_val, (int, float)), f"Point {idx} brake is type {type(brake_val)}, expected numeric (int/float)!"
        assert not isinstance(brake_val, bool), f"Point {idx} brake is boolean ({brake_val}), expected numeric!"
        assert math.isfinite(brake_val), f"Point {idx} brake value {brake_val} is not finite!"
        
        # Check other numeric metrics used by chart
        for metric_name in ["distanceM", "speed", "throttle", "gear"]:
            val = pt.get(metric_name)
            assert val is not None, f"Point {idx} in {series_name} missing {metric_name}!"
            assert isinstance(val, (int, float)), f"Point {idx} {metric_name} is type {type(val)}, expected numeric!"
            assert not isinstance(val, bool), f"Point {idx} {metric_name} is boolean!"
            assert math.isfinite(val), f"Point {idx} {metric_name} value {val} is not finite!"

def run_matrix_tests():
    print_banner("RUNNING GENERALIZED TELEMETRY MATRIX SUITE (5 CASES)")
    
    results_summary = []
    
    for case in TEST_MATRIX:
        print_banner(f"CASE: {case['name']}")
        q = case["query"]
        print(f"Executing Query: '{q}'")
        
        # 1. NLP Parser Contract Verification (Requirement 1)
        contract = parse_semantic_query(q)
        print(f"Contract Intent: {contract.get('intent')}")
        print(f"Contract Metric: {contract.get('requested_metric')}")
        print(f"Comparison Drivers: {contract.get('comparison_drivers')}")
        
        assert contract.get("intent") in ("comparison", "telemetry_comparison"), f"Unexpected intent: {contract.get('intent')}"
        assert len(contract.get("comparison_drivers", [])) >= 2, f"Expected 2 drivers, got: {contract.get('comparison_drivers')}"
        
        # 2. Execution Pipeline Run
        response = run_ai_race_engineer(q)
        inv_report = response.get("investigation_report", {})
        exec_summary = inv_report.get("Executive Summary", "")
        evidence = response.get("evidence", {})
        telem_data = evidence.get("telemetry_tool") or {}
        race_data = evidence.get("race_results_tool") or {}
        
        print(f"Executive Summary: {exec_summary}")
        
        # Strong Root-Cause Assertion (Requirement 1)
        assert "Root-Cause Investigation Analysis" not in exec_summary, "Executive Summary returned root-cause analysis header!"
        assert "primary performance bottleneck" not in exec_summary.lower(), "Executive Summary returned performance bottleneck analysis!"
        assert "insufficient to establish a specific root cause" not in exec_summary.lower(), "Executive Summary returned root-cause failure phrase!"
        
        # 3. Session & Circuit Validation (Requirement 2 & 9)
        sess_id = telem_data.get("session_id") or race_data.get("session_id")
        gp_name = telem_data.get("grand_prix") or race_data.get("grand_prix")
        circuit_name = telem_data.get("circuit_name") or telem_data.get("circuit")
        
        print(f"Resolved Session ID: {sess_id}")
        print(f"Resolved Grand Prix: {gp_name}")
        print(f"Resolved Circuit: {circuit_name}")
        
        assert sess_id is not None, "Session ID is None!"
        assert case["unexpected_circuit_keyword"] not in str(gp_name).lower(), f"GP name '{gp_name}' leaked unexpected circuit '{case['unexpected_circuit_keyword']}'!"
        if circuit_name:
            assert case["unexpected_circuit_keyword"] not in str(circuit_name).lower(), f"Circuit name '{circuit_name}' leaked unexpected circuit '{case['unexpected_circuit_keyword']}'!"
            
        # 4. Telemetry Series A & B Validation (Requirement 3 & 4)
        drv_a = telem_data.get("driver_id")
        drv_b = telem_data.get("comparative_driver_id")
        
        print(f"Driver A ID: {drv_a}")
        print(f"Driver B ID: {drv_b}")
        
        assert drv_a is not None, "Driver A ID is None in telemetry payload!"
        assert drv_b is not None, "Driver B ID is None in telemetry payload!"
        
        def norm_drv(d):
            d_l = str(d).lower().strip()
            return "alonso" if d_l == "fernando" else d_l
            
        actual_a = norm_drv(drv_a)
        actual_b = norm_drv(drv_b)
        exp_a = norm_drv(case["expected_driver_a"])
        exp_b = norm_drv(case["expected_driver_b"])
        
        assert actual_a == exp_a, f"Exact Driver A mismatch! Expected '{exp_a}', got '{actual_a}'"
        assert actual_b == exp_b, f"Exact Driver B mismatch! Expected '{exp_b}', got '{actual_b}'"



        
        series_a = telem_data.get("telemetry") or telem_data.get("speed_trace")
        series_b = telem_data.get("comparative_telemetry") or telem_data.get("comparative_speed_trace")
        
        # Must NOT silently skip (Requirement 3)
        validate_telemetry_series("Series A (Primary)", series_a, drv_a)
        validate_telemetry_series("Series B (Comparative)", series_b, drv_b)
        
        # 5. Lap-Time vs Sector Data (Requirement 5)
        sector_times = telem_data.get("sector_times")
        print(f"Sector Times Count: {len(sector_times) if sector_times else 0}")
        if sector_times:
            for s in sector_times:
                assert "sector" in s and "driver_time" in s and "benchmark_time" in s and "delta" in s
                assert isinstance(s["driver_time"], (int, float)) and math.isfinite(s["driver_time"])
                assert isinstance(s["benchmark_time"], (int, float)) and math.isfinite(s["benchmark_time"])
                assert isinstance(s["delta"], (int, float)) and math.isfinite(s["delta"])
        
        results_summary.append({
            "case": case["name"],
            "session_id": sess_id,
            "grand_prix": gp_name,
            "driver_a": drv_a,
            "driver_b": drv_b,
            "series_a_len": len(series_a),
            "series_b_len": len(series_b),
            "sectors_count": len(sector_times) if sector_times else 0,
            "status": "PASSED"
        })
        print(f"[PASS] Case '{case['name']}' validated cleanly.")

    print_banner("MATRIX TEST RESULTS SUMMARY")
    for r in results_summary:
        print(f" - {r['case']}: Session={r['session_id']} | Drivers={r['driver_a']} vs {r['driver_b']} | PtsA={r['series_a_len']} | PtsB={r['series_b_len']} | Status={r['status']}")

def test_alias_resolution():
    """Verify natural GP aliases (Requirement 9)."""
    print_banner("TESTING NATURAL GP ALIAS RESOLUTION (REQUIREMENT 9)")
    aliases = [
        ("Qatar", "Qatar GP"),
        ("Lusail", "Qatar GP"),
        ("Brazil", "Sâo Paulo GP"),
        ("Sao Paulo", "Sâo Paulo GP"),
        ("Interlagos", "Sâo Paulo GP"),
        ("Spain", "Spanish GP"),
        ("Barcelona", "Spanish GP"),
        ("Austria", "Austrian GP"),
        ("Spielberg", "Austrian GP"),
        ("Abu Dhabi", "Abu Dhabi GP"),
        ("Yas Marina", "Abu Dhabi GP")
    ]
    for alias_str, expected_gp in aliases:
        res = SessionResolver.resolve_session(grand_prix=alias_str, season=2024)
        print(f"Alias '{alias_str}' -> Resolved Session: {res.get('session_id')}, GP: {res.get('grand_prix')}")
        assert res.get("status") == "success" and res.get("session_id"), f"Failed to resolve alias '{alias_str}'!"

if __name__ == "__main__":
    run_matrix_tests()
    test_alias_resolution()
    print_banner("ALL HARDENED TELEMETRY PIPELINE MATRIX TESTS PASSED 100% CLEANLY!")
