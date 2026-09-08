import sys
sys.path.insert(0, "ai_services")
sys.stdout.reconfigure(encoding="utf-8")
from app.tools.adapters import TelemetryTool, execute_query

tool = TelemetryTool()

def dump_driver(driver_id):
    res = tool.execute({
        "session_id": "2024_dutch_gp_race",
        "driver_id": driver_id
    })
    deg = res.get("tyre_degradation", [])
    print(f"\n=======================================================")
    print(f"  TYRE DEGRADATION TABLE: {driver_id.upper()} (DUTCH GP 2024)")
    print(f"=======================================================")
    print(f"| Lap | Stint | Compound | Pace Loss (s) | Wear (%) | Tag / Status            |")
    print(f"|-----|-------|----------|---------------|----------|-------------------------|")
    for row in deg:
        lap = row.get("lap")
        stint = row.get("stint")
        comp = row.get("compound", "UNKNOWN")
        pace = row.get("pace_loss_s")
        wear = row.get("wear_pct")
        note = row.get("note") or row.get("status") or "CLEAN"
        
        pace_str = f"{pace:+.3f}s" if pace is not None else "   -   "
        wear_str = f"{wear:5.1f}%" if wear is not None else "  -  "
        print(f"| {lap:3d} | {stint:5d} | {comp:8s} | {pace_str:13s} | {wear_str:8s} | {note:23s} |")

dump_driver("verstappen")
dump_driver("norris")
dump_driver("leclerc")
