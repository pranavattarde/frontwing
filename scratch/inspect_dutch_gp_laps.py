import psycopg2
from psycopg2.extras import RealDictCursor

conn = psycopg2.connect(dbname='frontwing', user='postgres', password='postgres', host='localhost', port=5433)
cur = conn.cursor(cursor_factory=RealDictCursor)

cur.execute("""
    SELECT driver_id, COUNT(*) as lap_count, MIN(lap_number) as min_lap, MAX(lap_number) as max_lap, MIN(lap_time_ms) as min_time
    FROM laps
    WHERE session_id = '2024_dutch_gp_race'
    GROUP BY driver_id
""")
print("LAPS SUMMARY IN POSTGRES FOR 2024_dutch_gp_race:")
for row in cur.fetchall():
    print(row)

cur.execute("""
    SELECT lap_number, lap_time_ms, is_valid, compound, is_pit_out_lap
    FROM laps
    WHERE session_id = '2024_dutch_gp_race' AND driver_id = 'norris'
    ORDER BY lap_number
""")
norris_laps = cur.fetchall()
print(f"\nNorris lap count in DB: {len(norris_laps)}")
print("Norris first 5 laps:", norris_laps[:5])
print("Norris last 5 laps:", norris_laps[-5:] if norris_laps else [])

# Look specifically for lap 72 and lap 30
cur.execute("""
    SELECT lap_number, lap_time_ms, sector_1_ms, sector_2_ms, sector_3_ms, is_valid
    FROM laps
    WHERE session_id = '2024_dutch_gp_race' AND driver_id = 'norris' AND lap_number = 72
""")
print("Norris lap 72 in DB:", cur.fetchall())

cur.execute("""
    SELECT lap_number, lap_time_ms, sector_1_ms, sector_2_ms, sector_3_ms, is_valid
    FROM laps
    WHERE session_id = '2024_dutch_gp_race' AND driver_id = 'verstappen' AND lap_number = 30
""")
print("Verstappen lap 30 in DB:", cur.fetchall())

cur.close()
conn.close()
