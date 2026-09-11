import fastf1
import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv("ai_services/.env")
db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/frontwing")

conn = psycopg2.connect(db_url)
cur = conn.cursor(cursor_factory=RealDictCursor)

sched = fastf1.get_event_schedule(2026)
cutoff = datetime.date(2026, 9, 11)

print(f"--- 2026 CALENDAR ROUNDS UP TO {cutoff} ---")
past_events = sched[(sched['RoundNumber'] > 0)]
for _, r in past_events.iterrows():
    edate = r['EventDate'].date() if hasattr(r['EventDate'], 'date') else r['EventDate']
    is_past = edate <= cutoff
    flag = "[PAST/COMPLETED]" if is_past else "[UPCOMING]"
    print(f"Round {r['RoundNumber']:2d} | Date: {edate} | {flag} {r['EventName']} ({r['Country']})")

print("\n--- SESSIONS CURRENTLY IN POSTGRESQL FOR 2026 ---")
cur.execute("""
    SELECT s.id, s.type, s.date, r.name, COUNT(rr.driver_id) as classified_count
    FROM sessions s
    JOIN races r ON s.race_id = r.id
    LEFT JOIN race_results rr ON s.id = rr.session_id
    WHERE r.year = 2026
    GROUP BY s.id, s.type, s.date, r.name
    ORDER BY s.date ASC;
""")
rows = cur.fetchall()
for row in rows:
    print(f"DB: {row['id']} | Date: {row['date']} | {row['name']} | Drivers: {row['classified_count']}")

cur.close()
conn.close()
