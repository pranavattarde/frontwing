import urllib.request
import json
import redis

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

test_queries = [
    "Compare Verstappen and Norris telemetry at Silverstone.",
    "Compare the lap times of Verstappen and Norris at Silverstone.",
    "Where did Verstappen gain time on Norris?",
    "Compare their sector times at Silverstone.",
    "Show the fastest lap comparison between Verstappen and Norris.",
    "Compare their speed through the lap.",
    "Why was Verstappen faster than Norris?"
]

print("======================================================================")
print("             FRONTWING READ-ONLY TELEMETRY AUDIT TRACE               ")
print("======================================================================\n")

for idx, q in enumerate(test_queries, 1):
    res = run_query(q)
    print(f"--- TEST QUERY {idx}: '{q}' ---")
    if "error" in res:
        print(f"ERROR: {res['error']}\n")
        continue
        
    answer = res.get("final_answer", "")
    report = res.get("investigation_report", {})
    tools = res.get("tools_used", [])
    confidence = res.get("confidence", 0)
    evidence = res.get("evidence", {})
    trace = res.get("intelligence_trace", {})
    
    # Extract session ID from evidence or report
    session_id = "N/A"
    for t_name, t_val in evidence.items():
        if isinstance(t_val, dict) and t_val.get("session_id"):
            session_id = t_val["session_id"]
            break
        elif isinstance(t_val, dict) and t_val.get("session"):
            session_id = t_val["session"]
            break
            
    print(f"Selected Tools: {tools}")
    print(f"Resolved Session: {session_id}")
    print(f"Confidence: {confidence}%")
    print(f"Final Answer: {answer}")
    print(f"Telemetry Findings in Report: {report.get('Telemetry Findings')}")
    print(f"Evidence Keys Returned: {list(evidence.keys())}")
    
    # Evaluate Telemetry Groundedness
    has_telemetry_evidence = "telemetry_tool" in evidence and evidence["telemetry_tool"].get("status") != "missing_data"
    is_telemetry_based = has_telemetry_evidence or "telemetry" in answer.lower()
    print(f"Genuinely Telemetry-Based Answer? {'YES' if is_telemetry_based else 'NO (Substituted Classification / Result)'}")
    print("----------------------------------------------------------------------\n")
