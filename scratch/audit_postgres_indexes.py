import psycopg2
from psycopg2.extras import RealDictCursor

conn = psycopg2.connect("postgresql://postgres:postgres@localhost:5433/frontwing")
conn.autocommit = True
cur = conn.cursor(cursor_factory=RealDictCursor)

print("=== 1. EXISTING INDEXES ===")
cur.execute("""
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('laps', 'telemetry_metadata', 'stints')
ORDER BY tablename, indexname;
""")
for r in cur.fetchall():
    print(f"Table: {r['tablename']:<20} Index: {r['indexname']:<35} Def: {r['indexdef']}")

print("\n=== 2. TABLE ROW COUNTS ===")
for tbl in ['laps', 'telemetry_metadata', 'stints']:
    cur.execute(f"SELECT count(*) as cnt FROM {tbl};")
    print(f"Table {tbl:<20}: {cur.fetchone()['cnt']} rows")

queries = [
    ("laps", "EXPLAIN ANALYZE SELECT * FROM laps WHERE session_id = '2024_dutch_gp_race' AND driver_id = 'verstappen';"),
    ("telemetry_metadata", "EXPLAIN ANALYZE SELECT * FROM telemetry_metadata WHERE session_id = '2024_dutch_gp_race' AND driver_id = 'verstappen';"),
    ("stints", "EXPLAIN ANALYZE SELECT * FROM stints WHERE session_id = '2024_dutch_gp_race' AND driver_id = 'verstappen';")
]

print("\n=== 3. BEFORE INDEXING: EXPLAIN ANALYZE ===")
for tbl, q in queries:
    print(f"\n--- Query on {tbl} ---")
    cur.execute(q)
    for row in cur.fetchall():
        print(row['QUERY PLAN'])

print("\n=== 4. ADDING COMPOSITE INDEXES ===")
cur.execute("CREATE INDEX IF NOT EXISTS idx_laps_session_driver ON laps(session_id, driver_id);")
print("Created/verified idx_laps_session_driver")
cur.execute("CREATE INDEX IF NOT EXISTS idx_telemetry_meta_session_driver ON telemetry_metadata(session_id, driver_id);")
print("Created/verified idx_telemetry_meta_session_driver")
cur.execute("CREATE INDEX IF NOT EXISTS idx_stints_session_driver ON stints(session_id, driver_id);")
print("Created/verified idx_stints_session_driver")

print("\n=== 5. AFTER INDEXING: EXPLAIN ANALYZE ===")
for tbl, q in queries:
    print(f"\n--- Query on {tbl} ---")
    cur.execute(q)
    for row in cur.fetchall():
        print(row['QUERY PLAN'])

cur.close()
conn.close()
