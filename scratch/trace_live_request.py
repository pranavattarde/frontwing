import urllib.request
import json

def send_query(url, payload):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read().decode('utf-8')
            return json.loads(data)
    except Exception as e:
        return {"error": str(e)}

questions = [
    "Explain the difference between soft and hard tyres.",
    "Who finished second in Spain?",
    "Compare lap timings of Verstappen and Hamilton at Qatar GP",
    "Compare Piastri vs Verstappen at Brazil"
]

for q in questions:
    print(f"\n=======================================================")
    print(f"QUESTION: {q}")
    print(f"=======================================================")
    res = send_query("http://localhost:8000/engineer/query", {"question": q})
    print(f"Intent: {res.get('intelligence_trace', {}).get('intent')}")
    print(f"Contract: {json.dumps(res.get('intelligence_trace', {}).get('semantic_contract'), indent=2)}")
    print(f"Executed Tools: {res.get('tools_used')}")
    print(f"Final Answer: {res.get('final_answer')}")
    print(f"Provider: {res.get('intelligence_trace', {}).get('llm_provider')} / Model: {res.get('intelligence_trace', {}).get('llm_model')}")
