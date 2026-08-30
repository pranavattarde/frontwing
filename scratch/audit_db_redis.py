import os
import sys
import json
import time
from datetime import datetime

# Set up path to ai_services
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ai_services")))

from app.core.db import execute_query

def check_db():
    print("=== CHECKING POSTGRESQL ===")
    try:
        # Check if scoring_results table exists
        tables = execute_query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'", fetch=True)
        table_names = [t["table_name"] for t in tables]
        print(f"PostgreSQL Tables: {table_names}")
        
        if "scoring_results" in table_names:
            rows = execute_query("SELECT * FROM scoring_results WHERE session_id = %s", ("2024_qatar_gp_race",), fetch=True)
            print(f"scoring_results rows for 2024_qatar_gp_race: {len(rows)}")
            for r in rows:
                print(" ->", dict(r))
        else:
            print("scoring_results table does NOT exist.")
            
        # Check laps, race_results, stints for verstappen 2024_qatar_gp_race
        laps_count = execute_query("SELECT count(*) as c FROM laps WHERE session_id = %s AND driver_id = %s", ("2024_qatar_gp_race", "verstappen"), fetch=True)
        print(f"Laps count for Verstappen in 2024_qatar_gp_race: {laps_count[0]['c']}")
        
        stints_count = execute_query("SELECT count(*) as c FROM stints WHERE session_id = %s AND driver_id = %s", ("2024_qatar_gp_race", "verstappen"), fetch=True)
        print(f"Stints count for Verstappen in 2024_qatar_gp_race: {stints_count[0]['c']}")
        
        res_count = execute_query("SELECT count(*) as c FROM race_results WHERE session_id = %s AND driver_id = %s", ("2024_qatar_gp_race", "verstappen"), fetch=True)
        print(f"Race results count for Verstappen in 2024_qatar_gp_race: {res_count[0]['c']}")
        
    except Exception as e:
        print(f"DB Error: {e}")

def check_redis():
    print("\n=== CHECKING REDIS ===")
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        r.ping()
        print("Redis is CONNECTED!")
        keys = r.keys("*")
        print(f"Total Redis keys: {len(keys)}")
        for k in keys:
            ttl = r.ttl(k)
            val = r.get(k)
            print(f"\nKey: {k} (TTL: {ttl}s)")
            try:
                parsed = json.loads(val)
                if isinstance(parsed, dict):
                    print("  Keys inside value:", list(parsed.keys()))
                    if "final_answer" in parsed:
                        print("  final_answer:", str(parsed["final_answer"])[:100])
                    if "cached_at" in parsed or "timestamp" in parsed:
                        print("  Timestamp:", parsed.get("cached_at") or parsed.get("timestamp"))
            except Exception:
                print("  Value preview:", str(val)[:150])
    except Exception as e:
        print(f"Redis Error/Status: {e}")

if __name__ == "__main__":
    check_db()
    check_redis()
