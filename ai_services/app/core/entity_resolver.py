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
            # Use word-boundary matching to avoid false positives
            if any(re.search(r"\b" + re.escape(alias) + r"\b", q_lower) for alias in aliases):
                matched_drivers.append(drv_id)
        # NOTE: We deliberately do NOT fall back to state.get("driver_id") here.
        # If the question doesn't mention a driver, driver_id must remain None.
        # Context injection is handled by the planner/memory layer, not by entity resolution.
                    
        if matched_drivers:
            entities_found["drivers"] = matched_drivers
            driver_ids = []
            for d in matched_drivers:
                try:
                    res = execute_query("SELECT id FROM drivers WHERE id = %s", (d,), fetch=True)
                    if res:
                        driver_ids.append(res[0]["id"])
                        db_matches.append(dict(res[0]))
                    else:
                        driver_ids.append(d)
                except Exception:
                    driver_ids.append(d)
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
            try:
                res = execute_query("SELECT id FROM constructors WHERE id = %s", (matched_constructor,), fetch=True)
                if res:
                    resolved_ids["constructor_id"] = res[0]["id"]
                    db_matches.append(dict(res[0]))
                else:
                    resolved_ids["constructor_id"] = matched_constructor
            except Exception:
                resolved_ids["constructor_id"] = matched_constructor

            if not matched_drivers:
                try:
                    drv_rows = execute_query("SELECT id FROM drivers WHERE constructor_id = %s LIMIT 2", (matched_constructor,), fetch=True)
                    if drv_rows:
                        resolved_ids["driver_id"] = drv_rows[0]["id"]
                        resolved_ids["driver_ids"] = [d["id"] for d in drv_rows]
                except Exception:
                    pass

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
            circ_res = None
            try:
                circ_res = execute_query("SELECT id, name FROM circuits WHERE id = %s", (matched_circuit,), fetch=True)
            except Exception:
                pass
                
            if circ_res:
                db_matches.append(dict(circ_res[0]))
            
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

            # Look up matching race for year flexibly
            race_res = None
            target_year = year or state.get("season") or 2024
            try:
                race_res = execute_query(
                    """
                    SELECT r.id, r.year, r.round, r.name FROM races r
                    LEFT JOIN circuits c ON r.circuit_id = c.id
                    WHERE (c.id ILIKE %s OR c.name ILIKE %s OR r.name ILIKE %s OR r.id ILIKE %s) AND r.year = %s
                    """,
                    (f"%{matched_circuit}%", f"%{matched_circuit}%", f"%{matched_circuit}%", f"%{matched_circuit}%", target_year),
                    fetch=True
                )
            except Exception:
                pass

            if not race_res:
                # Trigger dynamic ingestion for missing GP session
                from app.ingestion.loader import ensure_session_in_db
                target_year = year or 2024
                ensure_session_in_db(None, year=target_year, gp_name=matched_circuit, session_type=session_type)
                try:
                    race_res = execute_query(
                        """
                        SELECT r.id, r.year, r.round, r.name FROM races r
                        LEFT JOIN circuits c ON r.circuit_id = c.id
                        WHERE (c.id ILIKE %s OR c.name ILIKE %s OR r.name ILIKE %s OR r.id ILIKE %s) AND r.year = %s
                        """,
                        (f"%{matched_circuit}%", f"%{matched_circuit}%", f"%{matched_circuit}%", f"%{matched_circuit}%", target_year),
                        fetch=True
                    )
                except Exception:
                    pass

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
            resolved_ids["season"] = year or race_res[0]["year"]
            
            # Query session
            sess_res = execute_query(
                "SELECT id, type, status FROM sessions WHERE race_id = %s AND type ILIKE %s",
                (race_id, f"%{session_type}%"), fetch=True
            )
            if not sess_res:
                from app.ingestion.loader import ensure_session_in_db
                ensure_session_in_db(None, year=race_res[0]["year"], gp_name=matched_circuit, session_type=session_type)
                sess_res = execute_query(
                    "SELECT id, type, status FROM sessions WHERE race_id = %s AND type ILIKE %s",
                    (race_id, f"%{session_type}%"), fetch=True
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
            
        # If nothing was resolved at all (no circuit, no driver, no constructor found in question),
        # return empty resolved_ids — not an error. The question may be a follow-up or general query.
        # Only return entity_not_found when we FOUND an entity keyword but COULDN'T resolve it in the DB.
        entity_keywords_found = bool(matched_circuit or matched_drivers or matched_constructor)
        if entity_keywords_found and not resolved_ids:
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
