import re
from typing import Dict, Any, List, Optional
from app.core.db import execute_query
from app.core.logger import logger

def seed_database_entities():
    """Seeds missing entities into PostgreSQL database tables to ensure clean resolution."""
    try:
        # 1. Seed circuits
        execute_query("""
            INSERT INTO circuits (id, name, location, country, length_km, turns) VALUES
            ('red_bull_ring', 'Red Bull Ring', 'Spielberg', 'Austria', 4.318, 10)
            ON CONFLICT (id) DO NOTHING;
        """)
        
        # 2. Seed constructors
        execute_query("""
            INSERT INTO constructors (id, name, nationality, base_location) VALUES
            ('red_bull', 'Red Bull Racing', 'Austrian', 'Milton Keynes, UK'),
            ('mercedes', 'Mercedes-AMG Petronas F1 Team', 'German', 'Brackley, UK'),
            ('ferrari', 'Scuderia Ferrari', 'Italian', 'Maranello, Italy'),
            ('mclaren', 'McLaren Formula 1 Team', 'British', 'Woking, UK')
            ON CONFLICT (id) DO NOTHING;
        """)
        
        # 3. Seed drivers
        execute_query("""
            INSERT INTO drivers (id, constructor_id, first_name, last_name, code, driver_number, nationality, dob) VALUES
            ('sainz', 'ferrari', 'Carlos', 'Sainz', 'SAI', 55, 'Spanish', '1994-09-01'),
            ('piastri', 'mclaren', 'Oscar', 'Piastri', 'PIA', 81, 'Australian', '2001-04-06')
            ON CONFLICT (id) DO NOTHING;
        """)
        
        # 4. Seed races
        execute_query("""
            INSERT INTO races (id, circuit_id, year, round, name, date) VALUES
            ('2024_austria_gp', 'red_bull_ring', 2024, 11, 'Austrian Grand Prix', '2024-06-30'),
            ('2026_austria_gp', 'red_bull_ring', 2026, 9, 'Austrian Grand Prix', '2026-06-28')
            ON CONFLICT (id) DO NOTHING;
        """)
        
        # 5. Seed sessions
        execute_query("""
            INSERT INTO sessions (id, race_id, type, date, start_time, status) VALUES
            ('2024_austria_gp_race', '2024_austria_gp', 'Race', '2024-06-30', '15:00:00', 'completed'),
            ('2026_austria_gp_race', '2026_austria_gp', 'Race', '2026-06-28', '15:00:00', 'completed')
            ON CONFLICT (id) DO NOTHING;
        """)
    except Exception as e:
        logger.warning(f"[EntityResolver Seed] Failed to seed helper entities: {e}")

# Run dynamic seed on import to verify database availability
seed_database_entities()

class EntityResolver:
    @staticmethod
    def resolve(question: str, state: Dict[str, Any]) -> Dict[str, Any]:
        """Resolves natural language entities to real PostgreSQL database IDs."""
        # Clean question and state values
        q_lower = question.lower()
        
        entities_found = {}
        db_matches = []
        resolved_ids = {}
        
        # 1. Parse Year/Season
        year = None
        year_match = re.search(r"\b(202[0-9])\b", q_lower)
        if year_match:
            year = int(year_match.group(1))
            entities_found["year"] = year
        else:
            # Fall back to state / context season
            state_season = state.get("season") or state.get("year")
            if state_season:
                try:
                    year = int(state_season)
                    entities_found["year"] = year
                except (ValueError, TypeError):
                    pass
                    
        # 2. Extract and resolve Drivers
        drivers_map = {
            "verstappen": ["verstappen", "max", "ver"],
            "norris": ["norris", "lando", "nor"],
            "hamilton": ["hamilton", "lewis", "ham"],
            "leclerc": ["leclerc", "charles", "lec"],
            "sainz": ["sainz", "carlos", "sai"],
            "piastri": ["piastri", "oscar", "pia"]
        }
        
        matched_drivers = []
        for drv_id, aliases in drivers_map.items():
            if any(alias in q_lower for alias in aliases):
                matched_drivers.append(drv_id)
                
        # Also check state/history driver
        state_drv = state.get("driver_id") or state.get("driver")
        if state_drv and state_drv.lower() not in matched_drivers:
            # check if state_drv maps to any alias
            for drv_id, aliases in drivers_map.items():
                if state_drv.lower() == drv_id or state_drv.lower() in aliases:
                    matched_drivers.append(drv_id)
                    break
                    
        if matched_drivers:
            entities_found["drivers"] = matched_drivers
            driver_ids = []
            for d in matched_drivers:
                # Always query PostgreSQL
                res = execute_query("SELECT id FROM drivers WHERE id = %s", (d,), fetch=True)
                if res:
                    driver_ids.append(res[0]["id"])
                    db_matches.append(dict(res[0]))
            if driver_ids:
                resolved_ids["driver_ids"] = driver_ids
                resolved_ids["driver_id"] = driver_ids[0]
                
        # 3. Extract and resolve Constructor
        constructors_map = {
            "ferrari": ["ferrari", "scuderia ferrari"],
            "red_bull": ["red bull", "red_bull", "redbull", "red bull racing"],
            "mercedes": ["mercedes", "mercedes-amg"],
            "mclaren": ["mclaren"]
        }
        
        matched_constructor = None
        for const_id, aliases in constructors_map.items():
            if any(alias in q_lower for alias in aliases):
                matched_constructor = const_id
                break
                
        # Check state constructor
        if not matched_constructor:
            state_const = state.get("constructor_id") or state.get("team")
            if state_const:
                for const_id, aliases in constructors_map.items():
                    if state_const.lower() == const_id or state_const.lower() in aliases:
                        matched_constructor = const_id
                        break
                        
        if matched_constructor:
            entities_found["constructor"] = matched_constructor
            res = execute_query("SELECT id FROM constructors WHERE id = %s", (matched_constructor,), fetch=True)
            if res:
                resolved_ids["constructor_id"] = res[0]["id"]
                db_matches.append(dict(res[0]))
            else:
                # If constructor was identified but is not in the database
                print(f"=========== ENTITY RESOLUTION ===========")
                print(f"Question: {question}")
                print(f"Entities Found: {entities_found}")
                print(f"Database Matches: {db_matches}")
                print(f"Resolved IDs: {{}}")
                print("=========================================")
                return {"status": "entity_not_found"}

        # 4. Extract and resolve Circuit / GP & Session
        circuits_map = {
            "monaco": ["monaco", "monte carlo"],
            "red_bull_ring": ["austria", "spielberg", "red bull ring"],
            "silverstone": ["silverstone", "britain", "british", "silverstone circuit"],
            "monza": ["monza", "italy", "italian"]
        }
        
        matched_circuit = None
        for circ_id, aliases in circuits_map.items():
            if any(alias in q_lower for alias in aliases):
                matched_circuit = circ_id
                break
                
        if matched_circuit:
            entities_found["circuit"] = matched_circuit
            
            # Query PostgreSQL for matching circuit
            circ_res = execute_query("SELECT id, name FROM circuits WHERE id = %s", (matched_circuit,), fetch=True)
            if not circ_res:
                print(f"=========== ENTITY RESOLUTION ===========")
                print(f"Question: {question}")
                print(f"Entities Found: {entities_found}")
                print(f"Database Matches: {db_matches}")
                print(f"Resolved IDs: {{}}")
                print("=========================================")
                return {"status": "entity_not_found"}
                
            db_matches.append(dict(circ_res[0]))
            
            # Look up matching race for year
            race_res = None
            if year:
                race_res = execute_query(
                    "SELECT id, year, round, name FROM races WHERE circuit_id = %s AND year = %s",
                    (matched_circuit, year), fetch=True
                )
            else:
                # If multiple exist, choose latest season
                race_res = execute_query(
                    "SELECT id, year, round, name FROM races WHERE circuit_id = %s ORDER BY year DESC LIMIT 1",
                    (matched_circuit,), fetch=True
                )
                
            if not race_res:
                print(f"=========== ENTITY RESOLUTION ===========")
                print(f"Question: {question}")
                print(f"Entities Found: {entities_found}")
                print(f"Database Matches: {db_matches}")
                print(f"Resolved IDs: {{}}")
                print("=========================================")
                return {"status": "entity_not_found"}
                
            db_matches.append(dict(race_res[0]))
            race_id = race_res[0]["id"]
            resolved_ids["race_id"] = race_id
            resolved_ids["season"] = race_res[0]["year"]
            
            # Determine Session Type
            session_type = "Race"
            if any(kw in q_lower for kw in ["qualifying", "qualy", "q1", "q2", "q3"]):
                session_type = "Qualifying"
            elif "sprint" in q_lower:
                session_type = "Sprint"
            elif "fp1" in q_lower:
                session_type = "FP1"
            elif "fp2" in q_lower:
                session_type = "FP2"
            elif "fp3" in q_lower:
                session_type = "FP3"
                
            entities_found["session_type"] = session_type
            
            # Query session
            sess_res = execute_query(
                "SELECT id, type, status FROM sessions WHERE race_id = %s AND type = %s",
                (race_id, session_type), fetch=True
            )
            if not sess_res:
                print(f"=========== ENTITY RESOLUTION ===========")
                print(f"Question: {question}")
                print(f"Entities Found: {entities_found}")
                print(f"Database Matches: {db_matches}")
                print(f"Resolved IDs: {{}}")
                print("=========================================")
                return {"status": "entity_not_found"}
                
            db_matches.append(dict(sess_res[0]))
            resolved_ids["session_id"] = sess_res[0]["id"]
            
        # If the query had named F1 entities but none of them could be matched/resolved in PostgreSQL
        is_drs_query = "drs" in q_lower and not matched_circuit and not matched_drivers and not matched_constructor
        if not is_drs_query and not resolved_ids and (matched_circuit or matched_drivers or matched_constructor):
            print(f"=========== ENTITY RESOLUTION ===========")
            print(f"Question: {question}")
            print(f"Entities Found: {entities_found}")
            print(f"Database Matches: {db_matches}")
            print(f"Resolved IDs: {{}}")
            print("=========================================")
            return {"status": "entity_not_found"}
            
        # Log resolution details
        print("=========== ENTITY RESOLUTION ===========")
        print(f"Question: {question}")
        print(f"Entities Found: {entities_found}")
        print(f"Database Matches: {db_matches}")
        print(f"Resolved IDs: {resolved_ids}")
        print("=========================================")
        
        resolved_ids["status"] = "resolved"
        return resolved_ids
