import os
import json
import numpy as np
import fastf1
from typing import Dict, Any, List
from .base import BaseCollector
from ..core.logger import logger
from ..core.db import execute_query

class FastF1Collector(BaseCollector):
    def __init__(self, cache_dir: str = "ai_services/cache"):
        super().__init__("FastF1Collector")
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
        os.makedirs(os.path.join(cache_dir, "telemetry"), exist_ok=True)
        
        # Enable FastF1 caching to reduce API hits
        fastf1.Cache.enable_cache(self.cache_dir)

    def collect(self, year: int, gp_name: str, session_type: str) -> fastf1.core.Session:
        """Downloads and loads an entire F1 session data package."""
        logger.info(f"[{self.name}] Fetching session {year} {gp_name} - {session_type} from FastF1")
        session = fastf1.get_session(year, gp_name, session_type)
        session.load(telemetry=True, laps=True, weather=False)
        return session

    def validate(self, session: fastf1.core.Session) -> bool:
        """Validates loaded FastF1 session structure completeness."""
        if session is None or session.laps is None or len(session.laps) == 0:
            return False
        return True

    def process_and_save(self, session: fastf1.core.Session) -> str:
        """Extracts laps, stints, and telemetry metadata mappings, committing them to PostgreSQL."""
        # 1. Map session to database session ID
        # FastF1 session event names: e.g. 'Monaco Grand Prix', session types: 'Qualifying' or 'R'
        year = session.event['Season']
        round_num = session.event['RoundNumber']
        race_id = f"{year}_{round_num}"
        session_type_map = {
            "R": "Race",
            "Q": "Qualifying",
            "SQ": "Sprint Qualifying",
            "S": "Sprint",
            "FP1": "FP1",
            "FP2": "FP2",
            "FP3": "FP3"
        }
        type_str = session_type_map.get(session.name, session.name)
        session_id = f"{race_id}_{type_str.lower().replace(' ', '_')}"

        # Ensure circuit exists to prevent foreign key violation
        circuit_id = session.event['Location'].lower().replace(' ', '_')
        exists_circ = execute_query("SELECT id FROM circuits WHERE id = %s", (circuit_id,), fetch=True)
        if not exists_circ:
            name_match = execute_query("SELECT id FROM circuits WHERE name ILIKE %s OR location ILIKE %s", (f"%{session.event['Location']}%", f"%{session.event['Location']}%"), fetch=True)
            if name_match:
                circuit_id = name_match[0]["id"]
            else:
                execute_query(
                    "INSERT INTO circuits (id, name, location, country) VALUES (%s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                    (circuit_id, session.event['EventName'], session.event['Location'], "Unknown")
                )

        # Confirm race is registered in DB first
        execute_query(
            """
            INSERT INTO races (id, circuit_id, year, round, name, date)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
            """,
            (race_id, circuit_id, year, round_num, session.event['EventName'], session.date.strftime('%Y-%m-%d'))
        )

        # Confirm session is registered in DB
        execute_query(
            """
            INSERT INTO sessions (id, race_id, type, date, start_time, status)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET status = 'completed'
            """,
            (session_id, race_id, type_str, session.date.strftime('%Y-%m-%d'), None, "completed")
        )

        # 2. Iterate and process driver laps
        laps_df = session.laps
        drivers_list = list(laps_df['Driver'].unique())

        logger.info(f"[{self.name}] Processing laps for drivers: {drivers_list}")
        for drv_code in drivers_list:
            # Match code to driver ID from db (fallback to lowercase code if not found)
            drv_rows = execute_query("SELECT id FROM drivers WHERE code = %s", (drv_code,), fetch=True)
            drv_id = drv_rows[0]['id'] if drv_rows else drv_code.lower()
            
            # Ensure driver exists to prevent foreign key violation in stints/laps
            exists_drv = execute_query("SELECT id FROM drivers WHERE id = %s", (drv_id,), fetch=True)
            if not exists_drv:
                execute_query(
                    "INSERT INTO drivers (id, first_name, last_name, code) VALUES (%s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                    (drv_id, drv_code, "Driver", drv_code)
                )

            # Process stints for this driver
            drv_laps = laps_df.pick_driver(drv_code)
            stints_groups = drv_laps.groupby('Stint')

            for stint_num, stint_df in stints_groups:
                stint_num = int(stint_num)
                compound = str(stint_df['Compound'].iloc[0]).upper()
                start_lap = int(stint_df['LapNumber'].min())
                end_lap = int(stint_df['LapNumber'].max())
                stint_len = end_lap - start_lap + 1

                execute_query(
                    """
                    INSERT INTO stints (session_id, driver_id, stint_number, compound, start_lap, end_lap, stint_length, is_new)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (session_id, driver_id, stint_number) DO UPDATE SET
                        end_lap = EXCLUDED.end_lap,
                        stint_length = EXCLUDED.stint_length
                    """,
                    (session_id, drv_id, stint_num, compound, start_lap, end_lap, stint_len, True)
                )

            # Process individual lap timings
            for _, lap_row in drv_laps.iterrows():
                lap_num = int(lap_row['LapNumber'])
                lap_time_ms = int(lap_row['LapTime'].total_seconds() * 1000) if not pandas_is_null(lap_row['LapTime']) else None
                s1_ms = int(lap_row['Sector1Time'].total_seconds() * 1000) if not pandas_is_null(lap_row['Sector1Time']) else None
                s2_ms = int(lap_row['Sector2Time'].total_seconds() * 1000) if not pandas_is_null(lap_row['Sector2Time']) else None
                s3_ms = int(lap_row['Sector3Time'].total_seconds() * 1000) if not pandas_is_null(lap_row['Sector3Time']) else None
                
                compound = str(lap_row['Compound']).upper() if not pandas_is_null(lap_row['Compound']) else 'UNKNOWN'
                is_pit_out = bool(lap_row['PitOutTime']) if not pandas_is_null(lap_row['PitOutTime']) else False
                is_valid = bool(lap_row['IsValid']) if not pandas_is_null(lap_row['IsValid']) else True

                # Upsert into PostgreSQL 'laps' table
                execute_query(
                    """
                    INSERT INTO laps (session_id, driver_id, lap_number, lap_time_ms, sector_1_ms, sector_2_ms, sector_3_ms, compound, is_pit_out_lap, is_valid)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (session_id, driver_id, lap_number) DO UPDATE SET
                        lap_time_ms = EXCLUDED.lap_time_ms,
                        sector_1_ms = EXCLUDED.sector_1_ms,
                        sector_2_ms = EXCLUDED.sector_2_ms,
                        sector_3_ms = EXCLUDED.sector_3_ms,
                        is_valid = EXCLUDED.is_valid
                    """,
                    (session_id, drv_id, lap_num, lap_time_ms, s1_ms, s2_ms, s3_ms, compound, is_pit_out, is_valid)
                )

                # Process Telemetry Downsampling and Save Metadata
                try:
                    telemetry_df = lap_row.get_telemetry()
                    if telemetry_df is not None and len(telemetry_df) > 0:
                        self._downsample_and_save_telemetry(session_id, drv_id, lap_num, telemetry_df)
                except Exception as ex:
                    logger.warning(f"Could not load telemetry profiles for driver {drv_code} lap {lap_num}: {ex}")

        return session_id

    def _downsample_and_save_telemetry(self, session_id: str, driver_id: str, lap_number: int, df):
        """Downsamples detailed 10Hz telemetry data using bucket averages to 50 significant points and caches JSON."""
        # Clean dataframe inputs
        speeds = df['Speed'].values
        rpms = df['RPM'].values
        gears = df['Gear'].values
        throttles = df['Throttle'].values
        brakes = df['Brake'].values.astype(bool)
        
        # Calculate visual coordinate distances
        total_points = len(df)
        bucket_size = max(1, total_points // 50)
        
        downsampled = []
        for i in range(0, total_points, bucket_size):
            chunk_speed = speeds[i : i + bucket_size]
            chunk_rpm = rpms[i : i + bucket_size]
            chunk_gear = gears[i : i + bucket_size]
            chunk_throttle = throttles[i : i + bucket_size]
            chunk_brake = brakes[i : i + bucket_size]
            
            downsampled.append({
                "speed": int(np.mean(chunk_speed)) if len(chunk_speed) > 0 else 0,
                "rpm": int(np.mean(chunk_rpm)) if len(chunk_rpm) > 0 else 0,
                "gear": int(np.round(np.mean(chunk_gear))) if len(chunk_gear) > 0 else 0,
                "throttle": int(np.mean(chunk_throttle)) if len(chunk_throttle) > 0 else 0,
                "brake": bool(np.any(chunk_brake)) if len(chunk_brake) > 0 else False
            })

        # Save to local cache file
        storage_filename = f"{session_id}_{driver_id}_{lap_number}.json"
        storage_path = os.path.join(self.cache_dir, "telemetry", storage_filename)
        
        with open(storage_path, "w") as f:
            json.dump(downsampled, f)

        # Register profile index inside PostgreSQL 'telemetry_metadata'
        redis_key = f"telemetry:cache:{session_id}:{driver_id}:{lap_number}"
        execute_query(
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
