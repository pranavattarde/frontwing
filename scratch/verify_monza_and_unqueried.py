import sys
sys.path.insert(0, "ai_services")
sys.stdout.reconfigure(encoding="utf-8")
import json
from app.tools.adapters import TelemetryTool, execute_query

tool = TelemetryTool()

def test_session_backfill(session_id, driver_a, driver_b, gp_label):
    print(f"\n{'='*70}")
    print(f"TESTING AUTO-BACKFILL TRIGGER: {gp_label} ({driver_a} vs {driver_b})")
    print(f"{'='*70}")
    
    # Check current DB status
    telem = execute_query(
        "SELECT COUNT(DISTINCT driver_id) as drv_cnt, COUNT(*) as row_cnt FROM telemetry_metadata WHERE session_id = %s",
        (session_id,), fetch=True
    )
    drv_cnt = telem[0]["drv_cnt"] if telem else 0
    row_cnt = telem[0]["row_cnt"] if telem else 0
    print(f"Pre-query DB Status for {session_id}: {drv_cnt} drivers, {row_cnt} telemetry rows.")
    
    res = tool.execute({
        "session_id": session_id,
        "driver_id": driver_a,
        "comparative_driver_id": driver_b
    })
    
    status = res.get("status")
    print(f"TelemetryTool returned status: '{status}'")
    if status == "backfilling":
        print(f"  SUCCESS! Auto-backfill triggered asynchronously!")
        print(f"  Stage: {res.get('stage')}")
        print(f"  Progress: {res.get('progress_pct')}%")
        print(f"  Message: {res.get('message')}")
    elif status == "success":
        print(f"  Session already has complete verified telemetry ({len(res.get('speed_trace', []))} pts for A, {len(res.get('comparative_speed_trace', []))} pts for B).")
    else:
        print(f"  Unexpected status: {res}")

# 1. Monza: Verstappen vs Hamilton
test_session_backfill("2024_italian_gp_race", "verstappen", "hamilton", "Italian Grand Prix (Monza)")

# 2. Unqueried 1: Spa (Belgian GP) - Leclerc vs Sainz
test_session_backfill("2024_belgian_gp_race", "leclerc", "sainz", "Belgian Grand Prix (Spa)")

# 3. Unqueried 2: Baku (Azerbaijan GP) - Russell vs Piastri
test_session_backfill("2024_azerbaijan_gp_race", "russell", "piastri", "Azerbaijan Grand Prix (Baku)")

# 4. Unqueried 3: Suzuka (Japanese GP) - Alonso vs Stroll
test_session_backfill("2024_japanese_gp_race", "alonso", "stroll", "Japanese Grand Prix (Suzuka)")
