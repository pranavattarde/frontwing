import urllib.request
import json

def run_query(query_text):
    url = "http://localhost:5000/engineer/query"
    payload = {"question": query_text}
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            return json.loads(res_body)
    except Exception as e:
        return {"error": str(e)}

def test_telemetry_queries():
    print("======================================================================")
    print("            FRONTWING DAY 2 TELEMETRY FEATURE TEST                    ")
    print("======================================================================\n")
    
    target_queries = [
        "Compare Verstappen and Norris telemetry at Silverstone.",
        "Compare the lap times of Verstappen and Norris at Silverstone.",
        "Compare their sector times at Silverstone.",
        "Where did Verstappen gain time on Norris?",
        "Compare the speed of Verstappen and Norris at Silverstone."
    ]

    results = []

    for idx, q in enumerate(target_queries, 1):
        print(f"--- QUERY {idx}: '{q}' ---")
        res = run_query(q)
        if "error" in res:
            print(f"ERROR: {res['error']}\n")
            results.append({"query": q, "status": "FAIL", "reason": res['error']})
            continue
            
        contract = res.get("semantic_contract", {})
        intent = contract.get("intent")
        metric = contract.get("requested_metric")
        tools = res.get("tools_used", [])
        answer = res.get("final_answer", "")
        evidence = res.get("evidence", {})
        telem_tool_ev = evidence.get("telemetry_tool", {})
        
        drv_a = telem_tool_ev.get("driver_id")
        drv_b = telem_tool_ev.get("comparative_driver_id")
        session_id = telem_tool_ev.get("session_id") or "N/A"
        telem_pts_a = len(telem_tool_ev.get("telemetry", []))
        telem_pts_b = len(telem_tool_ev.get("comparative_telemetry", []))
        
        print(f"Contract Intent/Metric: {intent} / {metric}")
        print(f"Selected Tools: {tools}")
        print(f"Session: {session_id}")
        print(f"Driver A: {drv_a} ({telem_pts_a} pts), Driver B: {drv_b} ({telem_pts_b} pts)")
        print(f"Final Answer: {answer}")
        
        is_telemetry_based = (
            "telemetry_tool" in tools and
            telem_tool_ev.get("status") == "success" and
            drv_a is not None and
            drv_b is not None and
            ("lap" in answer.lower() or "sector" in answer.lower() or "s1" in answer.lower() or "delta" in answer.lower() or "time" in answer.lower())
        )
        
        status = "PASS" if is_telemetry_based else ("CONTROLLED DATA UNAVAILABLE" if telem_tool_ev.get("status") == "missing_data" else "FAIL")
        print(f"STATUS: {status}")
        print("----------------------------------------------------------------------\n")
        results.append({
            "query": q,
            "contract": f"{intent}/{metric}",
            "session": session_id,
            "driver_a": drv_a,
            "driver_b": drv_b,
            "tools": tools,
            "evidence": telem_tool_ev,
            "answer": answer,
            "status": status
        })

    print("======================================================================")
    print("            DAY 1 BASIC MVP REGRESSION CHECK                          ")
    print("======================================================================\n")
    
    mvp_queries = [
        ("Who won Monaco?", "Charles Leclerc"),
        ("Who won Monaco in 2026?", "Charles Leclerc"),
        ("Who was third in Chinese GP?", "Lewis Hamilton"),
        ("Tell me the podium from British GP.", "Lewis Hamilton")
    ]
    
    for q, expected in mvp_queries:
        res = run_query(q)
        answer = res.get("final_answer", "")
        passed = expected.lower() in answer.lower()
        print(f"Query: '{q}' -> Result: '{answer}' [PASS: {passed}]")

if __name__ == "__main__":
    test_telemetry_queries()
