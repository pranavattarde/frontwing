import sys
sys.path.insert(0, "ai_services")
sys.stdout.reconfigure(encoding="utf-8")
import psycopg2
from psycopg2.extras import RealDictCursor
import fastf1

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5433/frontwing')
cur = conn.cursor(cursor_factory=RealDictCursor)
cur.execute("""
    SELECT driver_id, lap_number, lap_time_ms, is_valid, sector_1_ms, sector_2_ms, sector_3_ms 
    FROM laps 
    WHERE session_id = '2024_italian_gp_race' AND driver_id IN ('hamilton', 'verstappen') 
    ORDER BY lap_time_ms ASC
""")
rows = cur.fetchall()
print('--- 1. PostgreSQL Database Laps for Monza ---')
ham_laps = [r for r in rows if r['driver_id'] == 'hamilton']
ver_laps = [r for r in rows if r['driver_id'] == 'verstappen']
print(f'Total Hamilton laps in DB: {len(ham_laps)}')
print(f'Hamilton PB in DB: Lap {ham_laps[0]["lap_number"]} -> {ham_laps[0]["lap_time_ms"]/1000.0:.3f}s ({ham_laps[0]["lap_time_ms"]} ms)' if ham_laps else 'Hamilton: NONE')
print(f'Total Verstappen laps in DB: {len(ver_laps)}')
print(f'Verstappen PB in DB: Lap {ver_laps[0]["lap_number"]} -> {ver_laps[0]["lap_time_ms"]/1000.0:.3f}s ({ver_laps[0]["lap_time_ms"]} ms)' if ver_laps else 'Verstappen: NONE')
conn.close()

print('\n--- 2. FastF1 Fresh Download for 2024 Monza GP ---')
sess = fastf1.get_session(2024, 'Monza', 'R')
sess.load(laps=True, telemetry=False, weather=False)
ham_ff1 = sess.laps.pick_driver('HAM').pick_fastest()
ver_ff1 = sess.laps.pick_driver('VER').pick_fastest()
print(f'FastF1 HAM PB: Lap {ham_ff1["LapNumber"]}, {ham_ff1["LapTime"].total_seconds():.3f}s ({ham_ff1["LapTime"].total_seconds()*1000:.0f} ms)')
print(f'FastF1 VER PB: Lap {ver_ff1["LapNumber"]}, {ver_ff1["LapTime"].total_seconds():.3f}s ({ver_ff1["LapTime"].total_seconds()*1000:.0f} ms)')

delta_db = (ver_laps[0]["lap_time_ms"] - ham_laps[0]["lap_time_ms"]) / 1000.0 if (ham_laps and ver_laps) else None
delta_ff1 = ver_ff1["LapTime"].total_seconds() - ham_ff1["LapTime"].total_seconds()
print(f'\nDelta HAM vs VER: DB Delta = {delta_db:.3f}s, FastF1 Delta = {delta_ff1:.3f}s')
