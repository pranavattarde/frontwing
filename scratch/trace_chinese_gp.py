import urllib.request
import json

def test_query(endpoint_name, url, payload):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            data = json.loads(res_body)
            print(f"=== [{endpoint_name}] Query: '{payload.get('question')}' ===")
            print(f"Status Code: {response.getcode()}")
            print(f"Cached Flag: {data.get('cached') or data.get('_cached')}")
            print(f"Final Answer: {data.get('final_answer')}")
            report = data.get('investigation_report', {})
            print(f"Report Verdict: {report.get('Verdict') or report.get('AI_VERDICT')}")
            evidence = data.get('evidence', {})
            print(f"Evidence Keys: {list(evidence.keys())}")
            for k, v in evidence.items():
                if isinstance(v, dict):
                    print(f"  Tool '{k}': session_id={v.get('session_id')}, race={v.get('race_name') or v.get('grand_prix')}, winner={v.get('winner_name') or v.get('winner')}, P3={v.get('p3_name') or v.get('third') or v.get('p3')}")
            print("==================================================\n")
    except Exception as e:
        print(f"=== [{endpoint_name}] ERROR for '{payload.get('question')}': {e} ===\n")

print("TRACING PIPELINE AT BOTH EXPRESS (5000) AND FASTAPI (8000)...\n")

# 1. Test Chinese GP on FastAPI (8000) directly
test_query("FastAPI 8000 Direct", "http://localhost:8000/engineer/query", {"question": "Who was 3rd in Chinese GP?"})

# 2. Test Chinese GP on Express (5000)
test_query("Express 5000 Gateway", "http://localhost:5000/engineer/query", {"question": "Who was 3rd in Chinese GP?"})

# 3. Test Typo Chinese GP on Express (5000)
test_query("Express 5000 Gateway (Typo)", "http://localhost:5000/engineer/query", {"question": "wh was 3rd in chinese gp?"})
