import os
import json
import threading
import time
import re
import numpy as np
import fastf1
from typing import Dict, Any, List, Optional
from datetime import datetime
from pandas import isna as pandas_is_null
from .base import BaseCollector
from ..core.logger import logger
from ..core.db import execute_query

def safe_execute_query(query: str, params: tuple = (), fetch: bool = False) -> Any:
    """Executes database queries safely, falling back gracefully if PostgreSQL is offline."""
    from ..core.db import _db_last_fail, _DB_FAIL_COOLDOWN
    if time.time() - _db_last_fail < _DB_FAIL_COOLDOWN:
        return [] if fetch else None
    try:
        return execute_query(query, params, fetch=fetch)
    except Exception as e:
        logger.error(f"[FastF1Collector] DB query execution failed: {e}", exc_info=True)
        return [] if fetch else None

# Global async backfill registry
_backfill_lock = threading.Lock()
_backfill_jobs: Dict[str, Dict[str, Any]] = {}

def get_backfill_job(session_id: str) -> Optional[Dict[str, Any]]:
    with _backfill_lock:
        job = _backfill_jobs.get(session_id)
        if job and job.get("status") == "in_progress":
            # FIX O: 180s server-side timeout transition
            if time.time() - job.get("started_at", 0) > 180:
                job["status"] = "failed"
                job["stage"] = "Backfill job timed out after 3 minutes."
                job["error"] = "Timeout: FastF1 telemetry ingestion exceeded 180 seconds."
                job["updated_at"] = time.time()
        return job

def start_async_backfill(session_id: str) -> Dict[str, Any]:
    with _backfill_lock:
        job = _backfill_jobs.get(session_id)
        if job:
            if job.get("status") == "in_progress":
                if time.time() - job.get("started_at", 0) > 180:
                    job["status"] = "failed"
                    job["stage"] = "Backfill job timed out after 3 minutes."
                    job["error"] = "Timeout: FastF1 telemetry ingestion exceeded 180 seconds."
                    job["updated_at"] = time.time()
                    return job
                # Attach to existing in-progress job without spawning duplicate thread
                return job
            elif job.get("status") == "completed":
                return job
            elif job.get("status") == "failed":
                if time.time() - job.get("updated_at", 0) < 600:
                    return job
        
        job = {
            "session_id": session_id,
            "status": "in_progress",
            "progress_pct": 5,
            "stage": "Initializing FastF1 backfill...",
            "started_at": time.time(),
            "updated_at": time.time(),
            "error": None
        }
        _backfill_jobs[session_id] = job
        
    def _worker():
        collector = FastF1Collector()
        try:
            def _update_progress(pct: int, stage_desc: str):
                with _backfill_lock:
                    if session_id in _backfill_jobs:
                        _backfill_jobs[session_id]["progress_pct"] = pct
                        _backfill_jobs[session_id]["stage"] = stage_desc
                        _backfill_jobs[session_id]["updated_at"] = time.time()

            success = collector.backfill_telemetry(session_id, progress_callback=_update_progress)
            with _backfill_lock:
                if success:
                    _backfill_jobs[session_id]["status"] = "completed"
                    _backfill_jobs[session_id]["progress_pct"] = 100
                    _backfill_jobs[session_id]["stage"] = "Telemetry backfill complete."
                else:
                    _backfill_jobs[session_id]["status"] = "failed"
                    _backfill_jobs[session_id]["stage"] = "Backfill could not verify telemetry rows."
                    _backfill_jobs[session_id]["error"] = "No telemetry rows in database after backfill."
                _backfill_jobs[session_id]["updated_at"] = time.time()
        except Exception as ex:
            logger.error(f"[FastF1Collector] Background backfill failed for {session_id}: {ex}", exc_info=True)
            with _backfill_lock:
                _backfill_jobs[session_id]["status"] = "failed"
                _backfill_jobs[session_id]["stage"] = f"Backfill failed: {ex}"
                _backfill_jobs[session_id]["error"] = str(ex)
                _backfill_jobs[session_id]["updated_at"] = time.time()

    t = threading.Thread(target=_worker, daemon=True)
    t.start()
    return job

class FastF1Collector(BaseCollector):
    _ingested_sessions_cache = set()

    def __init__(self, cache_dir: Optional[str] = None):
        super().__init__("FastF1Collector")
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        if not cache_dir or cache_dir == "ai_services/cache":
            self.cache_dir = os.path.join(base_dir, "cache")
        else:
            self.cache_dir = cache_dir
        os.makedirs(self.cache_dir, exist_ok=True)
        os.makedirs(os.path.join(self.cache_dir, "telemetry"), exist_ok=True)
        
        # Enable FastF1 caching to reduce API hits
        try:
            fastf1.Cache.enable_cache(self.cache_dir)
        except Exception as e:
            logger.warning(f"[{self.name}] FastF1 cache initialization warning: {e}")

    def find_existing_session_id(self, year: int, gp_name: str, session_type: str) -> Optional[str]:
        """Checks memory cache and PostgreSQL to see if session data is already loaded."""
        session_type_map = {
            "R": "Race", "Q": "Qualifying", "SQ": "Sprint Qualifying",
            "S": "Sprint", "FP1": "FP1", "FP2": "FP2", "FP3": "FP3"
        }
        type_str = session_type_map.get(session_type.upper(), session_type)
        gp_clean = gp_name.lower().replace(" ", "_").replace("grand_prix", "").replace("gp", "").strip("_")
        
        candidates = [
            f"{year}_{gp_clean}_gp_{type_str.lower()}",
            f"{year}_{gp_clean}_race",
            f"{year}_{gp_clean}_q"
        ]

        # 1. Check in-memory session cache
        for cid in candidates:
            if cid in FastF1Collector._ingested_sessions_cache:
                return cid

        # 2. Check PostgreSQL database tables
        for cid in candidates:
            res = safe_execute_query("SELECT id FROM sessions WHERE id = %s", (cid,), fetch=True)
            if res and isinstance(res, list) and len(res) > 0:
                FastF1Collector._ingested_sessions_cache.add(res[0]["id"])
                return res[0]["id"]

        res = safe_execute_query(
            """
            SELECT s.id FROM sessions s
            JOIN races r ON s.race_id = r.id
            WHERE r.year = %s AND (r.name ILIKE %s OR r.id ILIKE %s) AND (s.type ILIKE %s OR s.id ILIKE %s)
            """,
            (year, f"%{gp_name}%", f"%{gp_clean}%", f"%{type_str}%", f"%{type_str.lower()}%"),
            fetch=True
        )
        if res and isinstance(res, list) and len(res) > 0:
            FastF1Collector._ingested_sessions_cache.add(res[0]["id"])
            return res[0]["id"]
            
        return None

    def _verify_event_matches_query(self, session: fastf1.core.Session, gp_name: str) -> bool:
        """Verifies FastF1's fuzzy search didn't correct gp_name to an unrelated event."""
        if not hasattr(session, 'event') or session.event is None:
            return False
        ev = session.event
        ev_text = f"{ev.get('EventName', '')} {ev.get('Location', '')} {ev.get('Country', '')}".lower()
        clean_q = re.sub(r"\b(grand prix|gp|race)\b", "", gp_name, flags=re.IGNORECASE).strip().lower()
        if any(w in clean_q for w in ["imola", "emilia", "romagna"]):
            return any(w in ev_text for w in ["imola", "emilia", "romagna"])
        if "austria" in clean_q or "spielberg" in clean_q:
            return ("austria" in ev_text or "spielberg" in ev_text) and "australia" not in ev_text
        if "australia" in clean_q or "melbourne" in clean_q:
            return "australia" in ev_text or "melbourne" in ev_text
        tokens = [t for t in clean_q.split() if len(t) >= 4]
        if not tokens:
            return True
        return any(t in ev_text for t in tokens)

    def load_session(
        self,
        year: int,
        gp_name: str,
        session_type: str = "R",
        load_telemetry: bool = False,
        force_telemetry: bool = False,
        progress_callback = None
    ) -> Dict[str, Any]:
        """Loads an F1 session on demand, checking cache first to avoid downloading twice.
        If load_telemetry=False, ingests laps/stints/results/weather fast without heavy telemetry traces.
        If force_telemetry=True and session exists without telemetry, downloads and backfills telemetry.
        """
        existing_id = self.find_existing_session_id(year, gp_name, session_type)
        if existing_id:
            if force_telemetry:
                drv_telem_cnt = safe_execute_query(
                    "SELECT COUNT(DISTINCT driver_id) as drv_cnt, COUNT(*) as cnt FROM telemetry_metadata WHERE session_id = %s",
                    (existing_id,),
                    fetch=True
                )
                drv_cnt = drv_telem_cnt[0]["drv_cnt"] if drv_telem_cnt else 0
                tot_cnt = drv_telem_cnt[0]["cnt"] if drv_telem_cnt else 0
                if drv_cnt >= 15 and tot_cnt >= 100:
                    logger.info(f"[{self.name}] Session {existing_id} already has complete telemetry ({tot_cnt} rows across {drv_cnt} drivers).")
                    return {
                        "status": "cached",
                        "session_id": existing_id,
                        "message": "Session and telemetry already exist in PostgreSQL database."
                    }
                logger.info(f"[{self.name}] Session {existing_id} exists in DB but lacks complete telemetry ({tot_cnt} rows across {drv_cnt} drivers). Upgrading/backfilling telemetry (telemetry=True)...")
            else:
                logger.info(f"[{self.name}] Session {year} {gp_name} ({session_type}) already exists in DB: {existing_id}")
                return {
                    "status": "cached",
                    "session_id": existing_id,
                    "message": "Session data already exists in PostgreSQL database."
                }

        should_fetch_telem = bool(load_telemetry or force_telemetry)
        try:
            if progress_callback:
                progress_callback(30, f"Downloading {year} {gp_name} data package from FastF1...")
            session = self.collect(year, gp_name, session_type, load_telemetry=should_fetch_telem)

            # Verify that FastF1 did not fuzzy-match to a completely unrelated event
            if not self._verify_event_matches_query(session, gp_name):
                matched_name = getattr(session.event, 'EventName', '') if hasattr(session, 'event') else ''
                logger.warning(f"[{self.name}] FastF1 fuzzy matched '{gp_name}' to unrelated event '{matched_name}'. Rejecting as not found for year {year}.")
                return {
                    "status": "error",
                    "session_id": None,
                    "message": f"Event '{gp_name}' not found on the {year} F1 calendar."
                }

            # Verify that session actually has classification results (not a future uncompleted race)
            if session_type in ("R", "Race") and (not hasattr(session, 'results') or session.results is None or len(session.results) == 0):
                logger.warning(f"[{self.name}] Session {year} {gp_name} ({session_type}) has 0 classified drivers (future or uncompleted session).")
                return {
                    "status": "error",
                    "session_id": None,
                    "message": f"Session {year} {gp_name} has no race results available yet."
                }

            if not self.validate(session):
                return {
                    "status": "error",
                    "session_id": None,
                    "message": f"FastF1 session validation failed for {year} {gp_name} ({session_type}): session has no laps."
                }
            if progress_callback:
                progress_callback(45, "Session package downloaded. Ingesting timing matrices into database...")
            session_id = self.process_and_save(session, load_telemetry=should_fetch_telem, progress_callback=progress_callback)
            FastF1Collector._ingested_sessions_cache.add(session_id)
            return {
                "status": "loaded",
                "session_id": session_id,
                "message": f"Session data successfully fetched from FastF1 and ingested into PostgreSQL (telemetry={should_fetch_telem})."
            }
        except Exception as e:
            logger.error(
                f"[{self.name}] FastF1 fetch/load FAILED for {year} {gp_name} ({session_type}): {e}. "
                f"No synthetic fallback will be used — returning explicit error status.",
                exc_info=True
            )
            return {
                "status": "error",
                "session_id": None,
                "message": f"FastF1 ingestion failed for {year} {gp_name} ({session_type}): {e}"
            }

    def backfill_telemetry(self, session_id: str, progress_callback=None) -> bool:
        """Backfills telemetry metadata and JSON cache for an existing session that lacks telemetry."""
        logger.info(f"[{self.name}] Backfilling telemetry for session: {session_id}")
        if progress_callback:
            progress_callback(10, "Querying session metadata from database...")
            
        sess_meta = safe_execute_query(
            """
            SELECT r.year, r.name as gp_name, s.type as session_type, c.name as circuit_name
            FROM sessions s
            JOIN races r ON s.race_id = r.id
            LEFT JOIN circuits c ON r.circuit_id = c.id
            WHERE s.id = %s
            """,
            (session_id,),
            fetch=True
        )
        if sess_meta and len(sess_meta) > 0:
            year = int(sess_meta[0]["year"])
            gp_name = str(sess_meta[0]["gp_name"])
            stype = str(sess_meta[0].get("session_type") or "Race")
        else:
            # Fallback parse from session_id
            m = re.match(r"^(\d{4})_([a-z0-9_]+?)_gp_(race|qualifying|fp\d|sprint)$", session_id.lower())
            if m:
                year = int(m.group(1))
                gp_name = m.group(2).replace("_", " ")
                stype_map = {"race": "Race", "qualifying": "Qualifying", "sprint": "Sprint"}
                stype = stype_map.get(m.group(3), "Race")
            else:
                logger.error(f"[{self.name}] Cannot determine session metadata to backfill telemetry for {session_id}")
                return False

        if progress_callback:
            progress_callback(20, f"Connecting to FastF1 timing servers for {year} {gp_name}...")

        res = self.load_session(year, gp_name, session_type=stype, load_telemetry=True, force_telemetry=True, progress_callback=progress_callback)
        if res.get("status") in ("loaded", "cached"):
            cnt_chk = safe_execute_query(
                "SELECT COUNT(*) as cnt FROM telemetry_metadata WHERE session_id = %s",
                (session_id,),
                fetch=True
            )
            return bool(cnt_chk and cnt_chk[0]["cnt"] > 0)
        return False

    def collect(self, year: int, gp_name: str, session_type: str = "R", load_telemetry: bool = False) -> fastf1.core.Session:
        """Downloads and loads an F1 session data package. Telemetry is only loaded if load_telemetry=True."""
        logger.info(f"[{self.name}] Fetching session {year} {gp_name} - {session_type} from FastF1 (telemetry={load_telemetry}, weather=True)")
        session = fastf1.get_session(year, gp_name, session_type)
        session.load(telemetry=load_telemetry, laps=True, weather=True)
        return session

    def validate(self, session: fastf1.core.Session) -> bool:
        """Validates loaded FastF1 session structure completeness."""
        if session is None or session.laps is None or len(session.laps) == 0:
            return False
        return True

    def process_and_save(self, session: fastf1.core.Session, load_telemetry: bool = False, progress_callback=None) -> str:
        """Extracts sessions, drivers, laps, stints, weather, race_results, and optionally telemetry_metadata into PostgreSQL."""
        from app.core.session_resolver import get_current_f1_season
        default_yr = get_current_f1_season()
        year = int(session.event.get('Season', getattr(session.event, 'year', default_yr))) if hasattr(session.event, 'get') else int(getattr(session.event, 'year', default_yr))
        round_num = int(session.event.get('RoundNumber', getattr(session.event, 'round', 1))) if hasattr(session.event, 'get') else int(getattr(session.event, 'round', 1))
        
        session_type_map = {
            "R": "Race", "Q": "Qualifying", "SQ": "Sprint Qualifying",
            "S": "Sprint", "FP1": "FP1", "FP2": "FP2", "FP3": "FP3"
        }
        type_str = session_type_map.get(session.name, session.name)

        circuit_id = session.event['Location'].lower().replace(' ', '_')
        event_name = str(session.event['EventName'])
        existing_race = safe_execute_query(
            "SELECT id FROM races WHERE year = %s AND (circuit_id ILIKE %s OR name ILIKE %s)",
            (year, f"%{circuit_id}%", f"%{event_name}%"),
            fetch=True
        )
        if existing_race and isinstance(existing_race, list) and len(existing_race) > 0:
            race_id = existing_race[0]["id"]
        else:
            event_clean = event_name.lower().replace(" ", "_").replace("grand_prix", "").replace("gp", "").strip("_")
            race_id = f"{year}_{event_clean}_gp"
        exists_circ = safe_execute_query("SELECT id FROM circuits WHERE id = %s", (circuit_id,), fetch=True)
        if not exists_circ:
            name_match = safe_execute_query("SELECT id FROM circuits WHERE name ILIKE %s OR location ILIKE %s", (f"%{session.event['Location']}%", f"%{session.event['Location']}%"), fetch=True)
            if name_match:
                circuit_id = name_match[0]["id"]
            else:
                safe_execute_query(
                    "INSERT INTO circuits (id, name, location, country) VALUES (%s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                    (circuit_id, session.event['EventName'], session.event['Location'], "Unknown")
                )

        # Confirm race is registered in DB
        safe_execute_query(
            """
            INSERT INTO races (id, year, round, name, circuit_id, date)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, date = EXCLUDED.date
            """,
            (race_id, year, round_num, event_name, circuit_id, session.date.strftime('%Y-%m-%d'))
        )

        existing_sess = safe_execute_query(
            "SELECT id FROM sessions WHERE race_id = %s AND type = %s",
            (race_id, type_str),
            fetch=True
        )
        if existing_sess and isinstance(existing_sess, list) and len(existing_sess) > 0:
            session_id = existing_sess[0]["id"]
        else:
            session_id = f"{race_id}_{type_str.lower().replace(' ', '_')}"

        # Confirm session is registered in DB (1. sessions table)
        safe_execute_query(
            """
            INSERT INTO sessions (id, race_id, type, date, status)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET status = 'completed'
            """,
            (session_id, race_id, type_str, session.date.strftime('%Y-%m-%d'), "completed")
        )

        # 2. Process drivers & constructors & race_results (2. drivers & 6. race_results tables)
        if hasattr(session, 'results') and session.results is not None and len(session.results) > 0:
            for _, r_row in session.results.iterrows():
                try:
                    code = str(r_row.get('Abbreviation', r_row.get('AbbreviatedName', r_row.get('DriverNumber', ''))))
                    drv_id = str(r_row.get('DriverId', '')).lower()
                    if not drv_id or drv_id == 'nan':
                        drv_id = str(r_row.get('LastName', code)).lower()
                    
                    team_name = str(r_row.get('TeamName', 'Unknown Team'))
                    constructor_id = team_name.lower().replace(' ', '_')
                    
                    safe_execute_query(
                        "INSERT INTO constructors (id, name) VALUES (%s, %s) ON CONFLICT (id) DO NOTHING",
                        (constructor_id, team_name)
                    )
                    
                    first_name = str(r_row.get('FirstName', 'Driver'))
                    last_name = str(r_row.get('LastName', code))
                    drv_num = int(r_row['DriverNumber']) if not pandas_is_null(r_row['DriverNumber']) else None
                    country = str(r_row.get('CountryCode', ''))
                    
                    safe_execute_query(
                        """
                        INSERT INTO drivers (id, constructor_id, first_name, last_name, code, driver_number, nationality)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            constructor_id = EXCLUDED.constructor_id,
                            code = EXCLUDED.code,
                            driver_number = EXCLUDED.driver_number
                        """,
                        (drv_id, constructor_id, first_name, last_name, code, drv_num, country)
                    )

                    grid_pos = int(r_row['GridPosition']) if not pandas_is_null(r_row['GridPosition']) else None
                    pos = int(r_row['Position']) if not pandas_is_null(r_row['Position']) else None
                    pts = float(r_row['Points']) if not pandas_is_null(r_row['Points']) else 0.0
                    status_str = str(r_row.get('Status', 'Finished'))
                    
                    safe_execute_query(
                        """
                        INSERT INTO race_results (session_id, driver_id, constructor_id, grid_position, position, points, status)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (session_id, driver_id) DO UPDATE SET
                            position = EXCLUDED.position,
                            points = EXCLUDED.points,
                            status = EXCLUDED.status
                        """,
                        (session_id, drv_id, constructor_id, grid_pos, pos, pts, status_str)
                    )
                except Exception as r_ex:
                    logger.warning(f"Failed to insert race result row: {r_ex}")

        # 3. Process weather data (5. weather table)
        if hasattr(session, 'weather_data') and session.weather_data is not None and len(session.weather_data) > 0:
            for _, w_row in session.weather_data.iterrows():
                try:
                    w_time = session.date + w_row['Time'] if hasattr(session, 'date') and session.date is not None else None
                    if w_time is None:
                        continue
                    air_temp = float(w_row['AirTemp']) if not pandas_is_null(w_row['AirTemp']) else None
                    track_temp = float(w_row['TrackTemp']) if not pandas_is_null(w_row['TrackTemp']) else None
                    humidity = float(w_row['Humidity']) if not pandas_is_null(w_row['Humidity']) else None
                    rainfall = bool(w_row['Rainfall']) if not pandas_is_null(w_row['Rainfall']) else False
                    wind_dir = int(w_row['WindDirection']) if not pandas_is_null(w_row['WindDirection']) else None
                    wind_speed = float(w_row['WindSpeed']) if not pandas_is_null(w_row['WindSpeed']) else None

                    safe_execute_query(
                        """
                        INSERT INTO weather (session_id, timestamp, air_temperature, track_temperature, humidity, rainfall, wind_direction, wind_speed)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (session_id, timestamp) DO NOTHING
                        """,
                        (session_id, w_time.strftime('%Y-%m-%d %H:%M:%S'), air_temp, track_temp, humidity, rainfall, wind_dir, wind_speed)
                    )
                except Exception as w_ex:
                    logger.warning(f"Failed to insert weather row: {w_ex}")

        # 4. Process driver laps, stints & telemetry (3. laps, 4. stints, 7. telemetry_metadata)
        laps_df = session.laps
        drivers_list = list(laps_df['Driver'].unique())
        failed_telemetry_laps = []  # Track laps where telemetry persistence failed

        logger.info(f"[{self.name}] Processing laps for drivers: {drivers_list}")
        for idx_drv, drv_code in enumerate(drivers_list):
            if progress_callback and load_telemetry:
                drv_pct = 50 + int(45 * (idx_drv + 1) / max(1, len(drivers_list)))
                progress_callback(drv_pct, f"Extracting telemetry traces for driver {drv_code} ({idx_drv+1}/{len(drivers_list)})...")

            drv_rows = safe_execute_query("SELECT id FROM drivers WHERE code = %s", (drv_code,), fetch=True)
            drv_id = drv_rows[0]['id'] if (drv_rows and isinstance(drv_rows, list)) else drv_code.lower()
            
            exists_drv = safe_execute_query("SELECT id FROM drivers WHERE id = %s", (drv_id,), fetch=True)
            if not exists_drv:
                safe_execute_query(
                    "INSERT INTO drivers (id, first_name, last_name, code) VALUES (%s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                    (drv_id, drv_code, "Driver", drv_code)
                )

            drv_laps = laps_df.pick_driver(drv_code)
            stints_groups = drv_laps.groupby('Stint')

            for stint_num, stint_df in stints_groups:
                stint_num = int(stint_num)
                compound = str(stint_df['Compound'].iloc[0]).upper()
                start_lap = int(stint_df['LapNumber'].min())
                end_lap = int(stint_df['LapNumber'].max())
                stint_len = end_lap - start_lap + 1

                safe_execute_query(
                    """
                    INSERT INTO stints (session_id, driver_id, stint_number, compound, start_lap, end_lap, stint_length, is_new)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (session_id, driver_id, stint_number) DO UPDATE SET
                        end_lap = EXCLUDED.end_lap,
                        stint_length = EXCLUDED.stint_length
                    """,
                    (session_id, drv_id, stint_num, compound, start_lap, end_lap, stint_len, True)
                )

            # Determine fastest lap number for this driver to guarantee its telemetry is stored
            fastest_lap_num = None
            try:
                fl = drv_laps.pick_fastest()
                if fl is not None and 'LapNumber' in fl and not pandas_is_null(fl['LapNumber']):
                    fastest_lap_num = int(fl['LapNumber'])
            except Exception:
                fastest_lap_num = None

            # 1. Persist ALL laps for this driver into PostgreSQL laps table (NEVER downsample the relational laps table)
            for _, lap_row in drv_laps.iterrows():
                lap_num = int(lap_row['LapNumber'])
                lap_time_ms = int(lap_row['LapTime'].total_seconds() * 1000) if not pandas_is_null(lap_row['LapTime']) else None
                s1_ms = int(lap_row['Sector1Time'].total_seconds() * 1000) if not pandas_is_null(lap_row['Sector1Time']) else None
                s2_ms = int(lap_row['Sector2Time'].total_seconds() * 1000) if not pandas_is_null(lap_row['Sector2Time']) else None
                s3_ms = int(lap_row['Sector3Time'].total_seconds() * 1000) if not pandas_is_null(lap_row['Sector3Time']) else None
                
                compound = str(lap_row.get('Compound', 'UNKNOWN')).upper() if not pandas_is_null(lap_row.get('Compound')) else 'UNKNOWN'
                is_pit_out = bool(lap_row.get('PitOutTime')) if 'PitOutTime' in lap_row and not pandas_is_null(lap_row.get('PitOutTime')) else False
                is_valid = bool(lap_row.get('IsValid', True)) if 'IsValid' in lap_row and not pandas_is_null(lap_row.get('IsValid')) else True

                safe_execute_query(
                    """
                    INSERT INTO laps (session_id, driver_id, lap_number, lap_time_ms, sector_1_ms, sector_2_ms, sector_3_ms, compound, is_pit_out_lap, is_valid)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (session_id, driver_id, lap_number) DO UPDATE SET
                        lap_time_ms = EXCLUDED.lap_time_ms,
                        sector_1_ms = EXCLUDED.sector_1_ms,
                        sector_2_ms = EXCLUDED.sector_2_ms,
                        sector_3_ms = EXCLUDED.sector_3_ms,
                        compound = EXCLUDED.compound,
                        is_pit_out_lap = EXCLUDED.is_pit_out_lap,
                        is_valid = EXCLUDED.is_valid
                    """,
                    (session_id, drv_id, lap_num, lap_time_ms, s1_ms, s2_ms, s3_ms, compound, is_pit_out, is_valid)
                )

            # 2. Persist telemetry profiles into PostgreSQL telemetry_metadata and JSON cache only if load_telemetry is True
            if load_telemetry:
                # Determine fastest lap number for this driver to guarantee its telemetry is stored
                fastest_lap_num = None
                try:
                    fl = drv_laps.pick_fastest()
                    if fl is not None and 'LapNumber' in fl and not pandas_is_null(fl['LapNumber']):
                        fastest_lap_num = int(fl['LapNumber'])
                except Exception:
                    fastest_lap_num = None

                # Downsampled telemetry selection (every 3rd lap + guaranteed personal fastest lap)
                laps_to_telem = list(drv_laps.iloc[::3].iterrows())
                if fastest_lap_num is not None:
                    already_in = any(int(r['LapNumber']) == fastest_lap_num for _, r in laps_to_telem)
                    if not already_in:
                        fl_rows = drv_laps[drv_laps['LapNumber'] == fastest_lap_num]
                        if len(fl_rows) > 0:
                            laps_to_telem.append((fl_rows.index[0], fl_rows.iloc[0]))

                for _, lap_row in laps_to_telem:
                    lap_num = int(lap_row['LapNumber'])
                    try:
                        telemetry_df = lap_row.get_telemetry()
                        if telemetry_df is not None and len(telemetry_df) > 0:
                            self._downsample_and_save_telemetry(session_id, drv_id, lap_num, telemetry_df)
                    except Exception as ex:
                        logger.error(
                            f"[{self.name}] ERROR persisting telemetry for driver {drv_code} lap {lap_num} "
                            f"in session {session_id}: {ex}",
                            exc_info=True
                        )
                        failed_telemetry_laps.append((drv_code, lap_num))

        if load_telemetry:
            if failed_telemetry_laps:
                logger.error(
                    f"[{self.name}] Telemetry persist FAILED for {len(failed_telemetry_laps)} lap(s) in session {session_id}: {failed_telemetry_laps}"
                )
            else:
                logger.info(f"[{self.name}] All telemetry persisted successfully for session {session_id}")
        else:
            logger.info(f"[{self.name}] Fast session ingestion completed without telemetry for session {session_id}")

        return session_id

    def _downsample_and_save_telemetry(self, session_id: str, driver_id: str, lap_number: int, df):
        """Downsamples telemetry data to 50 significant points and caches JSON."""
        distances = df['Distance'].values if 'Distance' in df else np.linspace(0, 5800, len(df))
        speeds = df['Speed'].values if 'Speed' in df else np.zeros(len(df))
        rpms = df['RPM'].values if 'RPM' in df else np.zeros(len(df))
        
        gear_col = None
        for g_cand in ['nGear', 'Gear', 'gear', 'n_gear']:
            if g_cand in df and not df[g_cand].isna().all():
                gear_col = g_cand
                break
        gears = df[gear_col].values if gear_col else None
        throttles = df['Throttle'].values if 'Throttle' in df else np.zeros(len(df))
        brakes = df['Brake'].values.astype(bool) if 'Brake' in df else np.zeros(len(df), dtype=bool)
        
        total_points = len(df)
        bucket_size = max(1, total_points // 50)
        
        downsampled = []
        for i in range(0, total_points, bucket_size):
            chunk_dist = distances[i : i + bucket_size]
            chunk_speed = speeds[i : i + bucket_size]
            chunk_rpm = rpms[i : i + bucket_size]
            chunk_gear = gears[i : i + bucket_size] if gears is not None else None
            chunk_throttle = throttles[i : i + bucket_size]
            chunk_brake = brakes[i : i + bucket_size]
            
            s_val = int(np.mean(chunk_speed)) if len(chunk_speed) > 0 else 0
            
            # Extract real gear - NEVER fabricate from speed
            if chunk_gear is not None and len(chunk_gear) > 0:
                valid_gears = [int(round(g)) for g in chunk_gear if not np.isnan(g)]
                g_calc = int(np.round(np.mean(valid_gears))) if valid_gears else 0
            else:
                g_calc = 0
            
            downsampled.append({
                "distanceM": round(float(np.mean(chunk_dist)), 1) if len(chunk_dist) > 0 else 0.0,
                "speed": s_val,
                "rpm": int(np.mean(chunk_rpm)) if len(chunk_rpm) > 0 else 0,
                "gear": g_calc,
                "throttle": int(np.mean(chunk_throttle)) if len(chunk_throttle) > 0 else 0,
                "brake": bool(np.any(chunk_brake)) if len(chunk_brake) > 0 else False
            })

        storage_filename = f"{session_id}_{driver_id}_{lap_number}.json"
        storage_path = os.path.join(self.cache_dir, "telemetry", storage_filename)
        
        with open(storage_path, "w") as f:
            json.dump(downsampled, f)

        redis_key = f"telemetry:cache:{session_id}:{driver_id}:{lap_number}"
        safe_execute_query(
            """
            INSERT INTO telemetry_metadata (session_id, driver_id, lap_number, data_points_count, storage_path, redis_cache_key)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (session_id, driver_id, lap_number) DO UPDATE SET
                data_points_count = EXCLUDED.data_points_count,
                storage_path = EXCLUDED.storage_path
            """,
            (session_id, driver_id, lap_number, len(downsampled), storage_path, redis_key)
        )


def pandas_is_null(val):
    """Utility handling checking pandas NaN/NaT elements."""
    import pandas as pd
    return pd.isnull(val)
