import sys
import os
import json
import dotenv

dotenv.load_dotenv('ai_services/.env')
sys.path.insert(0, 'ai_services')

from app.core.session_resolver import SessionResolver
from app.agents.memory import conversation_memory

def print_banner(title):
    print("\n" + "="*80)
    print(f" {title}")
    print("="*80)

def test_season_policy():
    print_banner("TESTING CENTRALIZED SEASON RESOLUTION POLICY")

    # Tier 1: Explicit User Year
    print_banner("TIER 1: EXPLICIT USER YEAR")
    res_t1_a = SessionResolver.resolve_session("Monaco GP", season=2024)
    print(f"Explicit 2024 Monaco: session_id={res_t1_a.get('session_id')}, season={res_t1_a.get('season')}")
    assert res_t1_a.get("season") == 2024 and "2024" in res_t1_a.get("session_id")

    res_t1_b = SessionResolver.resolve_session("Monaco GP", season=2026)
    print(f"Explicit 2026 Monaco: session_id={res_t1_b.get('session_id')}, season={res_t1_b.get('season')}")
    assert res_t1_b.get("season") == 2026 and "2026" in res_t1_b.get("session_id")

    # Tier 3: Standalone query with no year (Must pick latest VERIFIED/COMPLETE session)
    print_banner("TIER 3: STANDALONE QUERY WITH NO YEAR (LATEST VERIFIED/COMPLETE SESSION)")
    res_t3_spain = SessionResolver.resolve_session("Spanish GP", season=None)
    print(f"Unstated Spain: session_id={res_t3_spain.get('session_id')}, season={res_t3_spain.get('season')}, rows={res_t3_spain.get('rows_returned')}")
    assert res_t3_spain.get("season") == 2024 and res_t3_spain.get("rows_returned") >= 15

    res_t3_monaco = SessionResolver.resolve_session("Monaco GP", season=None)
    print(f"Unstated Monaco: session_id={res_t3_monaco.get('session_id')}, season={res_t3_monaco.get('season')}, rows={res_t3_monaco.get('rows_returned')}")
    assert res_t3_monaco.get("season") == 2024 and res_t3_monaco.get("rows_returned") >= 15

    res_t3_brazil = SessionResolver.resolve_session("Brazilian GP", season=None)
    print(f"Unstated Brazil: session_id={res_t3_brazil.get('session_id')}, season={res_t3_brazil.get('season')}, rows={res_t3_brazil.get('rows_returned')}")
    assert res_t3_brazil.get("season") == 2024

    # Tier 2: Active Investigation Context
    print_banner("TIER 2: ACTIVE INVESTIGATION CONTEXT (FOLLOW-UP vs NEW GP)")
    cid = "test_thread_aut_2024"
    conversation_memory.save_message(
        conversation_id=cid,
        question="Who won Austria in 2024?",
        answer="George Russell won.",
        context={"session_id": "2024_austria_gp_race", "driver_id": "russell"}
    )
    
    # Follow-up query without GP -> Inherits active investigation session
    ctx_fu = conversation_memory.resolve_context(cid, "What about Verstappen?")
    print(f"Follow-up context ('What about Verstappen?'): {ctx_fu}")
    assert ctx_fu.get("session_id") == "2024_austria_gp_race"

    # Query with new GP ("who won in sao paulo?") -> Clears active session so SessionResolver resolves the new GP
    ctx_new = conversation_memory.resolve_context(cid, "who won in sao paulo?")
    print(f"New GP query context ('who won in sao paulo?'): {ctx_new}")
    assert ctx_new.get("session_id") is None

    print_banner("ALL TIER TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_season_policy()
