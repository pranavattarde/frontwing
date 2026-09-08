import sys
sys.path.insert(0, "ai_services")
sys.stdout.reconfigure(encoding="utf-8")
import redis
import requests
import time
import json

# 1. Connect to Redis
r = redis.Redis(host='localhost', port=6379, db=0)
cache_key = "cache:investigation:144da4cbc25ec056e1f80c10b4675b55bcc56a0b44fa2a7056e094ca64edb27c"

print("--- 1. Checking Redis Cache Before Cold Test ---")
exists = r.exists(cache_key)
ttl = r.ttl(cache_key)
print(f"Cache key '{cache_key}' exists?: {bool(exists)}, TTL: {ttl} seconds")

# 2. Delete cache key to force a genuine COLD test
deleted = r.delete(cache_key)
print(f"Deleted cache key from Redis: {deleted}")
assert r.exists(cache_key) == 0, "Cache key was not deleted!"

# 3. Fire Cold Request to AI Services directly
print("\n--- 2. Firing Cold Request to FastAPI (/engineer/query) ---")
payload = {
    "question": "compare verstappen with hamilton at monza",
    "conversation_id": "test_monza_cold_verification"
}
t0 = time.time()
try:
    resp = requests.post("http://localhost:8000/engineer/query", json=payload, timeout=90)
    latency = time.time() - t0
    print(f"Cold Response Status Code: {resp.status_code}")
    print(f"Total Cold Latency: {latency:.2f} seconds ({latency*1000:.0f} ms)")
    
    if resp.status_code == 200:
        data = resp.json()
        print("\n--- 3. Verifying Cold Response Content ---")
        final_answer = data.get("final_answer", "")
        print(f"Final Answer Preview:\n{final_answer[:400]}")
        print(f"\nProvider: {data.get('provider')}")
        print(f"Tools Used: {data.get('tools_used')}")
        
        # Verify lap numbers and timing in evidence
        evidence = data.get("evidence", {})
        telem_data = evidence.get("telemetry_tool", {})
        lap_a = telem_data.get("lap_number")
        lap_b = telem_data.get("comparative_lap_number")
        time_a = telem_data.get("lap_time_s")
        time_b = telem_data.get("comparative_lap_time_s")
        fastest_drv = telem_data.get("comparative_analysis", {}).get("faster_driver")
        
        print(f"\nExtracted Telemetry Evidence:")
        print(f"  Verstappen Lap: {lap_a} (Time: {time_a}s) [Expected FastF1: Lap 43, 81.745s]")
        print(f"  Hamilton Lap: {lap_b} (Time: {time_b}s) [Expected FastF1: Lap 53, 81.512s]")
        print(f"  Faster Driver: {fastest_drv}")
        
        # Confirm byte-for-byte correctness
        assert lap_a == 43 and time_a == 81.745, f"Verstappen timing mismatch: {lap_a}, {time_a}"
        assert lap_b == 53 and time_b == 81.512, f"Hamilton timing mismatch: {lap_b}, {time_b}"
        print("\n>>> COLD VERIFICATION CONFIRMED: 100% match with FastF1 ground truth! <<<")
except Exception as e:
    print(f"Error calling /engineer/query: {e}")

# 4. Brand New Never-Queried Driver Pair at Monza (Leclerc vs Norris)
print("\n--- 4. Brand New Never-Queried Driver Pair at Monza (Leclerc vs Norris) ---")
payload_new = {
    "question": "compare leclerc with norris at monza",
    "conversation_id": "test_monza_new_pair_verification"
}
t0_new = time.time()
try:
    resp_new = requests.post("http://localhost:8000/engineer/query", json=payload_new, timeout=90)
    latency_new = time.time() - t0_new
    print(f"New Pair Response Status Code: {resp_new.status_code}")
    print(f"Total Cold Latency for New Pair: {latency_new:.2f} seconds ({latency_new*1000:.0f} ms)")
    if resp_new.status_code == 200:
        data_new = resp_new.json()
        print(f"Final Answer Preview:\n{data_new.get('final_answer', '')[:400]}")
except Exception as e:
    print(f"Error calling /engineer/query for new pair: {e}")
