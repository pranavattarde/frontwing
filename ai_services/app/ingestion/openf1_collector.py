import requests
from datetime import datetime
from typing import Dict, Any, List
from .base import BaseCollector
from ..core.logger import logger
from ..core.db import execute_query, redis_client

class OpenF1Collector(BaseCollector):
    def __init__(self, base_url: str = "https://api.openf1.org/v1"):
        super().__init__("OpenF1Collector")
        self.base_url = base_url

    def collect(self, endpoint: str, params: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Queries OpenF1 REST endpoint for F1 timing telemetry datasets."""
        url = f"{self.base_url}/{endpoint}"
        logger.info(f"[{self.name}] Querying OpenF1 data at: {url} with params {params}")
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()

    def validate(self, data: List[Dict[str, Any]]) -> bool:
        """Validates that OpenF1 response is a list structure."""
        return isinstance(data, list)

    def process_and_save(self, data: List[Dict[str, Any]]) -> None:
        """Abstract implementation; target specific endpoints in sub-methods."""
        pass

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
            
            # Ensure circuit and race exist to satisfy foreign keys
            execute_query(
                "INSERT INTO circuits (id, name, location, country) VALUES (%s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                ("unknown", "Unknown Circuit", "Unknown", "Unknown")
            )
            execute_query(
                "INSERT INTO races (id, circuit_id, year, round, name, date) VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                (race_id, "unknown", int(race_id[:4]), 1, "Race event", s_data["date_start"][:10])
            )

            # Upsert into PostgreSQL 'sessions' table
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
                    s_data["date_start"][:10], # ISO YYYY-MM-DD format
                    s_data["date_start"][11:19], # ISO HH:MM:SS format
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
                # OpenF1 ISO strings: e.g. '2023-03-03T12:00:00+00:00'
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
        """Streams live telemetry coordinates (OpenF1 position data) directly into Redis streams for WebSockets."""
        try:
            # Query last few positions
            positions = self.collect(endpoint="position", params={"session_key": session_key, "driver_number": driver_number})
            if not self.validate(positions) or not redis_client:
                return

            for pos in positions[-10:]: # sync latest positions
                redis_key = f"telemetry:live:{session_id}:{driver_number}"
                
                # Push coordinate metadata to Redis Stream
                redis_client.xadd(
                    f"stream:telemetry:{session_id}",
                    {
                        "driver_number": str(driver_number),
                        "x": str(pos.get("x")),
                        "y": str(pos.get("y")),
                        "z": str(pos.get("z")),
                        "date": str(pos.get("date"))
                    },
                    maxlen=1000 # keep message cap
                )
            
            logger.info(f"[{self.name}] Synced latest positions of driver {driver_number} to Redis")
        except Exception as e:
            logger.error(f"[{self.name}] Live coordinates stream processing failed: {e}")
