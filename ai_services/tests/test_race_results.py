"""
test_race_results.py
Tests real season resolution (2026, 2025, 2024), FastF1 live schedules,
and RaceResultsTool classification without synthetic data or mocks.
"""
import pytest
import fastf1
from app.core.session_resolver import SessionResolver, get_current_f1_season
from app.agents.resolver import get_latest_f1_season
from app.tools.adapters import RaceResultsTool


def test_current_f1_season_detection():
    """Verifies get_current_f1_season dynamically resolves the real current calendar season (2026)."""
    curr = get_current_f1_season()
    assert curr == 2026, f"Expected current season to be 2026, got {curr}"
    latest = get_latest_f1_season()
    assert latest == 2026, f"Expected get_latest_f1_season to match current season (2026), got {latest}"


def test_fastf1_live_schedules():
    """Directly verifies FastF1 returns real championship Grand Prix rounds for 2025 and 2026."""
    sched_2025 = fastf1.get_event_schedule(2025)
    sched_2026 = fastf1.get_event_schedule(2026)
    
    races_2025 = sched_2025[sched_2025["RoundNumber"] > 0]
    races_2026 = sched_2026[sched_2026["RoundNumber"] > 0]
    
    assert len(races_2025) == 24, f"Expected 24 rounds in 2025, got {len(races_2025)}"
    assert len(races_2026) == 23, f"Expected 23 rounds in 2026, got {len(races_2026)}"


def test_unspecified_season_resolution_to_current_season():
    """Queries with no season specified for a completed 2026 GP must resolve to 2026."""
    res = SessionResolver.resolve_session(grand_prix="Austrian GP", season=None, session_type="Race")
    assert res["status"] == "success", f"Resolution failed: {res}"
    assert res["season"] == 2026
    assert res["session_id"] == "2026_austria_gp_race"
    assert res["rows_returned"] >= 20


def test_unspecified_season_resolution_fallback_to_recent_completed_season():
    """
    Queries with no season specified for an event not on the 2026 calendar (Emilia Romagna GP)
    or an event uncompleted in 2026 (Bahrain GP) must fall back to 2025.
    """
    # Emilia Romagna (held in 2025 at Imola, not on 2026 calendar)
    res_imola = SessionResolver.resolve_session(grand_prix="Emilia Romagna GP", season=None, session_type="Race")
    assert res_imola["status"] == "success"
    assert res_imola["season"] == 2025
    assert res_imola["session_id"] == "2025_emilia_romagna_gp_race"

    # Bahrain GP (held in April 2025; in 2026 it is late in the calendar with no results yet)
    res_bahrain = SessionResolver.resolve_session(grand_prix="Bahrain GP", season=None, session_type="Race")
    assert res_bahrain["status"] == "success"
    assert res_bahrain["season"] == 2025
    assert res_bahrain["session_id"] == "2025_bahrain_gp_race"


def test_explicit_season_resolution():
    """Queries with an explicit season must resolve directly to that season."""
    res_2025 = SessionResolver.resolve_session(grand_prix="Japanese GP", season=2025, session_type="Race")
    assert res_2025["status"] == "success"
    assert res_2025["season"] == 2025
    assert res_2025["session_id"] == "2025_japanese_gp_race"

    res_2024 = SessionResolver.resolve_session(grand_prix="Dutch GP", season=2024, session_type="Race")
    assert res_2024["status"] == "success"
    assert res_2024["season"] == 2024
    assert res_2024["session_id"] == "2024_dutch_gp_race"


def test_race_results_tool_execution_and_clean_classification():
    """
    Verifies RaceResultsTool returns complete classification with real drivers and points,
    and contains NO fake root-cause boilerplate.
    """
    tool = RaceResultsTool()
    output = tool.execute({"grand_prix": "Austrian GP", "season": 2026})
    
    assert output.get("status") != "DATA_UNAVAILABLE"
    assert output.get("season") == 2026
    assert output.get("winner") == "George Russell"
    assert "root_cause_analysis" not in output
    
    classification = output.get("classification", [])
    assert len(classification) >= 20
    p1 = classification[0]
    assert p1["driver"] == "George Russell"
    assert p1["position"] == 1
    assert p1["points"] == 25.0
    assert p1["status"] == "Finished"
