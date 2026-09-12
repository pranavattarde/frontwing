"""
hero_service.py — FastF1 Event Schedule & IST Conversion Engine
Queries official FastF1 championship calendar, resolves next upcoming or most recent GP,
converts session timestamps to Indian Standard Time (IST, UTC+5:30) and local track time,
and writes live hero data to PostgreSQL.
"""

import os
import sys
import json
import datetime
import zoneinfo
import psycopg2
from psycopg2.extras import Json

# Map known circuits to metadata & circuitTracks keys
CIRCUIT_METADATA = {
    "monza": {
        "key": "monza",
        "name": "Autodromo Nazionale Monza",
        "length_km": 5.793,
        "turns": 11,
        "drs_zones": 2,
        "lap_record": "1:21.046 (Barrichello, 2004)"
    },
    "zandvoort": {
        "key": "zandvoort",
        "name": "Circuit Zandvoort",
        "length_km": 4.259,
        "turns": 14,
        "drs_zones": 2,
        "lap_record": "1:11.097 (Hamilton, 2021)"
    },
    "silverstone": {
        "key": "silverstone",
        "name": "Silverstone Circuit",
        "length_km": 5.891,
        "turns": 18,
        "drs_zones": 2,
        "lap_record": "1:27.097 (Verstappen, 2020)"
    },
    "qatar": {
        "key": "qatar",
        "name": "Lusail International Circuit",
        "length_km": 5.419,
        "turns": 16,
        "drs_zones": 1,
        "lap_record": "1:24.319 (Verstappen, 2023)"
    },
    "spielberg": {
        "key": "spielberg",
        "name": "Red Bull Ring",
        "length_km": 4.318,
        "turns": 10,
        "drs_zones": 3,
        "lap_record": "1:05.619 (Sainz, 2020)"
    },
    "monaco": {
        "key": "monaco",
        "name": "Circuit de Monaco",
        "length_km": 3.337,
        "turns": 19,
        "drs_zones": 1,
        "lap_record": "1:12.909 (Hamilton, 2021)"
    },
    "spa": {
        "key": "spa",
        "name": "Circuit de Spa-Francorchamps",
        "length_km": 7.004,
        "turns": 19,
        "drs_zones": 2,
        "lap_record": "1:46.286 (Bottas, 2018)"
    },
    "barcelona": {
        "key": "barcelona",
        "name": "Circuit de Barcelona-Catalunya",
        "length_km": 4.657,
        "turns": 14,
        "drs_zones": 2,
        "lap_record": "1:16.330 (Verstappen, 2023)"
    }
}

def resolve_circuit_key(event_name, location):
    text = f" {event_name} {location} ".lower()
    if "barcelona" in text or "catalunya" in text or "spain" in text or "spanish" in text or "madrid" in text:
        return "barcelona"
    if "monza" in text or "italian" in text or "italy" in text:
        return "monza"
    if "zandvoort" in text or "dutch" in text or "netherlands" in text:
        return "zandvoort"
    if "silverstone" in text or "british" in text or "britain" in text:
        return "silverstone"
    if "qatar" in text or "lusail" in text:
        return "qatar"
    if "monaco" in text or "monte" in text:
        return "monaco"
    if "spa-francorchamps" in text or "francorchamps" in text or "belgian" in text or " spa " in text:
        return "spa"
    if "austria" in text or "spielberg" in text:
        return "spielberg"
    return "monza"

def fetch_and_save_hero_schedule():
    import fastf1
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    ist_tz = zoneinfo.ZoneInfo("Asia/Kolkata")
    
    current_year = now_utc.year
    try:
        schedule = fastf1.get_event_schedule(current_year)
    except Exception as e:
        print(f"[HeroService] Warning: Could not fetch {current_year} schedule ({e}), trying previous year...")
        current_year = current_year - 1
        schedule = fastf1.get_event_schedule(current_year)
        
    valid_events = schedule[schedule["EventDate"].notna()].copy()
    if len(valid_events) == 0:
        raise RuntimeError("No valid FastF1 events found.")

    # Locate next upcoming GP or latest completed GP
    upcoming = valid_events[valid_events["EventDate"] >= now_utc.strftime("%Y-%m-%d")]
    if len(upcoming) > 0:
        event = upcoming.iloc[0]
        timing_status = "UPCOMING_RACE_WEEKEND"
    else:
        # Season completed, pick the final or most recent race
        event = valid_events.iloc[-1]
        timing_status = "RECENT_RACE_WEEKEND"

    event_name = str(event.get("EventName") or "Grand Prix")
    official_event_name = str(event.get("OfficialEventName") or event_name)
    location = str(event.get("Location") or "Circuit")
    country = str(event.get("Country") or "World")
    round_number = int(event.get("RoundNumber") or 1)
    
    circuit_key = resolve_circuit_key(event_name, location)
    circuit_meta = CIRCUIT_METADATA.get(circuit_key, CIRCUIT_METADATA["monza"])

    # Extract all session times and convert to IST (UTC+5:30) and local timezone
    sessions = []
    for i in range(1, 6):
        s_name = event.get(f"Session{i}")
        s_date_utc = event.get(f"Session{i}DateUtc")
        s_date_local = event.get(f"Session{i}Date")
        
        if s_name and s_date_utc is not None and not str(s_date_utc).startswith("NaT"):
            try:
                utc_dt = s_date_utc.to_pydatetime()
                if utc_dt.tzinfo is None:
                    utc_dt = utc_dt.replace(tzinfo=datetime.timezone.utc)
                ist_dt = utc_dt.astimezone(ist_tz)
                
                local_time_str = s_date_local.strftime("%H:%M") if hasattr(s_date_local, "strftime") else ""
                local_full_str = s_date_local.strftime("%d %b, %H:%M %Z") if hasattr(s_date_local, "strftime") else local_time_str

                sessions.append({
                    "session_num": i,
                    "name": str(s_name),
                    "utc": utc_dt.isoformat(),
                    "ist": ist_dt.strftime("%d %b, %H:%M IST"),
                    "ist_time": ist_dt.strftime("%H:%M IST"),
                    "ist_date": ist_dt.strftime("%d %b"),
                    "local": local_full_str,
                    "local_time": local_time_str,
                })
            except Exception as s_err:
                print(f"[HeroService] Session {i} parse note: {s_err}")

    # Generate contextually relevant questions for this event
    suggested_questions = [
        f"Could Ferrari or McLaren win the {event_name} with an undercut strategy?",
        f"Analyze Turn 1 telemetry delta and top speeds at {circuit_meta['name']}",
        f"Compare tire degradation wear slopes between medium and hard compounds",
        f"Simulate a safety car pit window on lap 28 at {location}"
    ]

    hero_headline = f"Can McLaren hold off Ferrari at the {event_name}?"
    hero_subheadline = f"The AI Race Engineer parses FastF1 timing arrays, models aerodynamic telemetry across {circuit_meta['turns']} turns, and projects stint degradation."

    hero_payload = {
        "event_name": event_name,
        "official_event_name": official_event_name,
        "location": f"{location}, {country}",
        "country": country,
        "round_number": round_number,
        "season": current_year,
        "timing_status": timing_status,
        "circuit_name": circuit_meta["name"],
        "circuit_key": circuit_meta["key"],
        "track_length_km": float(circuit_meta["length_km"]),
        "turns": int(circuit_meta["turns"]),
        "drs_zones": int(circuit_meta["drs_zones"]),
        "lap_record": circuit_meta["lap_record"],
        "hero_headline": hero_headline,
        "hero_subheadline": hero_subheadline,
        "sessions": sessions,
        "suggested_questions": suggested_questions,
        "source": "fastf1_official",
        "last_updated": now_utc.isoformat()
    }

    # Save to PostgreSQL
    db_host = os.environ.get("DB_HOST", "localhost")
    db_port = int(os.environ.get("DB_PORT", "5433"))
    db_user = os.environ.get("DB_USER", "postgres")
    db_pass = os.environ.get("DB_PASSWORD", "postgres")
    db_name = os.environ.get("DB_NAME", "frontwing")

    conn = psycopg2.connect(
        host=db_host,
        port=db_port,
        user=db_user,
        password=db_pass,
        dbname=db_name
    )
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO hero_content (
            id, event_name, official_event_name, location, country,
            round_number, season, circuit_name, circuit_key, track_length_km,
            turns, drs_zones, lap_record, hero_headline, hero_subheadline,
            sessions, suggested_questions, source, last_updated
        ) VALUES (
            'current', %s, %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            event_name = EXCLUDED.event_name,
            official_event_name = EXCLUDED.official_event_name,
            location = EXCLUDED.location,
            country = EXCLUDED.country,
            round_number = EXCLUDED.round_number,
            season = EXCLUDED.season,
            circuit_name = EXCLUDED.circuit_name,
            circuit_key = EXCLUDED.circuit_key,
            track_length_km = EXCLUDED.track_length_km,
            turns = EXCLUDED.turns,
            drs_zones = EXCLUDED.drs_zones,
            lap_record = EXCLUDED.lap_record,
            hero_headline = EXCLUDED.hero_headline,
            hero_subheadline = EXCLUDED.hero_subheadline,
            sessions = EXCLUDED.sessions,
            suggested_questions = EXCLUDED.suggested_questions,
            source = EXCLUDED.source,
            last_updated = NOW();
        """,
        (
            hero_payload["event_name"],
            hero_payload["official_event_name"],
            hero_payload["location"],
            hero_payload["country"],
            hero_payload["round_number"],
            hero_payload["season"],
            hero_payload["circuit_name"],
            hero_payload["circuit_key"],
            hero_payload["track_length_km"],
            hero_payload["turns"],
            hero_payload["drs_zones"],
            hero_payload["lap_record"],
            hero_payload["hero_headline"],
            hero_payload["hero_subheadline"],
            Json(hero_payload["sessions"]),
            Json(hero_payload["suggested_questions"]),
            hero_payload["source"],
        )
    )

    conn.commit()
    cur.close()
    conn.close()

    print(f"[HeroService] Successfully refreshed hero schedule for: {event_name} ({circuit_meta['name']}) with {len(sessions)} sessions in IST.")
    return hero_payload

if __name__ == "__main__":
    payload = fetch_and_save_hero_schedule()
    print(json.dumps(payload, indent=2))
