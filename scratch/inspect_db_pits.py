import sys
sys.path.insert(0, "ai_services")
from app.core.db import execute_query

sessions = [
    "2024_dutch_gp_race",
    "2024_silverstone_gp_race",
    "2024_british_gp_race",
    "2023_monaco_gp_race",
    "2024_qatar_gp_race",
    "2022_british_gp_race"
]

for sid in sessions:
    stints = execute_query(
        "SELECT driver_id, stint_number, compound, start_lap, end_lap FROM stints WHERE session_id = %s ORDER BY driver_id, stint_number",
        (sid,), fetch=True
    ) or []
    drivers = set(s["driver_id"] for s in stints)
    print(f"=== Session: {sid} (total stints: {len(stints)}, drivers: {len(drivers)}) ===")
    for d in ["verstappen", "leclerc", "hamilton", "norris", "piastri", "russell"]:
        d_stints = [s for s in stints if s["driver_id"] == d]
        if d_stints:
            stops = [f"Lap {s['end_lap']} ({s['compound']} -> {d_stints[i+1]['compound']})" for i, s in enumerate(d_stints[:-1])]
            print(f"  Driver {d}: {len(d_stints)} stints, stops: {', '.join(stops) if stops else 'None'}")
