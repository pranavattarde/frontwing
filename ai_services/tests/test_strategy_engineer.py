"""
Tests for Strategy Engineer - Dedicated isolated strategy planner and counterfactual simulations.
Strict anti-mocking: all tests execute against real PostgreSQL and FastF1 models.
"""

import pytest
from app.agents.strategy_planner import (
    classify_strategy_query,
    detect_unmodeled_variable,
    run_strategy_planner
)


def test_strategy_query_classification():
    """Verifies that incoming strategy queries are strictly classified into strategy_analysis vs strategy_whatif."""
    assert classify_strategy_query("Why did Verstappen finish P2 at the 2024 Dutch Grand Prix?") == "strategy_analysis"
    assert classify_strategy_query("What went wrong with Leclerc's strategy at the 2024 British GP?") == "strategy_analysis"
    assert classify_strategy_query("Analyze Russell's race performance at 2026 Miami GP") == "strategy_analysis"

    assert classify_strategy_query("What if Piastri pitted on lap 18 on hard tires at the 2024 Qatar GP?") == "strategy_whatif"
    assert classify_strategy_query("What if Hamilton pitted 5 laps earlier at the 2024 Dutch GP?") == "strategy_whatif"
    assert classify_strategy_query("Simulate an earlier stop for Norris on lap 22") == "strategy_whatif"


def test_strategy_unmodeled_variable_detection():
    """Verifies that physical vehicle dynamics and setup variables not modeled by SimulationTool are detected."""
    assert detect_unmodeled_variable("What if Verstappen had late braking into Turn 1 at Dutch GP?") == "late braking"
    assert detect_unmodeled_variable("What if Piastri increased front wing flap angle by 2 degrees?") == "front wing"
    assert detect_unmodeled_variable("What if Russell ran in party mode?") == "party mode"
    assert detect_unmodeled_variable("What if Hamilton pitted on lap 20 onto hards?") is None


def test_strategy_query_api_endpoint():
    """Verifies that POST /strategy/query endpoint executes cleanly through FastAPI."""
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)

    response = client.post("/strategy/query", json={"question": "What if Verstappen had late braking into Turn 1 at Dutch GP?"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["query_type"] == "strategy_whatif"
    assert data["is_modeled"] is False



def test_strategy_analysis_execution_verstappen_dutch_gp():
    """Verifies real strategy analysis execution for Max Verstappen at 2024 Dutch GP with all 4 sections."""
    query = "Why did Verstappen finish P2 at the 2024 Dutch Grand Prix?"
    result = run_strategy_planner(query)

    assert result["status"] == "success"
    assert result["query_type"] == "strategy_analysis"
    assert result["driver_name"] == "Max Verstappen"
    assert result["session_id"] == "2024_dutch_gp_race"

    report = result["strategy_report"]
    assert "what_happened" in report
    assert "strategy_cost_analysis" in report
    assert "suggested_alternative" in report

    # 1. What Happened
    what = report["what_happened"]
    assert what["grid_position"] == 2
    assert what["finish_position"] == 2
    assert what["position_delta"] == 0
    assert what["status"] == "Finished"
    assert len(what["stints"]) >= 2
    assert len(what["pit_stops"]) >= 1

    # 2. Strategy Cost Analysis
    cost = report["strategy_cost_analysis"]
    assert 0.0 <= cost["strategy_score"] <= 100.0
    assert 0.0 <= cost["pace_score"] <= 100.0
    assert 0.0 <= cost["tire_score"] <= 100.0
    assert 0.0 <= cost["composite_score"] <= 100.0

    # 3. Suggested Alternative
    alt = report["suggested_alternative"]
    assert alt["candidates_evaluated"] > 0
    assert alt["actual_pit_lap"] == 27
    assert isinstance(alt["simulated_pit_lap"], int)
    assert isinstance(alt["net_time_delta_s"], float)
    assert "undercut_gain_s" in alt
    assert "traffic_loss_s" in alt


def test_strategy_whatif_execution_piastri_qatar_gp():
    """Verifies real counterfactual what-if simulation for Oscar Piastri at 2024 Qatar GP."""
    query = "What if Piastri pitted on lap 18 on hard tires at the 2024 Qatar GP?"
    result = run_strategy_planner(query)

    assert result["status"] == "success"
    assert result["query_type"] == "strategy_whatif"
    assert result["is_modeled"] is True

    sim = result["whatif_simulation"]
    assert sim["is_modeled"] is True
    assert sim["driver_name"] == "Oscar Piastri"

    scen = sim["simulated_scenario"]
    assert scen["simulated_pit_lap"] == 18
    assert scen["target_compound"] == "HARD"
    assert isinstance(scen["finish_position"], int)
    assert isinstance(scen["net_time_delta_s"], float)
    assert scen["net_time_delta_s"] < 0  # Piastri loses time pitting too early on lap 18


def test_strategy_whatif_unmodeled_variable_honesty():
    """Verifies that asking an unmodeled variable returns an honest limitation response in 0ms."""
    query = "What if Verstappen had late braking into Turn 1 at Dutch GP?"
    result = run_strategy_planner(query)

    assert result["status"] == "success"
    assert result["query_type"] == "strategy_whatif"
    assert result["is_modeled"] is False
    assert result["unmodeled_variable"] == "late braking"
    assert "Simulation Limitation" in result["whatif_simulation"]["message"]
    assert result["latency_ms"] < 100  # Fast-path returns in <100ms


def test_openf1_cross_check_agreement_2024_dutch_gp():
    """Verifies that 2024 Dutch GP (Verstappen) pit stop cross-checks with OpenF1 and reports agreement."""
    from app.ingestion.openf1_collector import openf1_collector
    fastf1_pits = [{"pit_stop_number": 1, "lap": 27, "compound_in": "MEDIUM", "compound_out": "HARD"}]
    check = openf1_collector.cross_check_pit_stops("2024_dutch_gp_race", "verstappen", fastf1_pits)

    assert check["status"] == "verified"
    assert check["available"] is True
    assert check["has_discrepancy"] is False
    assert check["narrative_note"] == ""  # Note nothing extra when they agree
    assert check["comparisons"][0]["agrees"] is True
    assert check["comparisons"][0]["openf1_lap"] == 27


def test_openf1_cross_check_discrepancy_2024_british_gp():
    """Verifies that 2024 British GP (Hamilton) detects timing discrepancy between FastF1 stint and OpenF1 in-lap."""
    from app.ingestion.openf1_collector import openf1_collector
    fastf1_pits = [
        {"pit_stop_number": 1, "lap": 27, "compound_in": "MEDIUM", "compound_out": "INTERMEDIATE"},
        {"pit_stop_number": 2, "lap": 38, "compound_in": "INTERMEDIATE", "compound_out": "SOFT"}
    ]
    check = openf1_collector.cross_check_pit_stops("2024_british_gp_race", "hamilton", fastf1_pits)

    assert check["status"] == "discrepancy"
    assert check["has_discrepancy"] is True
    assert "FastF1 and OpenF1 pit lap data disagree" in check["narrative_note"]
    assert check["comparisons"][0]["agrees"] is False
    assert check["comparisons"][0]["fastf1_lap"] == 27
    assert check["comparisons"][0]["openf1_lap"] == 28
    assert check["comparisons"][1]["agrees"] is True


def test_openf1_cross_check_pre2023_fallback():
    """Verifies that pre-2023 session gracefully falls back to FastF1-only without failing the report."""
    from app.ingestion.openf1_collector import openf1_collector
    fastf1_pits = [{"pit_stop_number": 1, "lap": 1, "compound_in": "SOFT", "compound_out": "MEDIUM"}]
    check = openf1_collector.cross_check_pit_stops("2022_british_gp_race", "verstappen", fastf1_pits)

    assert check["status"] == "unavailable"
    assert check["available"] is False
    assert check["has_discrepancy"] is False
    assert "pre-2023 event" in check["message"]
    assert "FastF1 primary data" in check["narrative_note"]

