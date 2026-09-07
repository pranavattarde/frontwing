import os
import sys
import fastf1
import psycopg2
from psycopg2.extras import RealDictCursor

DB_CONFIG = {
    "dbname": "frontwing",
    "user": "postgres",
    "password": "postgres",
    "host": "localhost",
    "port": 5433
}

def check_dutch_gp():
    print("--- 1. Querying PostgreSQL for 2024_dutch_gp_race ---")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Check session
    cur.execute("SELECT * FROM sessions WHERE id = '2024_dutch_gp_race'")
    session_row = cur.fetchone()
    print(f"Session in DB: {session_row}")

    # Check Verstappen and Norris fastest valid lap in DB
    for driver_code, driver_id in [("VER", "verstappen"), ("NOR", "norris")]:
        cur.execute("""
            SELECT lap_number, lap_time_ms, sector_1_ms, sector_2_ms, sector_3_ms, is_valid, compound
            FROM laps
            WHERE session_id = '2024_dutch_gp_race'
              AND (driver_id = %s OR driver_id IN (SELECT id FROM drivers WHERE code = %s))
              AND is_valid = true AND lap_time_ms IS NOT NULL
            ORDER BY lap_time_ms ASC
            LIMIT 1
        """, (driver_id, driver_code))
        fastest_lap = cur.fetchone()
        print(f"Postgres Fastest Lap for {driver_code}: {fastest_lap}")

    cur.close()
    conn.close()

    print("\n--- 2. Fetching Raw FastF1 Session (2024, 'Netherlands', 'R') ---")
    os.makedirs("fastf1_cache", exist_ok=True)
    fastf1.Cache.enable_cache("fastf1_cache")
    ff1_session = fastf1.get_session(2024, "Netherlands", "R")
    ff1_session.load(telemetry=False, weather=False, messages=False)
    
    laps = ff1_session.laps
    print(f"Total FastF1 laps loaded: {len(laps)}")
    
    for driver_code in ["VER", "NOR"]:
        drv_laps = laps.pick_driver(driver_code)
        fastest_ff1 = drv_laps.pick_fastest()
        lap_sec = fastest_ff1["LapTime"].total_seconds()
        s1_sec = fastest_ff1["Sector1Time"].total_seconds()
        s2_sec = fastest_ff1["Sector2Time"].total_seconds()
        s3_sec = fastest_ff1["Sector3Time"].total_seconds()
        lap_num = int(fastest_ff1["LapNumber"])
        compound = fastest_ff1["Compound"]
        is_accurate = fastest_ff1["IsAccurate"]
        
        print(f"\nFastF1 pick_fastest() for {driver_code}:")
        print(f"  Lap Number: {lap_num}")
        print(f"  LapTime: {lap_sec}s ({round(lap_sec * 1000)} ms)")
        print(f"  Sector 1: {s1_sec}s ({round(s1_sec * 1000)} ms)")
        print(f"  Sector 2: {s2_sec}s ({round(s2_sec * 1000)} ms)")
        print(f"  Sector 3: {s3_sec}s ({round(s3_sec * 1000)} ms)")
        print(f"  Compound: {compound}, IsAccurate: {is_accurate}")

if __name__ == "__main__":
    check_dutch_gp()
