import requests
import re
from typing import Dict, Any, List, Optional
from app.core.db import execute_query

def get_latest_f1_season() -> int:
    """Dynamically resolves the latest available Formula 1 season."""
    db_year = None
    try:
        res = execute_query("SELECT MAX(year) as max_year FROM races", fetch=True)
        if res and res[0]["max_year"]:
            db_year = int(res[0]["max_year"])
    except Exception:
        pass

    api_year = None
    try:
        response = requests.get("https://ergast.com/api/f1/current.json", timeout=1.5)
        if response.status_code == 200:
            data = response.json()
            races = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
            if races:
                api_year = int(races[0]["season"])
    except Exception:
        pass

    years = [y for y in [db_year, api_year] if y is not None]
    if years:
        return max(years)
    return 2026

class SessionResolver:
    @staticmethod
    def resolve(question: str, history: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Resolves race, session, and driver from the user query."""
        question_lower = question.lower()
        
        # 1. Resolve Driver
        driver_id = None
        drivers_map = {
            "sainz": ["sainz", "carlos"],
            "verstappen": ["verstappen", "max", "ves"],
            "norris": ["norris", "lando", "nor"],
            "leclerc": ["leclerc", "charles", "lec"],
            "hamilton": ["hamilton", "lewis", "ham"],
            "piastri": ["piastri", "oscar", "pia"],
            "russell": ["russell", "george", "rus"],
            "alonso": ["alonso", "fernando", "alo"],
            "perez": ["perez", "checo", "per"]
        }
        for drv_id, keywords in drivers_map.items():
            if any(kw in question_lower for kw in keywords):
                driver_id = drv_id
                break
        if not driver_id:
            try:
                res = execute_query("SELECT id FROM drivers ORDER BY id LIMIT 1", fetch=True)
                if res and res[0]["id"]:
                    driver_id = res[0]["id"]
            except Exception:
                pass
        if not driver_id:
            driver_id = "leclerc"
                
        # 2. Resolve Year
        year_match = re.search(r"\b(202[0-9])\b", question_lower)
        if year_match:
            year = int(year_match.group(1))
        else:
            year = get_latest_f1_season()
            
        # 3. Resolve Location/GP
        circuit_id = None
        gp_map = {
            "austria": ["austria", "spielberg", "red bull ring"],
            "monaco": ["monaco", "monte carlo"],
            "belgium": ["belgium", "spa", "francorchamps"],
            "great_britain": ["silverstone", "britain", "british"],
            "italy": ["monza", "italy", "italian"],
            "singapore": ["singapore", "marina bay"],
            "hungary": ["hungary", "hungaroring", "budapest"]
        }
        for circ_id, keywords in gp_map.items():
            if any(kw in question_lower for kw in keywords):
                circuit_id = circ_id
                break
        if not circuit_id:
            try:
                res = execute_query("SELECT circuit_id FROM races ORDER BY year DESC, round DESC LIMIT 1", fetch=True)
                if res and res[0]["circuit_id"]:
                    circuit_id = res[0]["circuit_id"]
            except Exception:
                pass
        if not circuit_id:
            circuit_id = "monaco"
                
        # 4. Resolve Session Type
        session_type = "Race" # default fallback
        if any(kw in question_lower for kw in ["qualifying", "qualy", "q1", "q2", "q3"]):
            session_type = "Qualifying"
        elif "sprint" in question_lower:
            session_type = "Sprint"
        elif "fp1" in question_lower:
            session_type = "FP1"
        elif "fp2" in question_lower:
            session_type = "FP2"
        elif "fp3" in question_lower:
            session_type = "FP3"
            
        # Look up session in DB to see if it matches
        session_id = None
        try:
            race_rows = execute_query(
                "SELECT id, round FROM races WHERE year = %s AND circuit_id = %s",
                (year, circuit_id), fetch=True
            )
            if race_rows:
                round_num = race_rows[0]["round"]
                session_type_str = session_type.lower().replace(" ", "_")
                session_rows = execute_query(
                    "SELECT id FROM sessions WHERE race_id = %s AND type = %s",
                    (race_rows[0]["id"], session_type), fetch=True
                )
                if session_rows:
                    session_id = session_rows[0]["id"]
                else:
                    session_id = f"{year}_{round_num}_{session_type_str}"
            else:
                any_race = execute_query("SELECT id, round FROM races WHERE year = %s LIMIT 1", (year,), fetch=True)
                if any_race:
                    round_num = any_race[0]["round"]
                    session_type_str = session_type.lower().replace(" ", "_")
                    session_id = f"{year}_{round_num}_{session_type_str}"
        except Exception:
            pass
            
        if not session_id:
            try:
                res = execute_query("SELECT id FROM sessions ORDER BY date DESC LIMIT 1", fetch=True)
                if res and res[0]["id"]:
                    session_id = res[0]["id"]
            except Exception:
                pass
        if not session_id:
            session_id = "2026_monaco_gp_race"
            
        return {
            "year": year,
            "circuit_id": circuit_id,
            "session_type": session_type,
            "session_id": session_id,
            "driver_id": driver_id
        }
