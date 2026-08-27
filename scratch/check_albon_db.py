import os
import sys
import pprint
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ai_services')))

from app.core.db import execute_query

def main():
    sess_id = "2022_british_gp_race"
    drv_id = "albon"

    print("--- 1. RACE_RESULTS (Albon in 2022 British GP) ---")
    rr = execute_query(
        "SELECT * FROM race_results WHERE session_id = %s AND driver_id = %s",
        (sess_id, drv_id), fetch=True
    )
    pprint.pprint(rr)

    print("\n--- 2. LAPS (Albon in 2022 British GP) ---")
    laps = execute_query(
        "SELECT * FROM laps WHERE session_id = %s AND driver_id = %s",
        (sess_id, drv_id), fetch=True
    )
    pprint.pprint(laps)

    print("\n--- 3. STINTS (Albon in 2022 British GP) ---")
    stints = execute_query(
        "SELECT * FROM stints WHERE session_id = %s AND driver_id = %s",
        (sess_id, drv_id), fetch=True
    )
    pprint.pprint(stints)

    print("\n--- 4. TELEMETRY_METADATA (Albon in 2022 British GP) ---")
    tm = execute_query(
        "SELECT * FROM telemetry_metadata WHERE session_id = %s AND driver_id = %s",
        (sess_id, drv_id), fetch=True
    )
    pprint.pprint(tm)

    print("\n--- 5. All drivers in race_results for 2022 British GP with DNF/Collision ---")
    dnfs = execute_query(
        "SELECT driver_id, constructor_id, grid_position, position, status, points FROM race_results WHERE session_id = %s ORDER BY position",
        (sess_id,), fetch=True
    )
    pprint.pprint(dnfs)

if __name__ == "__main__":
    main()
