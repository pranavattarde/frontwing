import urllib.request
import json

def test_live_ai_service():
    url = "http://127.0.0.1:8000/engineer/query"
    queries = [
        "Explain the difference between soft and hard tyres.",
        "What is understeer in F1?",
        "Who finished second in Spain?"
    ]
    
    for q in queries:
        print(f"\n========================================================")
        print(f" TESTING LIVE PYTHON SERVICE (http://127.0.0.1:8000/engineer/query)")
        print(f" QUERY: '{q}'")
        print(f"========================================================")
        req_data = json.dumps({"question": q}).encode('utf-8')
        req = urllib.request.Request(url, data=req_data, headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req) as response:
                res_body = response.read().decode('utf-8')
                res_json = json.loads(res_body)
                print(f"STATUS CODE: {response.status}")
                print(f"INTENT IN TRACE: {res_json.get('intelligence_trace', {}).get('intent')}")
                print(f"EXECUTED TOOLS: {res_json.get('intelligence_trace', {}).get('executed_tools')}")
                print(f"FINAL ANSWER: {res_json.get('final_answer')}")
                print(f"EXECUTIVE SUMMARY: {res_json.get('investigation_report', {}).get('Executive Summary')}")
        except Exception as e:
            print(f"ERROR calling live AI service: {e}")

if __name__ == "__main__":
    test_live_ai_service()
