import requests
import json

FASTAPI_URL = "http://localhost:8000"

def test_three_query_types_for_fix_p():
    queries = [
        ("Race Result", "who won the 2024 dutch gp"),
        ("Telemetry Comparison", "compare verstappen and norris at dutch gp"),
        ("Strategy Simulation", "what if piastri pitted on lap 18 at qatar 2024")
    ]
    
    print("\n========================================================")
    print("FIX P VERIFICATION: AI_VERDICT BOX EXECUTIVE SUMMARY")
    print("========================================================")
    
    for q_type, q_text in queries:
        print(f"\n--- Query Type: {q_type} (\"{q_text}\") ---")
        resp = requests.post(f"{FASTAPI_URL}/engineer/query", json={"question": q_text})
        data = resp.json()
        report = data.get("investigation_report", {})
        exec_summary = report.get("Executive Summary") or data.get("final_answer", "")
        
        print(f"Executive Summary (for Verdict Card):\n{exec_summary}")
        lines = [l.strip() for l in exec_summary.split("\n") if l.strip()]
        print(f"Total lines: {len(lines)}")
        has_table = "|" in exec_summary
        print(f"Contains Markdown Table: {has_table} (MUST BE False)")
        assert not has_table, f"Markdown table found in Executive Summary for {q_type}!"
        assert len(lines) <= 4, f"Executive summary is too long ({len(lines)} lines) for {q_type}!"

def test_fix_q_tyre_table_columns():
    print("\n========================================================")
    print("FIX Q VERIFICATION: TYRE TABLE DEGRADATION % & LIFE %")
    print("========================================================")
    
    resp = requests.post(f"{FASTAPI_URL}/engineer/query", json={"question": "give verstappen's lap timing telemetry at dutch gp 2024"})
    data = resp.json()
    deg_list = data.get("evidence", {}).get("telemetry_tool", {}).get("tyre_degradation", [])
    print(f"Total tyre degradation points: {len(deg_list)}")
    
    clean_laps = [d for d in deg_list if d.get("wear_pct") is not None]
    print(f"Total clean laps: {len(clean_laps)}")
    
    # Print sample of 5 clean laps
    print("\nSample clean laps (showing DEGRADATION % and LIFE % = 100 - wear):")
    for d in clean_laps[:5]:
        deg = d["wear_pct"]
        life = round(100.0 - deg, 1)
        print(f"  Lap {d['lap']} (Stint {d['stint']}): DEGRADATION = {deg}%, LIFE = {life}% (Sum = {round(deg + life, 1)}%)")
        assert round(deg + life, 1) == 100.0, f"Sum != 100 on lap {d['lap']}"
        
    # Check non-representative laps (IN-LAP, OUT-LAP, START-LAP)
    special_laps = [d for d in deg_list if d.get("note") in ("START-LAP", "IN-LAP", "OUT-LAP")]
    print(f"\nNon-representative laps (must have wear_pct = None -> rendered as '—'):")
    for d in special_laps:
        print(f"  Lap {d['lap']} (Stint {d['stint']}): [{d.get('note')}] wear_pct = {d.get('wear_pct')}")
        assert d.get("wear_pct") is None

if __name__ == "__main__":
    test_three_query_types_for_fix_p()
    test_fix_q_tyre_table_columns()
