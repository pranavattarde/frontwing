import sys
import os
sys.path.insert(0, os.path.abspath("ai_services"))
import psycopg2
from psycopg2.extras import RealDictCursor
from app.core.session_resolver import SessionResolver
from app.agents.nlp_parser import parse_semantic_query
from app.agents.planner import run_ai_race_engineer

conn = psycopg2.connect(dbname='frontwing', user='postgres', password='postgres', host='localhost', port=5433)
cur = conn.cursor(cursor_factory=RealDictCursor)

print("--- 1. Checking DB for Monza ---")
cur.execute("SELECT id, race_id, type, date FROM sessions WHERE id ILIKE '%monza%' OR id ILIKE '%ital%'")
rows = cur.fetchall()
print("Sessions matching monza/ital:", rows)

cur.execute("SELECT id, year, name, circuit_id FROM races WHERE id ILIKE '%monza%' OR id ILIKE '%ital%' OR name ILIKE '%monza%' OR name ILIKE '%ital%'")
print("Races matching monza/ital:", cur.fetchall())

cur.execute("SELECT id, name, location, country FROM circuits WHERE id ILIKE '%monza%' OR location ILIKE '%monza%' OR name ILIKE '%monza%'")
print("Circuits matching monza:", cur.fetchall())

cur.execute("SELECT driver_id, COUNT(id) as c FROM telemetry_metadata WHERE session_id = '2024_italian_gp_race' GROUP BY driver_id")
print("telemetry drivers for Monza:", cur.fetchall())

cur.execute("SELECT DISTINCT driver_id FROM laps WHERE session_id = '2024_italian_gp_race'")
print("laps drivers for Monza:", [r["driver_id"] for r in cur.fetchall()])

cur.execute("SELECT COUNT(*) FROM laps WHERE session_id = '2024_italian_gp_race'")
print("laps count for Monza:", cur.fetchone())

cur.close()
conn.close()

print("\n--- 2. Testing NLP Parser on 'compare verstappen with hamilton at monza' ---")
query = "compare verstappen with hamilton at monza"
contract = parse_semantic_query(query)
print("Contract:", contract)

print("\n--- 3. Testing SessionResolver for Monza ---")
res = SessionResolver.resolve_session(grand_prix="monza", season=2024, session_type="Race", load_telemetry=True)
print("SessionResolver result:", res)
