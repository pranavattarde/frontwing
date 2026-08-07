import re
from typing import Dict, Any, List, Optional
from app.core.db import execute_query
from app.core.logger import logger

def seed_database_entities():
    """Seeds baseline helper entities into PostgreSQL database tables."""
    try:
        execute_query("""
            INSERT INTO circuits (id, name, location, country, length_km, turns) VALUES
            ('red_bull_ring', 'Red Bull Ring', 'Spielberg', 'Austria', 4.318, 10),
            ('monaco', 'Circuit de Monaco', 'Monte Carlo', 'Monaco', 3.337, 19),
            ('silverstone', 'Silverstone Circuit', 'Silverstone', 'United Kingdom', 5.891, 18),
            ('hungaroring', 'Hungaroring', 'Budapest', 'Hungary', 4.381, 14),
            ('catalunya', 'Circuit de Barcelona-Catalunya', 'Barcelona', 'Spain', 4.657, 14)
            ON CONFLICT (id) DO NOTHING;
        """)
        execute_query("""
            INSERT INTO constructors (id, name, nationality, base_location) VALUES
            ('red_bull', 'Red Bull Racing', 'Austrian', 'Milton Keynes, UK'),
            ('mercedes', 'Mercedes-AMG Petronas F1 Team', 'German', 'Brackley, UK'),
            ('ferrari', 'Scuderia Ferrari', 'Italian', 'Maranello, Italy'),
            ('mclaren', 'McLaren Formula 1 Team', 'British', 'Woking, UK')
            ON CONFLICT (id) DO NOTHING;
        """)
        execute_query("""
            INSERT INTO drivers (id, constructor_id, first_name, last_name, code, driver_number, nationality, dob) VALUES
            ('leclerc', 'ferrari', 'Charles', 'Leclerc', 'LEC', 16, 'Monaco', '1997-10-16'),
            ('sainz', 'ferrari', 'Carlos', 'Sainz', 'SAI', 55, 'Spanish', '1994-09-01'),
            ('verstappen', 'red_bull', 'Max', 'Verstappen', 'VER', 1, 'Dutch', '1997-09-30'),
            ('norris', 'mclaren', 'Lando', 'Norris', 'NOR', 4, 'British', '1999-11-13'),
            ('piastri', 'mclaren', 'Oscar', 'Piastri', 'PIA', 81, 'Australian', '2001-04-06'),
            ('hamilton', 'mercedes', 'Lewis', 'Hamilton', 'HAM', 44, 'British', '1985-01-07'),
            ('russell', 'mercedes', 'George', 'Russell', 'RUS', 63, 'British', '1998-02-15')
            ON CONFLICT (id) DO NOTHING;
        """)
    except Exception as e:
        logger.warning(f"[EntityResolver Seed] Helper entity seed warning: {e}")

# Run seed on module import
seed_database_entities()


class EntityResolver:
    @staticmethod
    def resolve(question: str, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Resolves planner-extracted entities to database IDs.
        Pipeline: Planner -> entities -> resolver -> resolved ids -> SessionResolver -> session_id
        Does not parse the question string again if entities are provided by Planner.
        """
        planner_entities = state.get("entities") or state.get("planner_entities") or {}
        
        # Fallback to simple extraction from question only if planner_entities is completely empty
        if not planner_entities and question:
            q_lower = question.lower()
            planner_entities = {}
            # Year
            year_match = re.search(r"\b(202[0-9])\b", q_lower)
            if year_match:
                planner_entities["season"] = int(year_match.group(1))
            # GP
            if "monaco" in q_lower:
                planner_entities["grand_prix"] = "Monaco GP"
            elif any(k in q_lower for k in ["austria", "austrian", "spielberg"]):
                planner_entities["grand_prix"] = "Austrian GP"
            elif any(k in q_lower for k in ["hungary", "hungarian", "budapest"]):
                planner_entities["grand_prix"] = "Hungarian GP"
            elif any(k in q_lower for k in ["british", "britain", "silverstone"]):
                planner_entities["grand_prix"] = "British GP"
            elif any(k in q_lower for k in ["spanish", "spain", "barcelona"]):
                planner_entities["grand_prix"] = "Spanish GP"

        # 1. Season/Year from Planner
        year = planner_entities.get("year") or planner_entities.get("season") or state.get("season") or 2024
        try:
            year = int(year)
        except (ValueError, TypeError):
            year = 2024

        entities_found = {"year": year}
        db_matches = []
        resolved_ids = {"season": year}

        # 2. Driver Resolution
        driver_input = planner_entities.get("driver") or planner_entities.get("drivers") or state.get("driver") or state.get("drivers")
        matched_drivers = []
        if isinstance(driver_input, list):
            matched_drivers = [str(d).lower() for d in driver_input if d]
        elif driver_input:
            matched_drivers = [str(driver_input).lower()]

        drivers_map = {
            "verstappen": ["verstappen", "max", "ver"],
            "norris": ["norris", "lando", "nor"],
            "hamilton": ["hamilton", "lewis", "ham"],
            "leclerc": ["leclerc", "charles", "lec"],
            "sainz": ["sainz", "carlos", "sai"],
            "piastri": ["piastri", "oscar", "pia"],
            "russell": ["russell", "george", "rus"]
        }

        driver_ids = []
        for drv_name in matched_drivers:
            mapped_id = None
            for key, aliases in drivers_map.items():
                if drv_name in aliases or key == drv_name:
                    mapped_id = key
                    break
            if not mapped_id:
                mapped_id = drv_name

            res = execute_query(
                "SELECT id FROM drivers WHERE id = %s OR code ILIKE %s OR last_name ILIKE %s",
                (mapped_id, f"%{mapped_id}%", f"%{mapped_id}%"), fetch=True
            )
            if res:
                driver_ids.append(res[0]["id"])
                db_matches.append(dict(res[0]))
            else:
                driver_ids.append(mapped_id)

        if driver_ids:
            entities_found["drivers"] = matched_drivers
            resolved_ids["driver_ids"] = driver_ids
            resolved_ids["driver_id"] = driver_ids[0]

        # 3. Constructor Resolution
        constructor_input = planner_entities.get("team") or planner_entities.get("constructor") or state.get("team")
        if constructor_input:
            const_clean = str(constructor_input).lower()
            constructors_map = {
                "ferrari": ["ferrari", "scuderia ferrari"],
                "red_bull": ["red bull", "red_bull", "redbull", "red bull racing"],
                "mercedes": ["mercedes", "mercedes-amg"],
                "mclaren": ["mclaren"]
            }
            mapped_const = const_clean
            for cid, aliases in constructors_map.items():
                if any(alias in const_clean for alias in aliases):
                    mapped_const = cid
                    break

            res = execute_query("SELECT id FROM constructors WHERE id = %s OR name ILIKE %s", (mapped_const, f"%{mapped_const}%"), fetch=True)
            if res:
                resolved_ids["constructor_id"] = res[0]["id"]
                db_matches.append(dict(res[0]))
            else:
                resolved_ids["constructor_id"] = mapped_const

            if not resolved_ids.get("driver_id"):
                drv_rows = execute_query("SELECT id FROM drivers WHERE constructor_id = %s LIMIT 2", (resolved_ids["constructor_id"],), fetch=True)
                if drv_rows:
                    resolved_ids["driver_id"] = drv_rows[0]["id"]
                    resolved_ids["driver_ids"] = [d["id"] for d in drv_rows]

        # 4. Grand Prix & Session Resolution via SessionResolver
        gp_input = planner_entities.get("grand_prix") or planner_entities.get("gp") or state.get("grand_prix")
        session_type = planner_entities.get("session_type") or state.get("session_type") or "Race"

        if gp_input:
            entities_found["grand_prix"] = gp_input
            entities_found["session_type"] = session_type

            from app.core.session_resolver import SessionResolver
            sess_res = SessionResolver.resolve_session(
                grand_prix=gp_input,
                season=year,
                session_type=session_type
            )

            if sess_res.get("status") == "success" and sess_res.get("session_id"):
                session_id = sess_res["session_id"]
                resolved_ids["session_id"] = session_id
                db_matches.append({"session_id": session_id, "rows": sess_res.get("rows_returned")})

                race_row = execute_query("SELECT race_id FROM sessions WHERE id = %s", (session_id,), fetch=True)
                if race_row:
                    resolved_ids["race_id"] = race_row[0]["race_id"]
            elif sess_res.get("status") == "DATA_UNAVAILABLE":
                logger.warning(f"[EntityResolver] SessionResolver returned DATA_UNAVAILABLE for gp={gp_input}")
                resolved_ids["status"] = "entity_not_found"

        print("=========== ENTITY RESOLUTION ===========")
        print(f"Planner Entities: {planner_entities}")
        print(f"Entities Found: {entities_found}")
        print(f"Database Matches: {db_matches}")
        print(f"Resolved IDs: {resolved_ids}")
        print("=========================================")

        resolved_ids["status"] = resolved_ids.get("status", "resolved")
        return resolved_ids
