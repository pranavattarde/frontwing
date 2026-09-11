"""
Stage A Live Verification Script
Validates 2025/2026 data resolution and ingestion against the REAL running FrontWing system.
Does NOT use mocks, pytest, or internal function calls.
"""
import sys
import json
import time
import requests
import fastf1
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

# Ensure unbuffered output
sys.stdout.reconfigure(line_buffering=True)

# Load environment variables
load_dotenv("ai_services/.env")
db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/frontwing")
api_base_url = "http://127.0.0.1:8000"

def get_db_connection():
    return psycopg2.connect(db_url)

print("=" * 80, flush=True)
print("PART 1: REAL LIVE VERIFICATION OF 2025 AND 2026 SEASONS", flush=True)
print("=" * 80, flush=True)

# STEP 1: FastF1 Schedule Checks
print("\n" + "#" * 80, flush=True)
print("STEP 1: Call fastf1.get_event_schedule(2025) and fastf1.get_event_schedule(2026)", flush=True)
print("#" * 80, flush=True)

print("\n--- FASTF1 2025 EVENT SCHEDULE ---", flush=True)
sched_2025 = fastf1.get_event_schedule(2025)
print(f"Total events returned for 2025: {len(sched_2025)}", flush=True)
for idx, row in sched_2025.iterrows():
    date_str = row['EventDate'].strftime('%Y-%m-%d') if hasattr(row['EventDate'], 'strftime') else str(row['EventDate'])
    print(f"Round {row['RoundNumber']:2d} | Date: {date_str} | Name: {row['EventName']} | Location: {row['Location']} | Country: {row['Country']}", flush=True)

print("\n--- FASTF1 2026 EVENT SCHEDULE ---", flush=True)
sched_2026 = fastf1.get_event_schedule(2026)
print(f"Total events returned for 2026: {len(sched_2026)}", flush=True)
for idx, row in sched_2026.iterrows():
    date_str = row['EventDate'].strftime('%Y-%m-%d') if hasattr(row['EventDate'], 'strftime') else str(row['EventDate'])
    print(f"Round {row['RoundNumber']:2d} | Date: {date_str} | Name: {row['EventName']} | Location: {row['Location']} | Country: {row['Country']}", flush=True)

# Confirm real races exist in FastF1 data
races_2025 = sched_2025[sched_2025['RoundNumber'] > 0]
races_2026 = sched_2026[sched_2026['RoundNumber'] > 0]
print(f"\n[CONFIRMED] 2025 has {len(races_2025)} championship Grand Prix rounds.", flush=True)
print(f"[CONFIRMED] 2026 has {len(races_2026)} championship Grand Prix rounds.", flush=True)

# STEP 2: Database Pre-Check
print("\n" + "#" * 80, flush=True)
print("STEP 2: Inspect Database Pre-Check (Confirming chosen races are NOT yet in DB)", flush=True)
print("#" * 80, flush=True)

conn = get_db_connection()
cur = conn.cursor(cursor_factory=RealDictCursor)
cur.execute("""
    SELECT s.id, s.type, s.date, r.year, r.name 
    FROM sessions s 
    JOIN races r ON s.race_id = r.id 
    WHERE r.year IN (2025, 2026)
    ORDER BY r.year DESC, s.date DESC;
""")
initial_rows = cur.fetchall()
print(f"Current 2025/2026 sessions in DB before test: {len(initial_rows)}", flush=True)
for r in initial_rows:
    print(f"  Existing in DB: id={r['id']} | year={r['year']} | name={r['name']} | date={r['date']}", flush=True)

# Picked races according to requirements:
# 1. 2026 Race (Unspecified Season): Austrian Grand Prix (Round 8, 2026) -> NOT IN DB
# 2. 2025 Race 1 (Unspecified Season): Emilia Romagna Grand Prix (Round 7, 2025 - Imola, not on 2026 calendar) -> NOT IN DB
# 3. 2025 Race 2 (Unspecified Season): Bahrain Grand Prix (Round 4, 2025 - in 2026 Bahrain is in October, uncompleted) -> NOT IN DB
# 4. Explicit 2025 Race Query: Japanese Grand Prix ("who won the 2025 Japanese grand prix?") -> NOT IN DB

queries_to_test = [
    {
        "description": "Unspecified Season Query 1 (Expects 2026 Austrian GP)",
        "question": "who won the Austrian grand prix?",
        "expected_year": 2026,
        "expected_winner": "George Russell",
        "expected_session_id": "2026_austria_gp_race"
    },
    {
        "description": "Unspecified Season Query 2 (Expects 2025 Emilia Romagna GP - Imola not on 2026 calendar)",
        "question": "who won the Emilia Romagna grand prix?",
        "expected_year": 2025,
        "expected_winner": "Max Verstappen",
        "expected_session_id": "2025_emilia_romagna_gp_race"
    },
    {
        "description": "Unspecified Season Query 3 (Expects 2025 Bahrain GP - 2026 Bahrain is upcoming with no results)",
        "question": "who won the Bahrain grand prix?",
        "expected_year": 2025,
        "expected_winner": "Oscar Piastri",
        "expected_session_id": "2025_bahrain_gp_race"
    },
    {
        "description": "Explicit Season Query 4 (Explicit 2025 Japanese GP)",
        "question": "who won the 2025 Japanese grand prix?",
        "expected_year": 2025,
        "expected_winner": "Max Verstappen",
        "expected_session_id": "2025_japanese_gp_race"
    }
]

# Confirm none of these sessions currently exist in DB
for q in queries_to_test:
    cur.execute("SELECT id FROM sessions WHERE id = %s", (q["expected_session_id"],))
    row = cur.fetchone()
    if row:
        print(f"WARNING: Session {q['expected_session_id']} already exists in DB.", flush=True)
    else:
        print(f"[VERIFIED] Session {q['expected_session_id']} is NOT in DB. Ready for real auto-ingestion test.", flush=True)

# STEPS 3, 4, 5: Send queries via HTTP POST to FastAPI service
print("\n" + "#" * 80, flush=True)
print("STEPS 3, 4, 5: Send REAL HTTP queries to FastAPI service (http://127.0.0.1:8000/engineer/query)", flush=True)
print("#" * 80, flush=True)

api_results = []
for idx, q in enumerate(queries_to_test, start=1):
    print("\n" + "=" * 80, flush=True)
    print(f"TEST {idx}: {q['description']}", flush=True)
    print(f"Question: \"{q['question']}\"", flush=True)
    print("=" * 80, flush=True)

    t0 = time.time()
    try:
        resp = requests.post(
            f"{api_base_url}/engineer/query",
            json={"question": q["question"]},
            timeout=180
        )
        elapsed = time.time() - t0
        print(f"HTTP Status: {resp.status_code} (took {elapsed:.2f}s)", flush=True)
        
        raw_json = resp.json()
        print("\n--- RAW API JSON RESPONSE ---", flush=True)
        print(json.dumps(raw_json, indent=2), flush=True)

        # Verification checks
        evidence = raw_json.get("evidence", {}) or {}
        race_res = evidence.get("race_results_tool") or evidence.get("race_results") or {}
        resolved_season = race_res.get("season") or raw_json.get("season")
        resolved_session = race_res.get("session") or raw_json.get("session_id")
        resolved_winner = race_res.get("winner")
        report = raw_json.get("investigation_report") or {}
        exec_sum = report.get("Executive Summary") if isinstance(report, dict) else ""
        response_text = raw_json.get("final_answer") or exec_sum or raw_json.get("response", "")

        print("\n--- RESOLUTION & CORRECTNESS CHECKS ---", flush=True)
        print(f"Resolved Season:     {resolved_season} (Expected: {q['expected_year']})", flush=True)
        print(f"Resolved Session ID: {resolved_session} (Expected: {q['expected_session_id']})", flush=True)
        print(f"Resolved Winner:     {resolved_winner} (Expected: {q['expected_winner']})", flush=True)
        print(f"Response Text:\n{response_text}", flush=True)

        # Assertions
        assert resolved_season == q["expected_year"], f"Season mismatch! Got {resolved_season}, expected {q['expected_year']}"
        assert resolved_session == q["expected_session_id"], f"Session ID mismatch! Got {resolved_session}, expected {q['expected_session_id']}"
        assert q["expected_winner"].lower() in str(resolved_winner).lower() or q["expected_winner"].lower() in str(response_text).lower(), f"Winner mismatch! Expected {q['expected_winner']}"
        print(f"[PASS] Query correctly resolved to {resolved_season} and verified real classification data!", flush=True)
        api_results.append((q, raw_json, True))

    except Exception as e:
        print(f"[FAIL] Query test failed: {e}", flush=True)
        api_results.append((q, str(e), False))

# STEP 6: Query PostgreSQL directly afterward to confirm DB persistence
print("\n" + "#" * 80, flush=True)
print("STEP 6: Direct PostgreSQL Query to confirm sessions & race_results persistence", flush=True)
print("#" * 80, flush=True)

cur.execute("""
    SELECT 
        s.id,
        s.type,
        s.date,
        s.status,
        r.id as race_id,
        r.year,
        r.name as race_name,
        COUNT(rr.driver_id) as classified_drivers
    FROM sessions s
    JOIN races r ON s.race_id = r.id
    LEFT JOIN race_results rr ON s.id = rr.session_id
    WHERE r.year IN (2025, 2026)
    GROUP BY s.id, s.type, s.date, s.status, r.id, r.year, r.name
    ORDER BY r.year DESC, s.date DESC;
""")
final_rows = cur.fetchall()

print("\n--- RAW DATABASE ROWS (sessions joined with races & race_results) ---", flush=True)
for r in final_rows:
    print(f"ROW: id='{r['id']}' | year={r['year']} | race='{r['race_name']}' | type='{r['type']}' | date={r['date']} | status='{r['status']}' | classified_drivers={r['classified_drivers']}", flush=True)

cur.close()
conn.close()

print("\n" + "=" * 80, flush=True)
print("LIVE VERIFICATION COMPLETE", flush=True)
print("=" * 80, flush=True)
