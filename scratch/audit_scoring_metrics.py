import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ai_services')))

from app.core.db import execute_query
from app.tools.adapters import ScoringTool

def audit_session(session_id, driver_id):
    print(f"=== Auditing Scoring for Session: {session_id}, Driver: {driver_id} ===")
    
    # 1. Total Laps
    total_laps_res = execute_query("SELECT MAX(lap_number) as max_lap FROM laps WHERE session_id = %s", (session_id,), fetch=True)
    max_lap = total_laps_res[0]["max_lap"] if total_laps_res else None
    print(f"1. Total Laps: {max_lap}")

    # 2. Driver & Teammate identification
    drv_res = execute_query(
        "SELECT d.id, d.code, d.constructor_id, c.name as team_name FROM drivers d LEFT JOIN constructors c ON d.constructor_id = c.id WHERE d.id = %s",
        (driver_id,), fetch=True
    )
    print(f"2. Driver Info: {drv_res}")
    
    constructor_id = drv_res[0]["constructor_id"] if (drv_res and drv_res[0]["constructor_id"]) else None
    teammates = []
    if constructor_id:
        teammates = execute_query(
            "SELECT id, code FROM drivers WHERE constructor_id = %s AND id != %s",
            (constructor_id, driver_id), fetch=True
        )
    print(f"   Teammate(s): {teammates}")

    # 3. Teammate's fastest clean lap in this session
    teammate_opt_lap = None
    if teammates:
        tm_ids = [t["id"] for t in teammates]
        placeholders = ', '.join(['%s'] * len(tm_ids))
        tm_laps = execute_query(
            f"SELECT MIN(lap_time_ms) as min_tm_ms FROM laps WHERE session_id = %s AND driver_id IN ({placeholders}) AND is_valid = true AND lap_time_ms IS NOT NULL",
            tuple([session_id] + tm_ids), fetch=True
        )
        if tm_laps and tm_laps[0]["min_tm_ms"]:
            teammate_opt_lap = round(tm_laps[0]["min_tm_ms"] / 1000.0, 3)
    print(f"   Teammate Fastest Clean Lap: {teammate_opt_lap}s")

    # 4. Driver's own fastest clean lap in this session
    drv_laps = execute_query(
        "SELECT MIN(lap_time_ms) as min_ms, AVG(lap_time_ms) as avg_ms, STDDEV(lap_time_ms) as std_ms, COUNT(*) as count FROM laps WHERE session_id = %s AND driver_id = %s AND is_valid = true AND lap_time_ms IS NOT NULL",
        (session_id, driver_id), fetch=True
    )
    print(f"   Driver Clean Lap Stats: {drv_laps}")

    # 5. Pit stops / Out laps from laps table
    pit_laps = execute_query(
        "SELECT lap_number, is_pit_out_lap FROM laps WHERE session_id = %s AND driver_id = %s AND is_pit_out_lap = true ORDER BY lap_number",
        (session_id, driver_id), fetch=True
    )
    print(f"   Pit Out Laps: {pit_laps}")

    # 6. Stints from DB
    stints = execute_query(
        "SELECT stint_number, compound, start_lap, end_lap, stint_length FROM stints WHERE session_id = %s AND driver_id = %s ORDER BY stint_number",
        (session_id, driver_id), fetch=True
    )
    print(f"   Stints: {stints}")

    # 7. Safety Car / VSC Detection
    # In F1 race timing, SC/VSC laps are marked by exceptionally high lap times across all drivers (e.g. > 130% of median race pace) or where multiple drivers have outlier slow laps on the same lap number.
    # Let's see if we can calculate SC laps from the laps distribution across the grid.
    sc_query = """
        WITH grid_laps AS (
            SELECT lap_number, AVG(lap_time_ms) as avg_lap_ms, COUNT(*) as car_count
            FROM laps
            WHERE session_id = %s AND lap_time_ms IS NOT NULL AND is_valid = true
            GROUP BY lap_number
        ),
        median_pace AS (
            SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY avg_lap_ms) as med_ms
            FROM grid_laps
        )
        SELECT g.lap_number, g.avg_lap_ms, m.med_ms, (g.avg_lap_ms / m.med_ms) as pace_ratio
        FROM grid_laps g, median_pace m
        WHERE (g.avg_lap_ms / m.med_ms) > 1.25 AND g.car_count >= 5
        ORDER BY g.lap_number
    """
    sc_res = execute_query(sc_query, (session_id,), fetch=True)
    print(f"   Computed Grid SC/VSC Laps (>25% slower than race median): {len(sc_res)} laps -> {[r['lap_number'] for r in sc_res] if sc_res else []}")

    # 8. Run current ScoringTool.execute()
    st = ScoringTool()
    tool_out = st.execute({"session_id": session_id, "driver_id": driver_id})
    print(f"8. Current ScoringTool Output: {tool_out}")

if __name__ == "__main__":
    audit_session("2024_qatar_gp_race", "verstappen")
    print("\n" + "="*70 + "\n")
    audit_session("2023_monaco_gp_race", "verstappen")
