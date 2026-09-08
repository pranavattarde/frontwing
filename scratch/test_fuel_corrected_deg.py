import sys
sys.path.insert(0, "ai_services")
sys.stdout.reconfigure(encoding="utf-8")
import psycopg2
from psycopg2.extras import RealDictCursor
import numpy as np

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5433/frontwing')
cur = conn.cursor(cursor_factory=RealDictCursor)

def test_fuel_correction(driver_id):
    cur.execute("""
        SELECT stint_number, compound, start_lap, end_lap 
        FROM stints 
        WHERE session_id = '2024_dutch_gp_race' AND driver_id = %s 
        ORDER BY stint_number
    """, (driver_id,))
    stints = cur.fetchall()
    
    cur.execute("""
        SELECT lap_number, lap_time_ms, is_pit_out_lap, is_valid 
        FROM laps 
        WHERE session_id = '2024_dutch_gp_race' AND driver_id = %s 
        ORDER BY lap_number
    """, (driver_id,))
    laps = cur.fetchall()
    
    print(f"\n=================== {driver_id.upper()} FUEL-CORRECTED DEGRADATION ===================")
    for s in stints:
        s_num = s["stint_number"]
        s_start = s["start_lap"]
        s_end = s["end_lap"]
        is_last_stint = (s_num == len(stints))
        stint_laps = [l for l in laps if s_start <= l["lap_number"] <= s_end]
        
        # Identify clean flying laps
        clean_laps = [
            l for l in stint_laps
            if l["lap_number"] > 1
            and not l.get("is_pit_out_lap")
            and not (not is_last_stint and l["lap_number"] == s_end) # exclude in-lap
            and not (s_num > 1 and l["lap_number"] == s_start)       # exclude out-lap
            and l.get("is_valid", True)
            and l.get("lap_time_ms")
        ]
        if not clean_laps:
            continue
            
        base_lap = clean_laps[0]
        base_lap_num = base_lap["lap_number"]
        base_time_s = base_lap["lap_time_ms"] / 1000.0
        
        print(f"\n--- Stint {s_num} ({s['compound']}) Baseline Lap {base_lap_num}: {base_time_s:.3f}s ---")
        
        raw_deltas = []
        fc_deltas = []
        lap_nums = []
        
        for l in stint_laps:
            l_num = l["lap_number"]
            is_start = (l_num == 1)
            is_out = bool(l.get("is_pit_out_lap") or (s_num > 1 and l_num == s_start))
            is_in = bool(not is_last_stint and l_num == s_end)
            
            if is_start or is_out or is_in:
                note = "START-LAP" if is_start else ("OUT-LAP" if is_out else "IN-LAP")
                print(f"  Lap {l_num:2d}: [{note}] wear=None, pace_loss=None")
                continue
                
            t_s = l["lap_time_ms"] / 1000.0
            fuel_burn_laps = l_num - base_lap_num
            fuel_adj = 0.06 * fuel_burn_laps
            t_fc = t_s + fuel_adj
            raw_delta = t_s - base_time_s
            fc_delta = t_fc - base_time_s
            
            raw_deltas.append(raw_delta)
            fc_deltas.append(fc_delta)
            lap_nums.append(l_num)
            
        # Check smoothed / monotonic trend
        # Let's inspect raw_deltas vs fc_deltas
        for l_num, rd, fcd in zip(lap_nums, raw_deltas, fc_deltas):
            print(f"  Lap {l_num:2d}: raw_delta={rd:+.3f}s | fc_delta={fcd:+.3f}s")

test_fuel_correction("verstappen")
conn.close()
