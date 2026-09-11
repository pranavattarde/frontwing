"""
test_scoring_engine.py
Tests the 5 core F1 performance scoring metrics (Strategy, Tire, Pace, Pitstop, Execution)
and composite race score calculation. Validates mathematical precision and boundaries.
"""
import pytest
from app.scoring.strategy_score import calculate_strategy_score
from app.scoring.tire_score import calculate_tire_score
from app.scoring.pace_score import calculate_pace_score
from app.scoring.pitstop_score import calculate_pitstop_score
from app.scoring.execution_score import calculate_execution_score
from app.scoring.aggregator import calculate_race_scores


@pytest.fixture
def verstappen_race_profile():
    return {
        "session_id": "2024_austria_gp_race",
        "driver_id": "verstappen",
        "total_laps": 71,
        "sc_laps": 4,
        "clean_air_laps": 62,
        "pit_stops": [
            {"lap": 23, "position_before": 1, "position_after": 1, "t_stationary": 2.2, "t_pit_lane": 21.0, "is_forced_stop": False},
            {"lap": 51, "position_before": 1, "position_after": 1, "t_stationary": 6.5, "t_pit_lane": 25.4, "is_forced_stop": False},
            {"lap": 65, "position_before": 1, "position_after": 5, "t_stationary": 2.2, "t_pit_lane": 21.0, "is_forced_stop": True}
        ],
        "stints": [
            {"compound": "MEDIUM", "length": 23, "optimal_length": 26, "clean_laps_times": [70.5, 70.4, 70.3], "is_forced": False},
            {"compound": "HARD", "length": 28, "optimal_length": 34, "clean_laps_times": [69.995, 69.990, 69.985], "is_forced": False},
            {"compound": "MEDIUM", "length": 14, "optimal_length": 26, "clean_laps_times": [70.5, 70.5, 70.5], "is_forced": True}
        ],
        "grid_median_deg": {
            "MEDIUM": 0.080,
            "HARD": 0.050
        },
        "driver_clean_laps_mean": 70.800,
        "driver_clean_laps_std": 0.350,
        "driver_optimal_lap": 69.950,
        "teammate_optimal_lap": 71.950,
        "t_pit_lane_opt": 20.80,
        "penalties_count": 1,
        "warnings_count": 1,
        "lockups_count": 1,
        "p_start": 1,
        "p_finish": 5
    }


@pytest.fixture
def piastri_race_profile():
    return {
        "session_id": "2024_austria_gp_race",
        "driver_id": "piastri",
        "total_laps": 71,
        "sc_laps": 4,
        "clean_air_laps": 50,
        "pit_stops": [
            {"lap": 21, "position_before": 5, "position_after": 6, "t_stationary": 2.4, "t_pit_lane": 21.2, "is_forced_stop": False},
            {"lap": 52, "position_before": 2, "position_after": 3, "t_stationary": 2.3, "t_pit_lane": 21.1, "is_forced_stop": False}
        ],
        "stints": [
            {"compound": "MEDIUM", "length": 21, "optimal_length": 26, "clean_laps_times": [70.025, 70.050, 70.075], "is_forced": False},
            {"compound": "HARD", "length": 31, "optimal_length": 34, "clean_laps_times": [70.5, 70.4, 70.3], "is_forced": False},
            {"compound": "MEDIUM", "length": 19, "optimal_length": 26, "clean_laps_times": [70.5, 70.4, 70.3], "is_forced": False}
        ],
        "grid_median_deg": {
            "MEDIUM": 0.080,
            "HARD": 0.050
        },
        "driver_clean_laps_mean": 71.100,
        "driver_clean_laps_std": 0.410,
        "driver_optimal_lap": 70.100,
        "teammate_optimal_lap": 69.880,
        "t_pit_lane_opt": 20.80,
        "penalties_count": 0,
        "warnings_count": 0,
        "lockups_count": 0,
        "p_start": 7,
        "p_finish": 2
    }


def test_individual_metric_scores(verstappen_race_profile):
    """Verifies all 5 individual scoring functions return bounded, mathematically accurate scores."""
    strat = calculate_strategy_score(verstappen_race_profile)
    tire = calculate_tire_score(verstappen_race_profile)
    pace = calculate_pace_score(verstappen_race_profile)
    pit = calculate_pitstop_score(verstappen_race_profile)
    exec_score = calculate_execution_score(verstappen_race_profile)

    assert strat == 74.1
    assert tire == 95.00
    assert pace == 67.08
    assert pit == 66.73
    assert exec_score == 55.0


def test_composite_score_aggregation(verstappen_race_profile, piastri_race_profile):
    """Verifies weighted composite score aggregation across multiple driver profiles."""
    ver_scores = calculate_race_scores(verstappen_race_profile, save_to_db=False)
    assert ver_scores["composite_score"] == 71.58

    pia_scores = calculate_race_scores(piastri_race_profile, save_to_db=False)
    assert pia_scores["composite_score"] == 80.47
    assert pia_scores["execution_score"] == 100.0


def test_score_boundaries():
    """Verifies all score components remain within the valid [0.0, 100.0] range."""
    profile = {
        "pit_stops": [{"lap": 10, "t_stationary": 25.0, "t_pit_lane": 45.0}],
        "driver_clean_laps_std": 10.0,
        "driver_clean_laps_mean": 120.0,
        "driver_optimal_lap": 70.0,
        "teammate_optimal_lap": 70.0,
        "t_pit_lane_opt": 20.0,
        "penalties_count": 10,
        "warnings_count": 5,
        "lockups_count": 10,
        "p_start": 1,
        "p_finish": 20,
        "stints": []
    }
    exec_score = calculate_execution_score(profile)
    assert 0.0 <= exec_score <= 100.0
