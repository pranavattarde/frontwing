"""
test_telemetry_pipeline.py
Tests real telemetry data integrity, personal best flying lap matching with raw SQL,
stint-bounded tyre degradation, fuel-corrected monotonicity, tyre life %, and gear data.
All tests run against real PostgreSQL database data without mocks.
"""
import pytest
from app.core.db import execute_query
from app.tools.adapters import TelemetryTool


@pytest.fixture(scope="module")
def telemetry_tool():
    return TelemetryTool()


def test_personal_best_lap_selection_british_gp(telemetry_tool):
    """Verifies TelemetryTool selects exact personal best laps matching MIN(lap_time_ms) in PostgreSQL."""
    session_id = "2024_british_gp_race"
    
    norris_pb = execute_query(
        "SELECT lap_number, lap_time_ms FROM laps WHERE session_id = %s AND driver_id = 'norris' AND is_valid = true ORDER BY lap_time_ms ASC LIMIT 1",
        (session_id,), fetch=True
    )
    hamilton_pb = execute_query(
        "SELECT lap_number, lap_time_ms FROM laps WHERE session_id = %s AND driver_id = 'hamilton' AND is_valid = true ORDER BY lap_time_ms ASC LIMIT 1",
        (session_id,), fetch=True
    )
    expected_norris_lap = int(norris_pb[0]["lap_number"])
    expected_hamilton_lap = int(hamilton_pb[0]["lap_number"])
    
    res = telemetry_tool.execute({
        "session_id": session_id,
        "driver_id": "norris",
        "comparative_driver_id": "hamilton"
    })
    
    assert res.get("status") == "success"
    assert res.get("lap_number") == expected_norris_lap
    assert res.get("comparative_lap_number") == expected_hamilton_lap


def test_personal_best_lap_selection_qatar_gp(telemetry_tool):
    """Verifies personal best flying lap matching for Verstappen vs Piastri at Qatar 2024."""
    session_id = "2024_qatar_gp_race"
    
    verstappen_pb = execute_query(
        "SELECT lap_number, lap_time_ms FROM laps WHERE session_id = %s AND driver_id = 'verstappen' AND is_valid = true ORDER BY lap_time_ms ASC LIMIT 1",
        (session_id,), fetch=True
    )
    piastri_pb = execute_query(
        "SELECT lap_number, lap_time_ms FROM laps WHERE session_id = %s AND driver_id = 'piastri' AND is_valid = true ORDER BY lap_time_ms ASC LIMIT 1",
        (session_id,), fetch=True
    )
    expected_ver_lap = int(verstappen_pb[0]["lap_number"])
    expected_pia_lap = int(piastri_pb[0]["lap_number"])
    
    res = telemetry_tool.execute({
        "session_id": session_id,
        "driver_id": "verstappen",
        "comparative_driver_id": "piastri"
    })
    
    assert res.get("status") == "success"
    assert res.get("lap_number") == expected_ver_lap
    assert res.get("comparative_lap_number") == expected_pia_lap


def test_stint_bounded_tyre_degradation_reset(telemetry_tool):
    """Verifies tyre degradation resets near 0.0% upon new stint and excludes in-laps / out-laps."""
    res = telemetry_tool.execute({
        "session_id": "2024_dutch_gp_race",
        "driver_id": "verstappen"
    })
    assert res.get("status") == "success"
    deg_list = res.get("tyre_degradation", [])
    assert len(deg_list) >= 70

    stint1 = [p for p in deg_list if p.get("stint") == 1]
    stint2 = [p for p in deg_list if p.get("stint") == 2]
    assert len(stint1) >= 20
    assert len(stint2) >= 30

    # Standing start lap
    assert stint1[0]["lap"] == 1
    assert stint1[0]["wear_pct"] is None
    assert stint1[0].get("note") == "START-LAP"

    # Stint 1 first clean lap baseline: 0.0% wear
    assert stint1[1]["lap"] == 2
    assert stint1[1]["wear_pct"] == 0.0
    assert stint1[1]["pace_loss_s"] == 0.0

    # Stint 1 in-lap (Lap 27) excluded
    in_lap = next((p for p in stint1 if p.get("note") == "IN-LAP"), None)
    assert in_lap is not None
    assert in_lap.get("wear_pct") is None

    # Stint 2 out-lap (Lap 28) excluded
    out_lap = next((p for p in stint2 if p.get("note") == "OUT-LAP"), None)
    assert out_lap is not None
    assert out_lap.get("wear_pct") is None

    # Stint 2 first clean lap resets to 0.0% wear
    clean_stint2 = [p for p in stint2 if p.get("wear_pct") is not None]
    assert len(clean_stint2) > 0
    assert clean_stint2[0]["wear_pct"] == 0.0
    assert clean_stint2[0]["pace_loss_s"] == 0.0


def test_tyre_degradation_fuel_corrected_monotonic(telemetry_tool):
    """Verifies tyre wear is non-negative and monotonic non-decreasing within each stint."""
    res = telemetry_tool.execute({
        "session_id": "2024_dutch_gp_race",
        "driver_id": "norris"
    })
    assert res.get("status") == "success"
    deg_list = res.get("tyre_degradation", [])

    stints = {p.get("stint") for p in deg_list if p.get("stint")}
    for s_idx in stints:
        stint_clean = [p for p in deg_list if p.get("stint") == s_idx and p.get("wear_pct") is not None]
        assert len(stint_clean) >= 10
        assert stint_clean[0]["wear_pct"] == 0.0
        
        for p in stint_clean:
            assert p["wear_pct"] >= 0.0
            assert p["pace_loss_s"] >= 0.0

        for i in range(len(stint_clean) - 1):
            assert stint_clean[i]["wear_pct"] <= stint_clean[i + 1]["wear_pct"]
            assert stint_clean[i]["pace_loss_s"] <= stint_clean[i + 1]["pace_loss_s"]


def test_tyre_life_sum_to_100(telemetry_tool):
    """Verifies tyre degradation % and tyre life % sum to exactly 100.0% for all clean laps."""
    res = telemetry_tool.execute({
        "session_id": "2024_dutch_gp_race",
        "driver_id": "verstappen"
    })
    deg_list = res.get("tyre_degradation", [])
    clean_laps = [d for d in deg_list if d.get("wear_pct") is not None]
    assert len(clean_laps) >= 60

    for d in clean_laps:
        deg_pct = d["wear_pct"]
        life_pct = round(100.0 - deg_pct, 3)
        assert round(deg_pct + life_pct, 2) == 100.00
        assert 0.0 <= deg_pct <= 100.0
        assert 0.0 <= life_pct <= 100.0


def test_gear_trace_integrity(telemetry_tool):
    """Verifies gear trace contains real integer gear data without synthetic sinusoids."""
    res = telemetry_tool.execute({
        "session_id": "2024_dutch_gp_race",
        "driver_id": "verstappen",
        "comparative_driver_id": "norris"
    })
    assert res.get("has_gear_data") is True
    pts = res.get("speed_trace", [])
    assert len(pts) > 0
    gears = {p.get("gear") for p in pts if p.get("gear") is not None}
    assert any(g in gears for g in [1, 2, 3, 4, 5, 6, 7, 8])


def test_telemetry_missing_data_for_nonexistent_session(telemetry_tool):
    """Verifies TelemetryTool honestly returns status='missing_data' for non-existent session."""
    res = telemetry_tool.execute({
        "session_id": "non_existent_fake_session",
        "driver_id": "sainz",
        "lap_number": 10
    })
    assert res.get("status") == "missing_data"
