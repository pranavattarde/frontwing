import time
import os
import sys
import json
import requests

AI_URL = "http://127.0.0.1:8000/engineer/query"

def print_header(title):
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)

def test_fix1_fast_ingestion_without_telemetry():
    print_header("TEST FIX 1: Fresh GP Ingestion Without Telemetry (Target: < 36s)")
    
    # Query a GP not yet in DB (e.g., 2024 Saudi Arabian GP or Bahrain GP)
    queries = [
        {"question": "Who won the 2024 Saudi Arabian Grand Prix?"},
        {"question": "What was the race result of the 2024 Bahrain Grand Prix?"},
        {"question": "Who finished on the podium at 2024 Azerbaijan GP?"}
    ]
    
    for item in queries:
        q = item["question"]
        print(f"\n---> Testing Fresh Query: \"{q}\"")
        t0 = time.time()
        res = requests.post(AI_URL, json={"question": q}, timeout=60)
        elapsed = time.time() - t0
        
        assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}: {res.text}"
        data = res.json()
        
        print(f"Status Code: {res.status_code}")
        print(f"Total Elapsed Time: {elapsed:.2f}s (Target: < 36s)")
        print(f"Tools Used: {data.get('tools_used')}")
        print(f"Final Answer: {data.get('final_answer')}")
        
        assert elapsed < 36.0, f"Query took too long: {elapsed:.2f}s >= 36.0s"
        assert "telemetry_tool" not in data.get("tools_used", []), "telemetry_tool should NOT have run!"
        assert data.get("final_answer"), "Expected valid answer"
        print(f"[PASS] FIX 1 verified in {elapsed:.2f}s")

def test_fix2_auto_backfill_telemetry():
    print_header("TEST FIX 2: Auto-Backfill Telemetry for Session with 0 Telemetry Rows")
    
    # Target sessions known to have telem_cnt=0 in DB (e.g. 2024 Dutch GP, 2024 Belgian GP, 2024 Italian GP)
    queries = [
        {"question": "Compare telemetry between Norris and Verstappen at 2024 Dutch GP", "session_id": "2024_dutch_gp_race"},
        {"question": "Show telemetry comparison for Hamilton and Russell at 2024 Belgian GP", "session_id": "2024_belgian_gp_race"},
        {"question": "Compare telemetry of Leclerc and Piastri at 2024 Italian GP", "session_id": "2024_italian_gp_race"}
    ]
    
    for item in queries:
        q = item["question"]
        sid = item.get("session_id")
        print(f"\n---> Testing Telemetry Backfill Query: \"{q}\" (session: {sid})")
        t0 = time.time()
        res = requests.post(AI_URL, json={"question": q, "session_id": sid}, timeout=90)
        elapsed = time.time() - t0
        
        assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}: {res.text}"
        data = res.json()
        
        telem_data = (data.get("evidence") or {}).get("telemetry_tool") or {}
        telem_pts = telem_data.get("telemetry") or []
        comp_pts = telem_data.get("comparative_telemetry") or []
        
        print(f"Status: {telem_data.get('status')}")
        print(f"Driver A ({telem_data.get('driver_id')}): {len(telem_pts)} telemetry points (Lap {telem_data.get('lap_number')})")
        print(f"Driver B ({telem_data.get('comparative_driver_id')}): {len(comp_pts)} comparative telemetry points")
        print(f"Delta: {telem_data.get('delta_lap_time_s')}s")
        print(f"Elapsed Time: {elapsed:.2f}s")
        
        assert telem_data.get("status") == "success", f"Telemetry tool status is not success: {telem_data.get('status')}"
        assert len(telem_pts) > 0, "Expected non-empty telemetry points for Driver A"
        print(f"[PASS] FIX 2 auto-backfill verified for {sid}")

def test_fix3_and_fix4_context_retention_and_non_podium_drivers():
    print_header("TEST FIX 3 & FIX 4: Follow-Up Context Retention with Non-Podium Drivers")
    
    # 3 unique non-podium / midfield driver pairs
    investigations = [
        {
            "parent_question": "How did Tsunoda and Gasly perform at Monaco GP 2024?",
            "parent_context": {"drivers": ["tsunoda", "gasly"], "grand_prix": "Monaco GP", "season": 2024, "session_id": "2024_monaco_gp_race"},
            "follow_up": "Compare lap timings and delta analysis"
        },
        {
            "parent_question": "Compare race results of Alonso and Stroll at 2024 Spanish GP",
            "parent_context": {"drivers": ["alonso", "stroll"], "grand_prix": "Spanish GP", "season": 2024, "session_id": "2024_spanish_gp_race"},
            "follow_up": "Analyze tire pace decay comparisons"
        },
        {
            "parent_question": "Who finished ahead between Albon and Hulkenberg at 2024 British GP?",
            "parent_context": {"drivers": ["albon", "hulkenberg"], "grand_prix": "British GP", "season": 2024, "session_id": "2024_british_gp_race"},
            "follow_up": "Compare lap timings and delta analysis"
        }
    ]
    
    for inv in investigations:
        parent_q = inv["parent_question"]
        print(f"\n---> Turn 1 (Parent Query): \"{parent_q}\"")
        res1 = requests.post(AI_URL, json={"question": parent_q}, timeout=60)
        assert res1.status_code == 200, f"Parent query failed: {res1.text}"
        data1 = res1.json()
        
        # Verify FIX 4: Response drivers should be the queried drivers, NOT incidental podium drivers
        queried_drivers = [d.lower() for d in data1.get("drivers", [])]
        print(f"Turn 1 Returned Drivers: {queried_drivers}")
        print(f"Turn 1 Final Answer: {data1.get('final_answer')}")
        
        expected_subset = [d.lower() for d in inv["parent_context"]["drivers"]]
        for ed in expected_subset:
            assert ed in queried_drivers or any(ed in qd for qd in queried_drivers), (
                f"FIX 4 Error: Expected driver '{ed}' in returned drivers {queried_drivers}, but it was missing!"
            )
        print(f"[PASS] FIX 4: Correct queried drivers captured ({queried_drivers})")
        
        # Turn 2: Follow-up query passing parent context (simulating frontend chip click)
        follow_q = inv["follow_up"]
        ctx_payload = {
            "session_id": data1.get("intelligence_trace", {}).get("resolved_session_id") or inv["parent_context"]["session_id"],
            "drivers": data1.get("drivers") or inv["parent_context"]["drivers"],
            "driver_id": (data1.get("drivers") or inv["parent_context"]["drivers"])[0],
            "grand_prix": data1.get("grand_prix") or inv["parent_context"]["grand_prix"],
            "season": data1.get("season") or inv["parent_context"]["season"]
        }
        
        print(f"\n---> Turn 2 (Follow-up Chip Query): \"{follow_q}\"")
        print(f"Passed Context: {ctx_payload}")
        
        res2 = requests.post(AI_URL, json={
            "question": follow_q,
            "session_id": ctx_payload["session_id"],
            "drivers": ctx_payload["drivers"],
            "driver_id": ctx_payload["driver_id"],
            "grand_prix": ctx_payload["grand_prix"],
            "season": ctx_payload["season"],
            "context": ctx_payload
        }, timeout=60)
        
        assert res2.status_code == 200, f"Follow-up query failed: {res2.text}"
        data2 = res2.json()
        
        print(f"Turn 2 Tools Used: {data2.get('tools_used')}")
        print(f"Turn 2 Final Answer: {data2.get('final_answer')}")
        
        assert not data2.get("needs_clarification"), "Follow-up failed with needs_clarification!"
        assert data2.get("final_answer") != "Which drivers would you like me to compare?", (
            "FIX 3 Error: Follow-up asked for clarification instead of reusing context drivers!"
        )
        print(f"[PASS] FIX 3: Follow-up correctly inherited context without asking for clarification.")

if __name__ == "__main__":
    try:
        test_fix1_fast_ingestion_without_telemetry()
        test_fix2_auto_backfill_telemetry()
        test_fix3_and_fix4_context_retention_and_non_podium_drivers()
        print("\n" + "=" * 80)
        print("  ALL 4 FIXES VERIFIED SUCCESSFULLY ACROSS ALL INVENTED TEST CASES!")
        print("=" * 80)
    except Exception as e:
        print(f"\n[FAIL] Verification error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
