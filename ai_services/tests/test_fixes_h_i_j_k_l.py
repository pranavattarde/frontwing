import pytest
from app.tools.adapters import TelemetryTool, execute_query


@pytest.fixture(scope="module")
def telemetry_tool():
    return TelemetryTool()


def test_fix_h_stint_bounded_tyre_degradation_reset(telemetry_tool):
    """FIX H: Verify tyre degradation is stint-bounded and resets near zero after a pit stop."""
    res = telemetry_tool.execute({
        "session_id": "2024_dutch_gp_race",
        "driver_id": "verstappen"
    })
    assert res.get("status") == "success"
    deg_list = res.get("tyre_degradation", [])
    assert len(deg_list) >= 70

    # Separate into Stint 1 and Stint 2
    stint1 = [p for p in deg_list if p.get("stint") == 1]
    stint2 = [p for p in deg_list if p.get("stint") == 2]
    assert len(stint1) == 27
    assert len(stint2) == 45

    # Lap 1 is standing start
    assert stint1[0]["lap"] == 1
    assert stint1[0]["wear_pct"] is None
    assert stint1[0].get("note") == "START-LAP"

    # Stint 1 first clean lap (Lap 2) baseline: wear is 0.0%
    assert stint1[1]["lap"] == 2
    assert stint1[1]["wear_pct"] == 0.0
    assert stint1[1]["pace_loss_s"] == 0.0

    # Stint 2 out-lap (Lap 28) has None wear and note OUT-LAP
    assert stint2[0]["lap"] == 28
    assert stint2[0]["wear_pct"] is None
    assert stint2[0].get("note") == "OUT-LAP"

    # Stint 2 first clean lap (Lap 29) RESETS to 0.0% wear and 0.000s pace loss
    assert stint2[1]["lap"] == 29
    assert stint2[1]["wear_pct"] == 0.0
    assert stint2[1]["pace_loss_s"] == 0.0


def test_fix_i_dutch_gp_fastest_lap_and_winner(telemetry_tool):
    """FIX I: Verify Dutch GP 2024 Norris vs Verstappen gives correct personal bests and Norris as faster driver."""
    res = telemetry_tool.execute({
        "session_id": "2024_dutch_gp_race",
        "driver_id": "verstappen",
        "comparative_driver_id": "norris"
    })
    assert res.get("status") == "success"

    # Verify fastest laps
    assert res.get("lap_number") == 30  # Verstappen PB
    assert res.get("comparative_lap_number") == 72  # Norris PB
    assert res.get("lap_time_s") == 74.752
    assert res.get("comparative_lap_time_s") == 73.817

    # Verify faster driver and delta
    comp = res.get("comparative_analysis", {})
    assert "Norris" in comp.get("faster_driver", "")
    assert comp.get("lap_delta_s") == 0.935


def test_fix_j_auto_backfill_trigger(telemetry_tool):
    """FIX J: Verify querying a session or driver without full telemetry triggers auto-backfill instead of flat failure."""
    res = telemetry_tool.execute({
        "session_id": "2024_italian_gp_race",
        "driver_id": "verstappen",
        "comparative_driver_id": "hamilton"
    })
    # Must either be backfilling or succeed if backfill completed
    assert res.get("status") in ["backfilling", "success"]
    if res.get("status") == "backfilling":
        assert "downloading" in res.get("message", "").lower() or "backfill" in res.get("message", "").lower()


def test_fix_k_gear_trace_integrity(telemetry_tool):
    """FIX K: Verify gear trace contains real non-zero integer gears without fake speed formulas."""
    res = telemetry_tool.execute({
        "session_id": "2024_dutch_gp_race",
        "driver_id": "verstappen",
        "comparative_driver_id": "norris"
    })
    assert res.get("has_gear_data") is True

    pts_a = res.get("speed_trace", [])
    pts_b = res.get("comparative_speed_trace", [])
    gears_a = {p.get("gear") for p in pts_a if p.get("gear") is not None}
    gears_b = {p.get("gear") for p in pts_b if p.get("gear") is not None}

    # Verify non-zero integers present
    assert any(g > 0 for g in gears_a)
    assert any(g > 0 for g in gears_b)
    # Check that high gears (e.g. 7 or 8) exist
    assert 7 in gears_a or 8 in gears_a
    assert 7 in gears_b or 8 in gears_b


def test_fix_l_sector_winner_badges(telemetry_tool):
    """FIX L: Verify sector comparison includes explicit 🏆 [DRIVER] FASTER badges."""
    res = telemetry_tool.execute({
        "session_id": "2024_dutch_gp_race",
        "driver_id": "verstappen",
        "comparative_driver_id": "norris"
    })
    sec_times = res.get("sector_times", [])
    assert len(sec_times) == 3
    for s in sec_times:
        badge = s.get("winner_badge", "")
        assert "🏆" in badge
        assert "FASTER" in badge

    comp = res.get("comparative_analysis", {})
    breakdown = comp.get("sector_breakdown", {})
    for s_id in ["S1", "S2", "S3"]:
        badge = breakdown[s_id].get("winner_badge", "")
        assert "🏆" in badge
        assert "FASTER" in badge
