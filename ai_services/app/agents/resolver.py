import re
from typing import Dict, Any, List, Optional
from app.core.db import execute_query

class SessionResolver:
    @staticmethod
    def resolve(question: str, history: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Resolves race, session, and driver from the user query."""
        question_lower = question.lower()
        
        # 1. Resolve Driver
        driver_id = "sainz" # default fallback
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
                
        # 2. Resolve Year
        year = 2024 # default fallback
        year_match = re.search(r"\b(202[0-9])\b", question_lower)
        if year_match:
            year = int(year_match.group(1))
            
        # 3. Resolve Location/GP
        circuit_id = "austria" # default fallback
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
        # ID format: {year}_{round}_{type_lower}
        session_id = f"{year}_11_race" # default fallback for Austria 2024 Race
        try:
            # Look up circuit and race round number
            race_rows = execute_query(
                "SELECT id, round FROM races WHERE year = %s AND circuit_id = %s",
                (year, circuit_id), fetch=True
            )
            if race_rows:
                round_num = race_rows[0]["round"]
                session_type_str = session_type.lower().replace(" ", "_")
                session_id = f"{year}_{round_num}_{session_type_str}"
            else:
                # If not found, look for any race matching the year
                any_race = execute_query("SELECT id, round FROM races WHERE year = %s LIMIT 1", (year,), fetch=True)
                if any_race:
                    round_num = any_race[0]["round"]
                    session_type_str = session_type.lower().replace(" ", "_")
                    session_id = f"{year}_{round_num}_{session_type_str}"
        except Exception:
            pass
            
        return {
            "year": year,
            "circuit_id": circuit_id,
            "session_type": session_type,
            "session_id": session_id,
            "driver_id": driver_id
        }
