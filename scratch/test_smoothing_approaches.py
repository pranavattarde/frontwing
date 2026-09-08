import sys
sys.path.insert(0, "ai_services")
sys.stdout.reconfigure(encoding="utf-8")
import psycopg2
from psycopg2.extras import RealDictCursor
import numpy as np

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5433/frontwing')
cur = conn.cursor(cursor_factory=RealDictCursor)

def evaluate_stint_smoothing(driver_id):
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
    
    print(f"\n=================== EVALUATING {driver_id.upper()} ===================")
    for s in stints:
        s_num = s["stint_number"]
        s_start = s["start_lap"]
        s_end = s["end_lap"]
        is_last_stint = (s_num == len(stints))
        stint_laps = [l for l in laps if s_start <= l["lap_number"] <= s_end]
        
        # Clean flying laps (excluding start lap, in lap, out lap, invalid laps)
        clean_laps = [
            l for l in stint_laps
            if l["lap_number"] > 1
            and not l.get("is_pit_out_lap")
            and not (not is_last_stint and l["lap_number"] == s_end)
            and not (s_num > 1 and l["lap_number"] == s_start)
            and l.get("is_valid", True)
            and l.get("lap_time_ms")
        ]
        if len(clean_laps) < 3:
            print(f"Stint {s_num}: Insufficient clean laps ({len(clean_laps)})")
            continue
            
        base_lap = clean_laps[0]
        base_lap_num = base_lap["lap_number"]
        
        # Baseline pace: minimum of first 3 clean laps (or first clean lap)
        first_3_times = [l["lap_time_ms"] / 1000.0 for l in clean_laps[:min(3, len(clean_laps))]]
        base_time_s = min(first_3_times)
        
        clean_lap_nums = [l["lap_number"] for l in clean_laps]
        clean_raw_times = [l["lap_time_ms"] / 1000.0 for l in clean_laps]
        ages = np.array([ln - base_lap_num for ln in clean_lap_nums])
        
        # Fuel-corrected lap times (+0.06s per lap of fuel burned relative to base lap)
        fc_times = np.array(clean_raw_times) + 0.06 * ages
        fc_deltas = np.maximum(0.0, fc_times - base_time_s)
        
        # Method A: Rolling 3-lap window smoothed + cumulative max (monotonic non-decreasing)
        smoothed_deltas = []
        for i in range(len(fc_deltas)):
            window = fc_deltas[max(0, i-1):min(len(fc_deltas), i+2)]
            smoothed_deltas.append(float(np.mean(window)))
        mono_deltas = np.maximum.accumulate(smoothed_deltas)
        
        # Method B: Linear regression trend from tire_score.py + soft residual blend
        slope = max(0.005, np.polyfit(ages, fc_times, 1)[0]) if len(ages) >= 3 else 0.04
        trend_deltas = slope * ages
        blended = 0.7 * trend_deltas + 0.3 * np.array(smoothed_deltas)
        blended_mono = np.maximum.accumulate(np.maximum(0.0, blended))
        
        # Compute wear % scaling (wear reaches 100% when pace loss reaches 2.5s - 3.0s or end of tyre life)
        # In F1, a pace loss of 2.0s - 2.5s represents severe degradation (cliff)
        wear_a = np.clip(np.round((mono_deltas / 2.5) * 100.0, 1), 0.0, 100.0)
        wear_b = np.clip(np.round((blended_mono / 2.5) * 100.0, 1), 0.0, 100.0)
        
        print(f"\n--- Stint {s_num} ({s['compound']}, Base Lap {base_lap_num}, Slope={slope*1000:.1f}ms/lap) ---")
        print(f"{'Lap':>4} | {'Raw':>7} | {'FC':>7} | {'RawΔ':>6} | {'SmoothΔ':>7} | {'TrendΔ':>7} | {'WearA%':>6} | {'WearB%':>6}")
        print("-" * 65)
        for i in range(len(clean_laps)):
            ln = clean_lap_nums[i]
            rt = clean_raw_times[i]
            ft = fc_times[i]
            rd = clean_raw_times[i] - base_time_s
            sd = mono_deltas[i]
            td = blended_mono[i]
            wa = wear_a[i]
            wb = wear_b[i]
            print(f"{ln:4d} | {rt:7.3f} | {ft:7.3f} | {rd:+6.3f} | {sd:7.3f} | {td:7.3f} | {wa:5.1f}% | {wb:5.1f}%")

evaluate_stint_smoothing("verstappen")
evaluate_stint_smoothing("norris")
evaluate_stint_smoothing("leclerc")
conn.close()
