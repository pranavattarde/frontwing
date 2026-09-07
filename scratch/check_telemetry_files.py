import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor

conn = psycopg2.connect(dbname='frontwing', user='postgres', password='postgres', host='localhost', port=5433)
cur = conn.cursor(cursor_factory=RealDictCursor)

cur.execute("SELECT session_id, driver_id, lap_number, storage_path FROM telemetry_metadata WHERE session_id = '2024_dutch_gp_race' LIMIT 5")
rows = cur.fetchall()
print("Dutch GP telemetry_metadata rows:", len(rows), rows)

cur.execute("SELECT session_id, driver_id, lap_number, storage_path FROM telemetry_metadata LIMIT 5")
sample_rows = cur.fetchall()
print("\nSample telemetry_metadata rows:")
for r in sample_rows:
    p = r['storage_path']
    exists = os.path.exists(p)
    print(f"  {r['session_id']} {r['driver_id']} lap {r['lap_number']} -> path: {p} (exists: {exists})")
    if exists:
        with open(p) as f:
            data = json.load(f)
            gears = [pt.get('gear') for pt in data[:10]]
            print(f"    first 10 gear points: {gears}")

cur.close()
conn.close()
