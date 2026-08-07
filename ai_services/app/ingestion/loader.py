from typing import Optional
from app.core.logger import logger
from app.core.session_resolver import SessionResolver

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
