import requests
from typing import Dict, Any, List
from .base import BaseCollector
from ..core.logger import logger
from ..core.db import execute_query

class ErgastCollector(BaseCollector):
    def __init__(self, base_url: str = "https://jolissier.github.io/ergast-f1-api-mirror/api/f1"):
        # We target a reliable, static community GitHub mirror of the Ergast DB or public endpoint
        super().__init__("ErgastCollector")
        self.base_url = base_url

    def collect(self, endpoint: str) -> Dict[str, Any]:
        """Fetches raw JSON data from Ergast endpoint."""
        url = f"{self.base_url}/{endpoint}"
        logger.info(f"[{self.name}] Fetching historical data from: {url}")
        
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()

    def validate(self, data: Dict[str, Any]) -> bool:
        """Validates Ergast JSON responses structure."""
        if not isinstance(data, dict):
            return False
        if "MRData" not in data:
            return False
        return True

    def process_and_save(self, data: Dict[str, Any]) -> Dict[str, int]:
        """Upserts constructors, drivers, circuits, and races records to database."""
        mr_data = data.get("MRData", {})
        
        saved_counts = {"constructors": 0, "drivers": 0, "circuits": 0, "races": 0}

        # 1. Process Constructors
        if "ConstructorTable" in mr_data:
            constructors = mr_data["ConstructorTable"].get("Constructors", [])
            for c in constructors:
                execute_query(
                    """
                    INSERT INTO constructors (id, name, nationality, base_location)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        nationality = EXCLUDED.nationality
                    """,
                    (c["constructorId"], c["name"], c["nationality"], None)
                )
                saved_counts["constructors"] += 1

        # 2. Process Drivers
        if "DriverTable" in mr_data:
            drivers = mr_data["DriverTable"].get("Drivers", [])
            for d in drivers:
                execute_query(
                    """
                    INSERT INTO drivers (id, first_name, last_name, code, driver_number, nationality, dob)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        first_name = EXCLUDED.first_name,
                        last_name = EXCLUDED.last_name,
                        code = EXCLUDED.code,
                        driver_number = EXCLUDED.driver_number,
                        nationality = EXCLUDED.nationality,
                        dob = EXCLUDED.dob
                    """,
                    (
                        d["driverId"],
                        d["givenName"],
                        d["familyName"],
                        d.get("code"),
                        int(d["permanentNumber"]) if "permanentNumber" in d else None,
                        d["nationality"],
                        d.get("dateOfBirth")
                    )
                )
                saved_counts["drivers"] += 1

        # 3. Process Circuits
        if "CircuitTable" in mr_data:
            circuits = mr_data["CircuitTable"].get("Circuits", [])
            for circ in circuits:
                loc = circ.get("Location", {})
                execute_query(
                    """
                    INSERT INTO circuits (id, name, location, country, length_km, turns)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        location = EXCLUDED.location,
                        country = EXCLUDED.country
                    """,
                    (
                        circ["circuitId"],
                        circ["circuitName"],
                        loc.get("locality"),
                        loc.get("country"),
                        None, # Length and turns filled by FastF1 metrics later
                        None
                    )
                )
                saved_counts["circuits"] += 1

        # 4. Process Races
        if "RaceTable" in mr_data:
            races = mr_data["RaceTable"].get("Races", [])
            for r in races:
                circ_id = r.get("Circuit", {}).get("circuitId")
                execute_query(
                    """
                    INSERT INTO races (id, circuit_id, year, round, name, date)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        circuit_id = EXCLUDED.circuit_id,
                        name = EXCLUDED.name,
                        date = EXCLUDED.date
                    """,
                    (
                        f"{r['season']}_{r['round']}", # Composite ID for safety
                        circ_id,
                        int(r["season"]),
                        int(r["round"]),
                        r["raceName"],
                        r["date"]
                    )
                )
                saved_counts["races"] += 1

        return saved_counts

    def fetch_and_sync_all_static_data(self):
        """Runs batch synchronization for historical constructors, drivers, and circuits."""
        logger.info(f"[{self.name}] Initiating F1 historical sync...")
        
        # Sync Constructors
        try:
            raw_c = self.run_with_retry(self.collect, endpoint="constructors.json?limit=1000")
            if self.validate(raw_c):
                counts = self.process_and_save(raw_c)
                logger.info(f"[{self.name}] Synced {counts['constructors']} constructors")
        except Exception as e:
            logger.error(f"[{self.name}] Constructors sync failed: {e}")

        # Sync Drivers
        try:
            raw_d = self.run_with_retry(self.collect, endpoint="drivers.json?limit=1000")
            if self.validate(raw_d):
                counts = self.process_and_save(raw_d)
                logger.info(f"[{self.name}] Synced {counts['drivers']} drivers")
        except Exception as e:
            logger.error(f"[{self.name}] Drivers sync failed: {e}")

        # Sync Circuits
        try:
            raw_circ = self.run_with_retry(self.collect, endpoint="circuits.json?limit=1000")
            if self.validate(raw_circ):
                counts = self.process_and_save(raw_circ)
                logger.info(f"[{self.name}] Synced {counts['circuits']} circuits")
        except Exception as e:
            logger.error(f"[{self.name}] Circuits sync failed: {e}")
            
        logger.info(f"[{self.name}] Historical sync sequence completed successfully")
