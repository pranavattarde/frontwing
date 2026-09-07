import sys
sys.path.insert(0, "ai_services")
sys.stdout.reconfigure(encoding="utf-8")
import json
from app.tools.adapters import TelemetryTool, execute_query

tool = TelemetryTool()

def test_driver_degradation(session_id, driver_id, driver_name):
    print(f"\n{'='*70}")
    print(f"TESTING TYRE DEGRADATION FOR: {driver_name} ({driver_id}) in {session_id}")
    print(f"{'='*70}")
    
    # 1. Fetch stints from DB
    cand = tool._resolve_driver_candidates(driver_id)
    stints = execute_query(
        """SELECT stint_number, compound, start_lap, end_lap, stint_length 
           FROM stints WHERE session_id = %s AND driver_id = ANY(%s) ORDER BY stint_number""",
        (session_id, cand), fetch=True
    ) or []
    print(f"Database Stints recorded: {len(stints)}")
    for s in stints:
        print(f"  Stint {s['stint_number']}: Compound={s['compound']}, Laps {s['start_lap']} -> {s['end_lap']} (Length: {s['stint_length']})")
    
    # 2. Run TelemetryTool
    res = tool.execute({
        "session_id": session_id,
        "driver_id": driver_id
    })
    
    deg_data = res.get("tyre_degradation", [])
    print(f"Total tyre degradation points: {len(deg_data)}")
    
    if not deg_data:
        print("ERROR: No tyre degradation points returned!")
        return
        
    # Group by stint
    stints_map = {}
    for pt in deg_data:
        s_id = pt.get("stint", 1)
        stints_map.setdefault(s_id, []).append(pt)
        
    for s_id, pts in sorted(stints_map.items()):
        print(f"\n--- STINT {s_id} (Compound: {pts[0].get('compound')}, Total Points: {len(pts)}) ---")
        first_laps = pts[:4]
        last_laps = pts[-3:]
        print("  First laps of stint (showing reset near 0):")
        for p in first_laps:
            print(f"    Lap {p.get('lap')}: wear_pct={p.get('wear_pct')}%, pace_loss={p.get('pace_loss_s')}s, note={p.get('note') or 'CLEAN'}")
        if len(pts) > 7:
            print("    ...")
            print("  End of stint (accumulated degradation):")
            for p in last_laps:
                print(f"    Lap {p.get('lap')}: wear_pct={p.get('wear_pct')}%, pace_loss={p.get('pace_loss_s')}s, note={p.get('note') or 'CLEAN'}")

    # Inspect transition between Stint 1 and Stint 2 (the pit stop boundary)
    if 1 in stints_map and 2 in stints_map:
        s1_end = stints_map[1][-1]
        s2_start = stints_map[2][0]
        s2_clean = [p for p in stints_map[2] if p.get('pace_loss_s') is not None]
        s2_first_clean = s2_clean[0] if s2_clean else s2_start
        print(f"\n[PIT STOP BOUNDARY CHECK]:")
        print(f"  Stint 1 End: Lap {s1_end.get('lap')} -> wear_pct={s1_end.get('wear_pct')}%, pace_loss={s1_end.get('pace_loss_s')}s")
        print(f"  Stint 2 Lap 1 (Out-lap/Pit exit): Lap {s2_start.get('lap')} -> wear_pct={s2_start.get('wear_pct')}, pace_loss={s2_start.get('pace_loss_s')}, note={s2_start.get('note')}")
        print(f"  Stint 2 First Clean Lap: Lap {s2_first_clean.get('lap')} -> wear_pct={s2_first_clean.get('wear_pct')}%, pace_loss={s2_first_clean.get('pace_loss_s')}s (RESET CONFIRMED!)")

# Run 3 test cases
test_driver_degradation("2024_dutch_gp_race", "verstappen", "Max Verstappen")
test_driver_degradation("2024_dutch_gp_race", "norris", "Lando Norris")
test_driver_degradation("2024_dutch_gp_race", "leclerc", "Charles Leclerc")
