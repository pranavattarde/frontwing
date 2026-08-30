import urllib.request
import json
import time
from datetime import datetime, timezone

def run_fresh_query():
    url = "http://127.0.0.1:8000/engineer/query"
    payload = {"question": "how did verstappen perform at qatar gp?"}
    data_bytes = json.dumps(payload).encode("utf-8")
    
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={"Content-Type": "application/json"}
    )
    
    start_time = time.time()
    start_utc = datetime.now(timezone.utc).isoformat()
    print(f"\n[CLIENT] Sending fresh query at UTC: {start_utc}")
    print(f"[CLIENT] Target: {url}")
    print(f"[CLIENT] Payload: {json.dumps(payload)}")
    
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            resp_bytes = resp.read()
            end_time = time.time()
            end_utc = datetime.now(timezone.utc).isoformat()
            duration_ms = int((end_time - start_time) * 1000)
            
            print(f"\n[CLIENT] Response received at UTC: {end_utc}")
            print(f"[CLIENT] HTTP Status: {resp.status}")
            print(f"[CLIENT] Total Client Measured Latency: {duration_ms}ms ({duration_ms/1000.0:.2f}s)")
            
            resp_json = json.loads(resp_bytes.decode("utf-8"))
            print("\n[CLIENT] JSON Response Summary:")
            print(f"  - Question: {resp_json.get('question')}")
            print(f"  - Tools Used: {resp_json.get('tools_used')}")
            print(f"  - Evidence Keys: {list(resp_json.get('evidence', {}).keys())}")
            print(f"  - Confidence: {resp_json.get('confidence')}")
            print(f"  - Final Answer:\n    {resp_json.get('final_answer')}")
            
            if "scoring_tool" in resp_json.get("evidence", {}):
                print(f"\n  - Scoring Tool Evidence:")
                for k, v in resp_json["evidence"]["scoring_tool"].items():
                    print(f"      {k}: {v}")
                    
    except Exception as e:
        print(f"[CLIENT] Request failed: {e}")

if __name__ == "__main__":
    run_fresh_query()
