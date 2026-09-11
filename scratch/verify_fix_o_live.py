import requests
import time

FASTAPI_URL = "http://localhost:8000"
BACKEND_URL = "http://localhost:5000/api"

def test_live_backfill_behavior():
    # Use an unbackfilled session: 2024 Abu Dhabi GP race
    session_id = "2024_abu_dhabi_gp_race"
    print(f"\n--- Checking initial backfill status for {session_id} ---")
    
    # 1. Check direct lightweight status endpoint on backend
    res = requests.get(f"{BACKEND_URL}/sessions/backfill-status/{session_id}")
    print(f"Backend status endpoint returned HTTP {res.status_code}: {res.json()}")
    
    # 2. Trigger query via FastAPI /engineer/query
    print(f"\n--- Submitting query for Abu Dhabi comparison ---")
    payload = {
        "question": "compare verstappen and leclerc at abu dhabi 2024",
        "session_id": session_id,
        "drivers": ["verstappen", "leclerc"]
    }
    
    t0 = time.time()
    resp = requests.post(f"{FASTAPI_URL}/engineer/query", json=payload)
    elapsed = time.time() - t0
    data = resp.json()
    print(f"Query returned in {elapsed:.2f}s: status={data.get('status')}")
    
    # 3. Immediately submit a SECOND concurrent query for the same session
    print(f"\n--- Submitting second concurrent query for {session_id} ---")
    t0 = time.time()
    resp2 = requests.post(f"{FASTAPI_URL}/engineer/query", json=payload)
    elapsed2 = time.time() - t0
    data2 = resp2.json()
    print(f"Second query returned in {elapsed2:.2f}s: status={data2.get('status')}")
    
    # Verify both returned backfilling with identical job session_id
    if data.get("status") == "backfilling":
        print(f"Job 1: progress={data.get('progress_pct')}%, stage={data.get('stage')}")
        print(f"Job 2: progress={data2.get('progress_pct')}%, stage={data2.get('stage')}")
        
    # 4. Poll lightweight status endpoint 3 times
    print(f"\n--- Polling lightweight endpoint directly ---")
    for i in range(3):
        time.sleep(1.5)
        st = requests.get(f"{BACKEND_URL}/sessions/backfill-status/{session_id}").json()
        print(f"Poll {i+1}: status={st.get('status')}, progress={st.get('progress_pct')}%, stage={st.get('stage')}")

if __name__ == "__main__":
    test_live_backfill_behavior()
