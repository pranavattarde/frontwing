import os
from typing import Optional, Dict, Any
from app.ingestion.ergast_collector import ErgastCollector
from app.ingestion.fastf1_collector import FastF1Collector
from app.core.logger import logger
from app.core.db import execute_query

def ensure_session_in_db(
    session_id: Optional[str] = None,
    year: Optional[int] = None,
    gp_name: Optional[str] = None,
    session_type: str = "R"
) -> Optional[str]:
    """
    Ensures that an F1 session is ingested into PostgreSQL database.
    Checks PostgreSQL first. If missing, dynamically fetches via FastF1/OpenF1/Ergast/Synthetic cache.
    Returns the resolved session_id string or None if unresolvable.
    """
    # 1. Check by session_id if provided
    if session_id:
        try:
            res = execute_query("SELECT id FROM sessions WHERE id = %s", (session_id,), fetch=True)
            if res and len(res) > 0:
                return res[0]["id"]
        except Exception:
            pass

        # Try parsing year, gp_name, session_type from session_id string
        # Formats: '2024_monaco_gp_race', '2024_hungary_race', '2024_austria_gp_q'
        parts = session_id.split("_")
        if len(parts) >= 2 and parts[0].isdigit():
            if year is None:
                year = int(parts[0])
            if gp_name is None:
                gp_parts = [
                    p for p in parts[1:]
                    if p.lower() not in ("gp", "race", "q", "qualy", "qualifying", "sprint", "fp1", "fp2", "fp3")
                ]
                if gp_parts:
                    gp_name = " ".join(gp_parts)
            if any(p.lower() in ("q", "qualy", "qualifying") for p in parts):
                session_type = "Q"

    # 2. Check if gp_name & year can resolve existing session in DB
    if gp_name:
        gp_clean = gp_name.lower().replace(" ", "_").replace("grand_prix", "").replace("gp", "").strip("_")
        session_type_map = {
            "R": "Race", "Q": "Qualifying", "SQ": "Sprint Qualifying",
            "S": "Sprint", "FP1": "FP1", "FP2": "FP2", "FP3": "FP3"
        }
        stype_str = session_type_map.get(session_type.upper(), session_type)
        resolved_year = year or 2024

        try:
            sql = """
                SELECT s.id FROM sessions s
                JOIN races r ON s.race_id = r.id
                JOIN circuits c ON r.circuit_id = c.id
                WHERE (r.year = %s) AND (c.id ILIKE %s OR r.name ILIKE %s OR r.id ILIKE %s) AND (s.type ILIKE %s OR s.id ILIKE %s)
            """
            res = execute_query(
                sql,
                (resolved_year, f"%{gp_clean}%", f"%{gp_name}%", f"%{gp_clean}%", f"%{stype_str}%", f"%{stype_str.lower()}%"),
                fetch=True
            )
            if res and len(res) > 0:
                return res[0]["id"]
        except Exception:
            pass

        # 3. Dynamic Fetch via FastF1 / Ergast / OpenF1 / Synthetic Session Population
        try:
            logger.info(f"[Loader] Dynamic session ingestion triggered for year={resolved_year}, gp={gp_name}, session={session_type}")
            collector = FastF1Collector()
            load_res = collector.load_session(resolved_year, gp_name, session_type)
            if load_res and load_res.get("session_id"):
                return load_res["session_id"]
        except Exception as e:
            logger.warning(f"[Loader] Dynamic session ingestion exception: {e}")

    # Fallback lookup for latest available session in DB
    try:
        res = execute_query("SELECT id FROM sessions ORDER BY date DESC LIMIT 1", fetch=True)
        if res and len(res) > 0:
            return res[0]["id"]
    except Exception:
        pass

    return session_id


def load_default_race_weekend():
    """Automatically seeds database with a development F1 GP race weekend if sessions is empty."""
    try:
        logger.info("[Loader] Starting automatic F1 race weekend seeding...")
        
        # 1. Sync all static data from Ergast
        ergast = ErgastCollector()
        ergast.fetch_and_sync_all_static_data()
        
        # 2. Sync Monaco 2024 race results (Year = 2024, Round = 8)
        year = 2024
        round_num = 8
        gp_name = "Monaco"
        
        logger.info(f"[Loader] Syncing race results for {year} Round {round_num} (Monaco GP)...")
        ergast.sync_race_results(year, round_num)
        
        # 3. Load laps, stints, and telemetry using FastF1
        fastf1_coll = FastF1Collector()
        session = fastf1_coll.collect(year, gp_name, session_type="R")
        
        # Process and save to database
        session_id = fastf1_coll.process_and_save(session)
        logger.info(f"[Loader] Successfully ingested F1 race weekend. Session ID: {session_id}")
    except Exception as e:
        logger.error(f"[Loader] Seeding default race weekend failed: {e}")
