import sys
import os
sys.path.insert(0, os.path.abspath("ai_services"))

import psycopg2
from psycopg2.extras import RealDictCursor
from app.ingestion.fastf1_collector import FastF1Collector

def run():
    print("--- 1. Purging partial laps and telemetry for 2024_dutch_gp_race ---")
    conn = psycopg2.connect(dbname='frontwing', user='postgres', password='postgres', host='localhost', port=5433)
    cur = conn.cursor()
    cur.execute("DELETE FROM telemetry_metadata WHERE session_id = '2024_dutch_gp_race'")
    cur.execute("DELETE FROM laps WHERE session_id = '2024_dutch_gp_race'")
    cur.execute("DELETE FROM stints WHERE session_id = '2024_dutch_gp_race'")
    conn.commit()
    cur.close()
    conn.close()
    print("Purged old Dutch GP laps and telemetry.")

    print("\n--- 2. Ingesting Full Dutch GP 2024 via FastF1Collector ---")
    collector = FastF1Collector()
    res = collector.load_session(2024, "Netherlands", "R", load_telemetry=True, force_telemetry=True)
    print("Load result:", res)

    print("\n--- 3. Verifying Lap Counts in Postgres ---")
    conn = psycopg2.connect(dbname='frontwing', user='postgres', password='postgres', host='localhost', port=5433)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT driver_id, COUNT(*) as cnt, MIN(lap_time_ms) as min_ms FROM laps WHERE session_id = '2024_dutch_gp_race' AND driver_id IN ('verstappen', 'norris') GROUP BY driver_id")
    for r in cur.fetchall():
        print(f"Postgres {r['driver_id']}: {r['cnt']} laps, fastest: {r['min_ms']} ms ({r['min_ms']/1000.0:.3f}s)")

    cur.execute("SELECT COUNT(DISTINCT driver_id) as drv_cnt, COUNT(*) as telem_cnt FROM telemetry_metadata WHERE session_id = '2024_dutch_gp_race'")
    print("Telemetry coverage:", cur.fetchone())

    cur.close()
    conn.close()

if __name__ == "__main__":
    run()
