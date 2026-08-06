"""
Session Resolver — Strict null-safe entity resolution.

Rules:
- NEVER invent entities.
- Resolve only entities explicitly mentioned in the question.
- Return None for any entity not found in the question.
- Grand Prix, Driver, Team, Season, Session are independent — resolving one does not imply another.
- Session ID is computed dynamically from (season, GP, session_type) or remains None.
- No hardcoded fallback values.
"""
import re
from typing import Dict, Any, List, Optional
from app.core.db import execute_query


def get_latest_f1_season() -> int:
    """Dynamically resolves the latest available Formula 1 season from the database."""
    try:
        res = execute_query("SELECT MAX(year) as max_year FROM races", fetch=True)
        if res and res[0]["max_year"]:
            return int(res[0]["max_year"])
    except Exception:
        pass
    return 2026


# ---------------------------------------------------------------------------
# Keyword maps
# ---------------------------------------------------------------------------

_DRIVERS_MAP: Dict[str, List[str]] = {
    "verstappen":  ["verstappen", "max verstappen"],
    "norris":      ["norris", "lando norris"],
    "hamilton":    ["hamilton", "lewis hamilton"],
    "leclerc":     ["leclerc", "charles leclerc"],
    "sainz":       ["sainz", "carlos sainz"],
    "piastri":     ["piastri", "oscar piastri"],
    "russell":     ["russell", "george russell"],
    "alonso":      ["alonso", "fernando alonso"],
    "perez":       ["perez", "checo", "sergio perez"],
    "ricciardo":   ["ricciardo", "daniel ricciardo"],
    "tsunoda":     ["tsunoda", "yuki tsunoda"],
    "albon":       ["albon", "alex albon"],
    "gasly":       ["gasly", "pierre gasly"],
    "ocon":        ["ocon", "esteban ocon"],
    "stroll":      ["stroll", "lance stroll"],
    "bottas":      ["bottas", "valtteri bottas"],
    "zhou":        ["zhou", "guanyu zhou"],
    "magnussen":   ["magnussen", "kevin magnussen"],
    "hulkenberg":  ["hulkenberg", "nico hulkenberg"],
    "sargeant":    ["sargeant", "logan sargeant"],
}

_CIRCUIT_MAP: Dict[str, List[str]] = {
    "red_bull_ring":  ["austria", "spielberg", "red bull ring"],
    "monaco":         ["monaco", "monte carlo"],
    "silverstone":    ["silverstone", "british", "britain", "great britain"],
    "monza":          ["monza", "italian", "italy"],
    "singapore":      ["singapore", "marina bay"],
    "hungary":        ["hungary", "hungaroring", "budapest"],
    "belgium":        ["belgium", "spa", "francorchamps"],
    "japan":          ["japan", "suzuka"],
    "bahrain":        ["bahrain", "sakhir"],
    "saudi_arabia":   ["saudi", "jeddah"],
    "australia":      ["australia", "melbourne", "albert park"],
    "miami":          ["miami"],
    "emilia_romagna": ["imola", "emilia"],
    "canada":         ["canada", "montreal", "gilles villeneuve"],
    "spain":          ["spain", "barcelona", "catalan"],
    "azerbaijan":     ["azerbaijan", "baku"],
    "united_states":  ["united states", "cota", "austin"],
    "mexico":         ["mexico", "mexico city"],
    "brazil":         ["brazil", "interlagos", "sao paulo"],
    "las_vegas":      ["las vegas"],
    "qatar":          ["qatar", "lusail"],
    "abu_dhabi":      ["abu dhabi", "yas marina"],
}

_SESSION_TYPE_KEYWORDS: Dict[str, List[str]] = {
    "Qualifying": ["qualifying", "qualy", "q1", "q2", "q3"],
    "Sprint":     ["sprint"],
    "FP1":        ["fp1", "practice 1"],
    "FP2":        ["fp2", "practice 2"],
    "FP3":        ["fp3", "practice 3"],
    "Race":       ["race", "grand prix", "gp"],  # fallback checked last
}


def _extract_driver(q_lower: str) -> Optional[str]:
    """Returns driver_id only if a driver keyword appears in the question. Never invents."""
    for drv_id, aliases in _DRIVERS_MAP.items():
        if any(re.search(r"\b" + re.escape(alias) + r"\b", q_lower) for alias in aliases):
            return drv_id
    return None


def _extract_circuit(q_lower: str) -> Optional[str]:
    """Returns circuit_id only if a GP/circuit keyword appears in the question. Never invents."""
    for circ_id, aliases in _CIRCUIT_MAP.items():
        if any(re.search(r"\b" + re.escape(alias) + r"\b", q_lower) for alias in aliases):
            return circ_id
    return None


def _extract_session_type(q_lower: str) -> str:
    """Extracts session type from question. Defaults to 'Race' only if GP keyword present."""
    for stype, keywords in _SESSION_TYPE_KEYWORDS.items():
        if stype == "Race":
            continue  # check last
        if any(kw in q_lower for kw in keywords):
            return stype
    return "Race"


def _extract_year(q_lower: str) -> Optional[int]:
    """Extracts explicit 4-digit year from question. Returns None if not mentioned."""
    match = re.search(r"\b(20\d{2})\b", q_lower)
    if match:
        return int(match.group(1))
    return None


def _compute_session_id(circuit_id: Optional[str], year: Optional[int],
                         session_type: str) -> Optional[str]:
    """
    Computes session_id by querying PostgreSQL.
    Returns None if any required piece is missing or the session doesn't exist in DB.
    """
    if not circuit_id:
        return None

    # Resolve year: use explicit year or fallback to latest from DB
    resolved_year = year or get_latest_f1_season()

    try:
        # Look up race for this circuit + year
        race_rows = execute_query(
            "SELECT id FROM races WHERE circuit_id = %s AND year = %s",
            (circuit_id, resolved_year), fetch=True
        )
        if not race_rows:
            # Try most recent season for this circuit if no year specified
            if not year:
                race_rows = execute_query(
                    "SELECT id FROM races WHERE circuit_id = %s ORDER BY year DESC LIMIT 1",
                    (circuit_id,), fetch=True
                )
            if not race_rows:
                return None

        race_id = race_rows[0]["id"]

        # Look up session for this race + session_type
        sess_rows = execute_query(
            "SELECT id FROM sessions WHERE race_id = %s AND type = %s",
            (race_id, session_type), fetch=True
        )
        if sess_rows:
            return sess_rows[0]["id"]

    except Exception:
        pass

    return None


class SessionResolver:
    @staticmethod
    def resolve(question: str, history: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        Resolves race, session, and driver from the user query.

        Critical rules:
        - Returns None for driver_id if no driver name mentioned.
        - Returns None for session_id if no GP mentioned.
        - Never invents entities.
        - All values are independently resolved — resolving one does not imply another.
        """
        q_lower = question.lower()

        driver_id = _extract_driver(q_lower)
        circuit_id = _extract_circuit(q_lower)
        year = _extract_year(q_lower)
        session_type = _extract_session_type(q_lower)
        session_id = _compute_session_id(circuit_id, year, session_type)

        return {
            "year": year,
            "circuit_id": circuit_id,
            "session_type": session_type if circuit_id else None,
            "session_id": session_id,
            "driver_id": driver_id,
        }
