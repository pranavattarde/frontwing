from typing import Optional
from app.core.logger import logger
from app.core.session_resolver import SessionResolver

def load_default_race_weekend(
    year: int = 2024,
    gp_name: str = "Qatar",
    session_type: str = "R"
) -> Optional[str]:
    """
    Seeds and loads the default verified F1 race weekend into the PostgreSQL database.
    Called on startup when the database sessions table is empty.
    """
    logger.info(f"[Loader] Seeding default race weekend: {year} {gp_name} GP ({session_type})")
    try:
        from app.ingestion.fastf1_collector import FastF1Collector
        collector = FastF1Collector()
        res = collector.load_session(year, gp_name, session_type)
        if res and res.get("status") in ("loaded", "cached"):
            logger.info(f"[Loader] Default race weekend successfully loaded: {res.get('session_id')}")
            return res.get("session_id")
        else:
            logger.error(f"[Loader] Default race weekend loading returned non-success status: {res}")
            return None
    except Exception as e:
        logger.error(f"[Loader] Failed to load default race weekend: {e}", exc_info=True)
        return None

def ensure_session_in_db(
    session_id: Optional[str] = None,
    year: Optional[int] = None,
    gp_name: Optional[str] = None,
    session_type: str = "R"
) -> Optional[str]:
    """
    Ensures that an F1 session is ingested into PostgreSQL database via SessionResolver.
    Returns session_id string or None if unresolvable.
    """
    if session_id:
        return session_id

    resolved = SessionResolver.resolve_session(
        grand_prix=gp_name,
        season=year or 2024,
        session_type=session_type
    )
    if resolved.get("status") == "success":
        return resolved.get("session_id")
    return None
