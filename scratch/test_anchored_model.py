import psycopg2
from psycopg2.extras import RealDictCursor
import numpy as np

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5433/frontwing')
cur = conn.cursor(cursor_factory=RealDictCursor)

def test_driver(drv):
    cur.execute("SELECT stint_number, compound, start_lap, end_lap FROM stints WHERE session_id = '2024_dutch_gp_race' AND driver_id = %s ORDER BY stint_number", (drv,))
    stints = cur.fetchall()
    cur.execute("SELECT lap_number, lap_time_ms, is_pit_out_lap, is_valid FROM laps WHERE session_id = '2024_dutch_gp_race' AND driver_id = %s ORDER BY lap_number", (drv,))
    all_laps = cur.fetchall()

    for s_info in stints:
        s_num = int(s_info['stint_number'])
        s_start, s_end = s_info['start_lap'], s_info['end_lap']
        is_last = (s_num == len(stints))
        stint_laps = [l for l in all_laps if s_start <= l['lap_number'] <= s_end and l.get('lap_time_ms')]
        clean_laps = [
            l for l in stint_laps 
            if l['lap_number'] > 1 
            and not l.get('is_pit_out_lap') 
            and not (not is_last and l['lap_number'] == s_end) 
            and not (s_num > 1 and l['lap_number'] == s_start) 
            and l.get('is_valid', True)
        ]
        base_lap_num = clean_laps[0]['lap_number']
        ages = np.array([l['lap_number'] - base_lap_num for l in clean_laps], dtype=float)
        fc_times = np.array([(l['lap_time_ms']/1000.0) + 0.06 * ages[i] for i, l in enumerate(clean_laps)], dtype=float)
        base_time_s = fc_times[0]
        slope = max(0.005, np.polyfit(ages, fc_times, 1)[0]) if len(ages) >= 3 else 0.04
        trend_deltas = slope * ages
        smoothed_deltas = [
            max(0.0, float(np.mean([(fc_times[w] - base_time_s) for w in range(max(0, i-1), min(len(clean_laps), i+2))]))) 
            for i in range(len(clean_laps))
        ]
        blended = 0.7 * trend_deltas + 0.3 * np.array(smoothed_deltas)
        mono_pace = np.maximum.accumulate(np.maximum(0.0, blended))
        mono_pace = mono_pace - mono_pace[0]
        wear_arr = np.clip(np.round((mono_pace / 2.5) * 100.0, 1), 0.0, 100.0)
        print(f"Driver {drv.upper()} Stint {s_num} ({s_info['compound']}): Clean Laps {clean_laps[0]['lap_number']} to {clean_laps[-1]['lap_number']}")
        print(f"  Start Lap {clean_laps[0]['lap_number']}: pace={mono_pace[0]:.3f}s wear={wear_arr[0]:.1f}%")
        print(f"  End Lap {clean_laps[-1]['lap_number']}: pace={mono_pace[-1]:.3f}s wear={wear_arr[-1]:.1f}%")

test_driver('verstappen')
test_driver('norris')
test_driver('leclerc')
conn.close()
