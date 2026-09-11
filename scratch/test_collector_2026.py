import time
from app.ingestion.fastf1_collector import FastF1Collector
from app.core.db import execute_query

print("Testing FastF1Collector for 2026 Australian GP (Race)...")
t0 = time.time()
collector = FastF1Collector()
res = collector.load_session(2026, "Australia", "R", load_telemetry=False)
dur = time.time() - t0
print(f"Result in {dur:.2f}s:", res)

# Check database
sid = res.get("session_id")
if sid:
    rr = execute_query("SELECT COUNT(*) as cnt FROM race_results WHERE session_id = %s", (sid,), fetch=True)
    laps = execute_query("SELECT COUNT(*) as cnt FROM laps WHERE session_id = %s", (sid,), fetch=True)
    print(f"DB verification for {sid}: {rr[0]['cnt']} race_results rows, {laps[0]['cnt']} laps rows.")
