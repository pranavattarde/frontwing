import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, List, Optional
from .base import BaseCollector
from ..core.logger import logger
from ..core.db import execute_query, redis_client

# Known OpenF1 driver number mappings for fast zero-latency lookup
KNOWN_DRIVER_NUMBERS = {
    "verstappen": 1, "max_verstappen": 1, "ver": 1,
    "norris": 4, "nor": 4,
    "leclerc": 16, "lec": 16,
    "hamilton": 44, "ham": 44,
    "piastri": 81, "pia": 81,
    "russell": 63, "rus": 63,
    "sainz": 55, "sai": 55,
    "perez": 11, "per": 11,
    "alonso": 14, "alo": 14,
    "stroll": 18, "str": 18,
    "gasly": 10, "gas": 10,
    "ocon": 31, "oco": 31,
    "albon": 23, "alb": 23,
    "tsunoda": 22, "tsu": 22,
    "ricciardo": 3, "ric": 3,
    "hulkenberg": 27, "hul": 27,
    "magnussen": 20, "mag": 20,
    "bottas": 77, "bot": 77,
    "zhou": 24, "zho": 24,
    "sargeant": 2, "sar": 2,
    "bearman": 38, "bea": 38,
    "colapinto": 43, "col": 43,
    "lawson": 30, "law": 30,
    "antonelli": 12, "ant": 12
}

# OpenF1 circuit mapping table: maps FrontWing session tokens to OpenF1 circuit/country names
OPENF1_CIRCUIT_MAP = {
    "dutch": "Zandvoort",
    "zandvoort": "Zandvoort",
    "netherlands": "Zandvoort",
    "british": "Silverstone",
    "silverstone": "Silverstone",
    "great britain": "Silverstone",
    "monaco": "Monaco",
    "monte carlo": "Monaco",
    "qatar": "Lusail",
    "lusail": "Lusail",
    "italian": "Monza",
    "monza": "Monza",
    "italy": "Monza",
    "austrian": "Spielberg",
    "austria": "Spielberg",
    "spielberg": "Spielberg",
    "belgian": "Spa-Francorchamps",
    "spa": "Spa-Francorchamps",
    "belgium": "Spa-Francorchamps",
    "hungarian": "Hungaroring",
    "hungary": "Hungaroring",
    "budapest": "Hungaroring",
    "spanish": "Catalunya",
    "spain": "Catalunya",
    "barcelona": "Catalunya",
    "canadian": "Montreal",
    "canada": "Montreal",
    "montreal": "Montreal",
    "japanese": "Suzuka",
    "japan": "Suzuka",
    "suzuka": "Suzuka",
    "singapore": "Marina Bay",
    "marina bay": "Marina Bay",
    "azerbaijan": "Baku",
    "baku": "Baku",
    "bahrain": "Sakhir",
    "sakhir": "Sakhir",
    "saudi": "Jeddah",
    "saudi arabian": "Jeddah",
    "jeddah": "Jeddah",
    "australian": "Melbourne",
    "australia": "Melbourne",
    "melbourne": "Melbourne",
    "miami": "Miami",
    "las vegas": "Las Vegas",
    "las_vegas": "Las Vegas",
    "austin": "Austin",
    "united states": "Austin",
    "cota": "Austin",
    "mexico": "Mexico City",
    "mexican": "Mexico City",
    "brazil": "Interlagos",
    "brazilian": "Interlagos",
    "são paulo": "Interlagos",
    "sao paulo": "Interlagos",
    "interlagos": "Interlagos",
    "abu dhabi": "Yas Marina",
    "abu_dhabi": "Yas Marina",
    "yas marina": "Yas Marina",
    "emilia romagna": "Imola",
    "emilia_romagna": "Imola",
    "imola": "Imola",
    "chinese": "Shanghai",
    "china": "Shanghai",
    "shanghai": "Shanghai"
}

# Known session keys directory for fallback when OpenF1 API is restricted (e.g. live session lock or downtime)
BUILTIN_SESSION_KEYS = {
    (2024, "zandvoort"): 9599,
    (2024, "dutch"): 9599,
    (2024, "silverstone"): 9558,
    (2024, "british"): 9558,
    (2024, "monaco"): 9516,
    (2024, "monza"): 9605,
    (2024, "italian"): 9605,
    (2024, "lusail"): 9642,
    (2024, "qatar"): 9642,
    (2023, "monaco"): 9087,
    (2023, "silverstone"): 9165,
    (2023, "british"): 9165,
}

class OpenF1Collector(BaseCollector):
    def __init__(self, base_url: str = "https://api.openf1.org/v1"):
        super().__init__("OpenF1Collector")
        self.base_url = base_url
        self.cache_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "cache", "openf1")
        )
        os.makedirs(self.cache_dir, exist_ok=True)
        self._memory_session_cache: Dict[str, Any] = {}

    def collect(self, endpoint: str, params: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Queries OpenF1 REST endpoint for F1 timing telemetry datasets."""
        url = f"{self.base_url}/{endpoint}"
        logger.info(f"[{self.name}] Querying OpenF1 data at: {url} with params {params}")
        
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        return response.json()

    def validate(self, data: List[Dict[str, Any]]) -> bool:
        """Validates that OpenF1 response is a list structure."""
        return isinstance(data, list)

    def process_and_save(self, data: List[Dict[str, Any]]) -> None:
        """Abstract implementation; target specific endpoints in sub-methods."""
        pass

    def get_driver_number(self, driver_id: str) -> Optional[int]:
        """Resolves a driver's permanent competition number using memory map or PostgreSQL."""
        if not driver_id:
            return None
        d_clean = str(driver_id).lower().strip()
        if d_clean in KNOWN_DRIVER_NUMBERS:
            return KNOWN_DRIVER_NUMBERS[d_clean]
        
        # Query database
        try:
            row = execute_query(
                "SELECT driver_number FROM drivers WHERE id = %s OR code ILIKE %s OR last_name ILIKE %s LIMIT 1",
                (d_clean, d_clean, f"%{d_clean}%"),
                fetch=True
            )
            if row and row[0].get("driver_number"):
                num = int(row[0]["driver_number"])
                KNOWN_DRIVER_NUMBERS[d_clean] = num
                return num
        except Exception as ex:
            logger.warning(f"[{self.name}] Failed to resolve driver_number for {driver_id}: {ex}")
        return None

    def get_session_key(self, year: int, circuit: str, session_type: str = "Race") -> Optional[int]:
        """
        Resolves OpenF1's numeric session_key for a given year + circuit name.
        Returns None if year < 2023 (OpenF1 only covers 2023+) or if session is unresolvable.
        """
        if year < 2023:
            logger.info(f"[{self.name}] Year {year} is pre-2023; OpenF1 coverage begins in 2023")
            return None

        circuit_clean = str(circuit).lower().replace("_", " ").strip()
        matched_circuit = OPENF1_CIRCUIT_MAP.get(circuit_clean, circuit_clean)

        # 1. Check memory cache
        cache_key = f"{year}_{matched_circuit.lower()}_{session_type.lower()}"
        if cache_key in self._memory_session_cache:
            return self._memory_session_cache[cache_key]

        # 2. Check disk cache
        cache_file = os.path.join(self.cache_dir, f"sessions_{year}.json")
        sessions_list = []
        if os.path.exists(cache_file):
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    sessions_list = json.load(f)
            except Exception as e:
                logger.warning(f"[{self.name}] Failed reading session cache {cache_file}: {e}")

        # 3. If not in disk cache, attempt live API query
        if not sessions_list:
            try:
                sessions_list = self.collect("sessions", params={"year": year, "session_name": session_type})
                if self.validate(sessions_list) and sessions_list:
                    with open(cache_file, "w", encoding="utf-8") as f:
                        json.dump(sessions_list, f, indent=2)
            except Exception as e:
                logger.info(f"[{self.name}] Live OpenF1 session query failed or restricted: {e}")

        # Search sessions list
        for s in sessions_list:
            s_name = str(s.get("session_name", "")).lower()
            if session_type.lower() not in s_name:
                continue
            c_short = str(s.get("circuit_short_name", "")).lower()
            country = str(s.get("country_name", "")).lower()
            location = str(s.get("location", "")).lower()

            target = matched_circuit.lower()
            if target in c_short or target in country or target in location or c_short in target:
                s_key = int(s["session_key"])
                self._memory_session_cache[cache_key] = s_key
                return s_key

        # 4. Fallback to built-in directory
        for (y, c_tag), key in BUILTIN_SESSION_KEYS.items():
            if y == year and (c_tag in circuit_clean or circuit_clean in c_tag):
                self._memory_session_cache[cache_key] = key
                return key

        return None

    def get_pit_stops(
        self,
        session_id: Optional[str] = None,
        session_key: Optional[int] = None,
        driver_id: Optional[str] = None,
        driver_number: Optional[int] = None
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Fetches pit stop records from OpenF1 /pit endpoint for a session, optionally filtered by driver.
        Returns None if session cannot be matched, if pre-2023, or if OpenF1 is unavailable.
        """
        # Resolve session_key if needed
        if session_key is None and session_id:
            parts = session_id.split("_")
            try:
                yr = int(parts[0])
            except ValueError:
                return None
            if yr < 2023:
                return None
            circuit = parts[1] if len(parts) > 1 else ""
            session_key = self.get_session_key(yr, circuit)

        if session_key is None:
            return None

        # Resolve driver_number if needed
        if driver_number is None and driver_id:
            driver_number = self.get_driver_number(driver_id)

        # 1. Check disk cache for this session's pit data
        pit_cache_file = os.path.join(self.cache_dir, f"pit_{session_key}.json")
        pit_records: List[Dict[str, Any]] = []
        if os.path.exists(pit_cache_file):
            try:
                with open(pit_cache_file, "r", encoding="utf-8") as f:
                    pit_records = json.load(f)
            except Exception as e:
                logger.warning(f"[{self.name}] Failed to read pit cache {pit_cache_file}: {e}")

        # 2. If not cached, attempt live query
        if not pit_records:
            try:
                pit_records = self.collect("pit", params={"session_key": session_key})
                if self.validate(pit_records) and pit_records:
                    with open(pit_cache_file, "w", encoding="utf-8") as f:
                        json.dump(pit_records, f, indent=2)
            except Exception as e:
                logger.info(f"[{self.name}] OpenF1 /pit live query unavailable: {e}")
                return None

        if not pit_records:
            return None

        # Filter by driver_number if requested
        if driver_number is not None:
            driver_pits = [p for p in pit_records if int(p.get("driver_number", -1)) == driver_number]
        else:
            driver_pits = pit_records

        # Sort by lap_number ascending
        driver_pits.sort(key=lambda x: int(x.get("lap_number", 0)))
        return driver_pits

    def get_stints(
        self,
        session_id: Optional[str] = None,
        session_key: Optional[int] = None,
        driver_id: Optional[str] = None,
        driver_number: Optional[int] = None
    ) -> Optional[List[Dict[str, Any]]]:
        """Fetches stint data from OpenF1 /stints endpoint."""
        if session_key is None and session_id:
            parts = session_id.split("_")
            try:
                yr = int(parts[0])
            except ValueError:
                return None
            if yr < 2023:
                return None
            circuit = parts[1] if len(parts) > 1 else ""
            session_key = self.get_session_key(yr, circuit)

        if session_key is None:
            return None

        if driver_number is None and driver_id:
            driver_number = self.get_driver_number(driver_id)

        stints_cache_file = os.path.join(self.cache_dir, f"stints_{session_key}.json")
        stints_records: List[Dict[str, Any]] = []
        if os.path.exists(stints_cache_file):
            try:
                with open(stints_cache_file, "r", encoding="utf-8") as f:
                    stints_records = json.load(f)
            except Exception:
                pass

        if not stints_records:
            try:
                stints_records = self.collect("stints", params={"session_key": session_key})
                if self.validate(stints_records) and stints_records:
                    with open(stints_cache_file, "w", encoding="utf-8") as f:
                        json.dump(stints_records, f, indent=2)
            except Exception as e:
                logger.info(f"[{self.name}] OpenF1 /stints live query unavailable: {e}")
                return None

        if driver_number is not None:
            stints_records = [s for s in stints_records if int(s.get("driver_number", -1)) == driver_number]

        stints_records.sort(key=lambda x: int(x.get("stint_number", 0)))
        return stints_records

    def cross_check_pit_stops(
        self,
        session_id: str,
        driver_id: str,
        fastf1_pit_stops: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Compares FastF1-derived pit stop laps with OpenF1 pit records.
        - If OpenF1 has no data (pre-2023, API downtime), flags unavailable gracefully without failing.
        - If both agree on all stops, returns status='verified' with empty narrative note.
        - If any stop disagrees, flags the discrepancy explicitly with exact lap numbers.
        """
        d_num = self.get_driver_number(driver_id)
        openf1_stops = self.get_pit_stops(session_id=session_id, driver_id=driver_id, driver_number=d_num)

        if openf1_stops is None:
            parts = session_id.split("_")
            year_str = parts[0] if parts else "unknown"
            reason = "pre-2023 event" if (year_str.isdigit() and int(year_str) < 2023) else "API unavailable"
            return {
                "status": "unavailable",
                "available": False,
                "driver_number": d_num,
                "source": "OpenF1",
                "message": f"OpenF1 secondary cross-check unavailable for this session ({reason}) - proceeding with FastF1 primary data",
                "comparisons": [],
                "discrepancies": [],
                "has_discrepancy": False,
                "narrative_note": f"Note: OpenF1 secondary cross-check unavailable for this session ({reason}); proceeding with FastF1 primary data."
            }

        comparisons = []
        discrepancies = []
        
        # Compare each stop
        for idx, f1_stop in enumerate(fastf1_pit_stops):
            stop_num = idx + 1
            f1_lap = int(f1_stop.get("lap") or f1_stop.get("lap_number") or 0)
            
            if idx < len(openf1_stops):
                o1_stop = openf1_stops[idx]
                o1_lap = int(o1_stop.get("lap_number", 0))
                agrees = (f1_lap == o1_lap)
                if agrees:
                    flag = None
                else:
                    flag = f"Note: FastF1 and OpenF1 pit lap data disagree for this stop - FastF1 says lap {f1_lap}, OpenF1 says lap {o1_lap}"
                    discrepancies.append(flag)
            else:
                o1_lap = None
                agrees = False
                flag = f"Note: FastF1 recorded stop {stop_num} on lap {f1_lap}, but OpenF1 recorded only {len(openf1_stops)} stop(s)"
                discrepancies.append(flag)

            comparisons.append({
                "stop_number": stop_num,
                "fastf1_lap": f1_lap,
                "openf1_lap": o1_lap,
                "agrees": agrees,
                "flag": flag
            })

        has_discrepancy = len(discrepancies) > 0
        if has_discrepancy:
            status = "discrepancy"
            message = f"FastF1 and OpenF1 pit lap data disagree for {len(discrepancies)} stop(s)"
            narrative_note = "; ".join(discrepancies)
        else:
            status = "verified"
            message = "FastF1 and OpenF1 pit lap data agree for all stops"
            narrative_note = "" # If they agree, note nothing extra per spec

        return {
            "status": status,
            "available": True,
            "driver_number": d_num,
            "source": "OpenF1 (/pit endpoint)",
            "message": message,
            "comparisons": comparisons,
            "discrepancies": discrepancies,
            "has_discrepancy": has_discrepancy,
            "narrative_note": narrative_note
        }

    def sync_active_session(self, session_key: int, race_id: str) -> str:
        """Syncs session metadata for a specific OpenF1 session key."""
        logger.info(f"[{self.name}] Syncing active session for session_key: {session_key}")
        try:
            raw = self.run_with_retry(self.collect, endpoint="sessions", params={"session_key": session_key})
            if not self.validate(raw) or not raw:
                logger.warning(f"[{self.name}] No session configuration found for key: {session_key}")
                return ""

            s_data = raw[0]
            session_id = f"{race_id}_{s_data['session_name'].lower().replace(' ', '_')}"
            
            execute_query(
                "INSERT INTO circuits (id, name, location, country) VALUES (%s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                ("unknown", "Unknown Circuit", "Unknown", "Unknown")
            )
            execute_query(
                "INSERT INTO races (id, circuit_id, year, round, name, date) VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                (race_id, "unknown", int(race_id[:4]), 1, "Race event", s_data["date_start"][:10])
            )

            execute_query(
                """
                INSERT INTO sessions (id, race_id, type, date, start_time, status)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    status = EXCLUDED.status
                """,
                (
                    session_id,
                    race_id,
                    s_data["session_name"],
                    s_data["date_start"][:10],
                    s_data["date_start"][11:19],
                    "completed" if s_data.get("session_name") else "live"
                )
            )
            return session_id
        except Exception as e:
            logger.error(f"[{self.name}] Session sync failed: {e}")
            return ""

    def sync_weather(self, session_id: str, session_key: int):
        """Fetches and inserts weather logs for a given session."""
        logger.info(f"[{self.name}] Syncing weather for session {session_id} (key: {session_key})")
        try:
            raw_weather = self.collect(endpoint="weather", params={"session_key": session_key})
            if not self.validate(raw_weather):
                return
            count = 0
            for entry in raw_weather:
                ts = entry.get("date")
                execute_query(
                    """
                    INSERT INTO weather (session_id, timestamp, air_temperature, track_temperature, humidity, rainfall, wind_direction, wind_speed)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (session_id, timestamp) DO NOTHING
                    """,
                    (
                        session_id,
                        ts,
                        entry.get("air_temperature"),
                        entry.get("track_temperature"),
                        entry.get("humidity"),
                        bool(entry.get("rainfall", 0)),
                        entry.get("wind_direction"),
                        entry.get("wind_speed")
                    )
                )
                count += 1
            logger.info(f"[{self.name}] Successfully synced {count} weather data points for {session_id}")
        except Exception as e:
            logger.error(f"[{self.name}] Weather sync failed: {e}")

    def sync_live_car_coordinates(self, session_id: str, session_key: int, driver_number: int):
        """Streams live telemetry coordinates directly into Redis streams for WebSockets."""
        try:
            positions = self.collect(endpoint="position", params={"session_key": session_key, "driver_number": driver_number})
            if not self.validate(positions) or not redis_client:
                return
            for pos in positions[-10:]:
                redis_client.xadd(
                    f"stream:telemetry:{session_id}",
                    {
                        "driver_number": str(driver_number),
                        "x": str(pos.get("x")),
                        "y": str(pos.get("y")),
                        "z": str(pos.get("z")),
                        "date": str(pos.get("date"))
                    },
                    maxlen=1000
                )
            logger.info(f"[{self.name}] Synced latest positions of driver {driver_number} to Redis")
        except Exception as e:
            logger.error(f"[{self.name}] Live coordinates stream processing failed: {e}")

# Global singleton instance
openf1_collector = OpenF1Collector()
