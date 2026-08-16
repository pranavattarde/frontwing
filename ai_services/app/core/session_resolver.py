import re
from typing import Optional, Dict, Any
from app.core.db import execute_query
from app.core.logger import logger
from app.ingestion.fastf1_collector import FastF1Collector

class SessionResolver:
    """
    Single unified SessionResolver for FrontWing MVP.
    Given grand_prix, season, session_type:
    1. Queries PostgreSQL database for existing session and race results.
    2. If missing or 0 results: dynamically downloads via FastF1, persists to PostgreSQL.
    3. Retries DB query and returns verified session_id and metadata.
    4. Returns DATA_UNAVAILABLE if FastF1 download fails.
    """

    @staticmethod
    def _clean_gp_name(gp_name: str) -> str:
        if not gp_name:
            return "monaco"
        gp_lower = gp_name.lower().strip()
        # Common GP aliases mapping
        gp_alias_map = {
            "austria": "austria",
            "austrian": "austria",
            "spielberg": "austria",
            "red bull ring": "austria",
            "red_bull_ring": "austria",
            "monaco": "monaco",
            "monte carlo": "monaco",
            "monte_carlo": "monaco",
            "hungary": "hungary",
            "hungarian": "hungary",
            "budapest": "hungary",
            "hungaroring": "hungary",
            "british": "silverstone",
            "britain": "silverstone",
            "silverstone": "silverstone",
            "uk": "silverstone",
            "spanish": "spain",
            "spain": "spain",
            "barcelona": "spain",
            "catalunya": "spain",
            "japan": "japan",
            "japanese": "japan",
            "suzuka": "japan",
            "italy": "monza",
            "italian": "monza",
            "monza": "monza",
            "imola": "imola",
            "emilia": "imola",
            "emilia romagna": "imola",
            "belgian": "spa",
            "belgium": "spa",
            "spa": "spa",
            "canadian": "canada",
            "canada": "canada",
            "montreal": "canada",
            "miami": "miami",
            "china": "china",
            "chinese": "china",
            "shanghai": "china",
            "singapore": "singapore",
            "marina bay": "singapore",
            "brazil": "sao paulo",
            "brazilian": "sao paulo",
            "interlagos": "sao paulo",
            "sao paulo": "sao paulo",
            "las vegas": "vegas",
            "vegas": "vegas",
            "qatar": "qatar",
            "lusail": "qatar",
            "abu dhabi": "abu dhabi",
            "yas marina": "abu dhabi",
            "dutch": "zandvoort",
            "netherlands": "zandvoort",
            "zandvoort": "zandvoort",
            "azerbaijan": "baku",
            "baku": "baku",
            "saudi": "jeddah",
            "saudi arabia": "jeddah",
            "jeddah": "jeddah",
            "australia": "australia",
            "australian": "australia",
            "melbourne": "australia",
            "united states": "cota",
            "us": "cota",
            "cota": "cota",
            "austin": "cota",
            "mexico": "mexico",
            "mexican": "mexico",
            "mexico city": "mexico",
            "bahrain": "bahrain",
            "sakhir": "bahrain"
        }
        for alias, key in sorted(gp_alias_map.items(), key=lambda x: len(x[0]), reverse=True):
            if re.search(r"\b" + re.escape(alias) + r"\b", gp_lower):
                return key
            if len(alias) > 3 and alias in gp_lower:
                return key
        clean = re.sub(r"\b(grand prix|gp|race|the)\b", "", gp_lower).strip()
        return clean or gp_lower

    @classmethod
    def resolve_session(
        cls,
        grand_prix: Optional[str] = None,
        season: Optional[int] = None,
        session_type: str = "Race"
    ) -> Dict[str, Any]:
        gp_clean = cls._clean_gp_name(grand_prix)
        
        # If no explicit season supplied, query latest verified season from DB
        target_year = season
        if not target_year:
            latest_row = execute_query("SELECT season FROM sessions ORDER BY season DESC LIMIT 1", fetch=True)
            if latest_row and latest_row[0].get("season"):
                target_year = int(latest_row[0]["season"])
            else:
                target_year = 2024
        else:
            try:
                target_year = int(target_year)
            except (ValueError, TypeError):
                target_year = 2024
        
        session_type_map = {
            "R": "Race", "Q": "Qualifying", "SQ": "Sprint Qualifying",
            "S": "Sprint", "FP1": "FP1", "FP2": "FP2", "FP3": "FP3"
        }
        stype_str = session_type_map.get(session_type.upper(), session_type)
        
        # 1. Query PostgreSQL for session
        session_id = cls._query_db_session(target_year, gp_clean, grand_prix or gp_clean, stype_str)
        fastf1_downloaded = False
        rows_inserted = 0

        # Check if session exists and has race_results rows
        has_results = False
        if session_id:
            res_cnt = execute_query(
                "SELECT COUNT(*) as cnt FROM race_results WHERE session_id = %s",
                (session_id,), fetch=True
            )
            if res_cnt and res_cnt[0]["cnt"] > 0:
                has_results = True
                rows_inserted = res_cnt[0]["cnt"]

        # 2. If session or results missing: Auto-ingest via FastF1
        if not session_id or not has_results:
            logger.info(f"[SessionResolver] Session missing or unpopulated for year={target_year}, gp={gp_clean}. Triggering FastF1 auto-ingestion...")
            fastf1_downloaded = True
            try:
                collector = FastF1Collector()
                load_res = collector.load_session(target_year, grand_prix or gp_clean, stype_str)
                if load_res and load_res.get("session_id"):
                    session_id = load_res["session_id"]
            except Exception as e:
                logger.warning(f"[SessionResolver] FastF1 download exception: {e}")

            # Retry DB query after ingestion
            if not session_id or not has_results:
                session_id = cls._query_db_session(target_year, gp_clean, grand_prix or gp_clean, stype_str)
                if session_id:
                    res_cnt = execute_query(
                        "SELECT COUNT(*) as cnt FROM race_results WHERE session_id = %s",
                        (session_id,), fetch=True
                    )
                    if res_cnt and res_cnt[0]["cnt"] > 0:
                        has_results = True
                        rows_inserted = res_cnt[0]["cnt"]

        if session_id and has_results:
            logger.info(f"[SessionResolver] Resolved session_id={session_id} with {rows_inserted} rows (FastF1 Download: {fastf1_downloaded})")
            return {
                "status": "success",
                "session_id": session_id,
                "rows_returned": rows_inserted,
                "fastf1_downloaded": fastf1_downloaded,
                "season": target_year,
                "grand_prix": grand_prix or gp_clean,
                "session_type": stype_str
            }

        logger.warning(f"[SessionResolver] Unable to resolve session for year={target_year}, gp={grand_prix}")
        return {
            "status": "DATA_UNAVAILABLE",
            "session_id": None,
            "rows_returned": 0,
            "fastf1_downloaded": fastf1_downloaded,
            "season": target_year,
            "grand_prix": grand_prix or gp_clean,
            "session_type": stype_str
        }

    @staticmethod
    def _query_db_session(year: int, gp_clean: str, raw_gp: str, stype_str: str) -> Optional[str]:
        try:
            tokens = [gp_clean]
            if raw_gp:
                clean_raw = re.sub(r"\b(grand prix|gp|race)\b", "", raw_gp, flags=re.IGNORECASE).strip()
                tokens.extend(clean_raw.lower().split())
            
            for token in tokens:
                if not token or len(token) < 3:
                    continue
                sub_token = token
                sql = """
                    SELECT s.id FROM sessions s
                    JOIN races r ON s.race_id = r.id
                    LEFT JOIN circuits c ON r.circuit_id = c.id
                    WHERE (r.year = %s)
                      AND (
                        c.id ILIKE %s OR c.name ILIKE %s OR c.location ILIKE %s
                        OR r.name ILIKE %s OR r.id ILIKE %s
                      )
                      AND (s.type ILIKE %s OR s.id ILIKE %s)
                    LIMIT 1
                """
                res = execute_query(
                    sql,
                    (year, f"%{sub_token}%", f"%{sub_token}%", f"%{sub_token}%", f"%{sub_token}%", f"%{sub_token}%", f"%{stype_str}%", f"%{stype_str.lower()}%"),
                    fetch=True
                )
                if res and len(res) > 0:
                    return res[0]["id"]
        except Exception as e:
            logger.debug(f"[SessionResolver] DB session lookup exception: {e}")
        return None
