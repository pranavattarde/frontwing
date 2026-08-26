import sys
import os
import json
import dotenv

dotenv.load_dotenv('ai_services/.env')
sys.path.insert(0, 'ai_services')

from app.core.db import execute_query

def inspect_gp(gp_keyword):
    print("="*80)
    print(f"INSPECTING DATABASE FOR GP KEYWORD: '{gp_keyword}'")
    print("="*80)
    
    sql = """
        SELECT 
            s.id as session_id,
            r.year as season,
            r.name as race_name,
            c.name as circuit_name,
            c.country as circuit_country,
            COUNT(DISTINCT rr.id) as rr_count,
            COUNT(DISTINCT rr.driver_id) as driver_count,
            COUNT(DISTINCT tm.id) as tm_count
        FROM sessions s
        JOIN races r ON s.race_id = r.id
        LEFT JOIN circuits c ON r.circuit_id = c.id
        LEFT JOIN race_results rr ON s.id = rr.session_id
        LEFT JOIN telemetry_metadata tm ON s.id = tm.session_id
        WHERE (c.id ILIKE %s OR c.name ILIKE %s OR r.name ILIKE %s OR r.id ILIKE %s OR c.country ILIKE %s)
        GROUP BY s.id, r.year, r.name, c.name, c.country
        ORDER BY r.year DESC, s.id
    """
    kw = f"%{gp_keyword}%"
    rows = execute_query(sql, (kw, kw, kw, kw, kw), fetch=True)
    
    if not rows:
        print("No matching sessions found.\n")
        return
        
    for r in rows:
        sid = r["session_id"]
        season = r["season"]
        race = r["race_name"]
        rr_cnt = r["rr_count"]
        drv_cnt = r["driver_count"]
        tm_cnt = r["tm_count"]
        
        # Check sample race result source / status
        sample_rr = execute_query("SELECT driver_id, position, status, points FROM race_results WHERE session_id = %s LIMIT 3", (sid,), fetch=True)
        # Check telemetry sample
        sample_tm = execute_query("SELECT driver_id, lap_number FROM telemetry_metadata WHERE session_id = %s LIMIT 1", (sid,), fetch=True)
        
        is_mock = "mock" if season == 2026 or rr_cnt < 15 or not tm_cnt else "real/verified"
        
        print(f"Session ID: {sid}")
        print(f"  Season: {season} | Race: {race} | Circuit: {r['circuit_name']} ({r['circuit_country']})")
        print(f"  Race Results Rows: {rr_cnt} | Unique Drivers: {drv_cnt}")
        print(f"  Telemetry Metadata Rows: {tm_cnt}")
        print(f"  Sample Race Results: {sample_rr}")
        print(f"  Sample Telemetry: {sample_tm}")
        print(f"  Classification: {'SEEDED/MOCK' if season >= 2026 or rr_cnt < 15 else 'REAL/VERIFIED'}")
        print("-" * 50)

def main():
    for gp in ["spain", "spanish", "brazil", "sao paulo", "monaco", "austria"]:
        inspect_gp(gp)

if __name__ == "__main__":
    main()
