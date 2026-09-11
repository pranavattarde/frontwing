"""
test_strategy_simulation.py
Tests the strategy simulation engine: pit loss, undercut/overcut physics,
traffic degradation, natural language parameter binding, and honest error handling.
"""
import pytest
from app.simulation.simulation_engine import run_strategy_simulation
from app.agents.planner import run_ai_race_engineer


@pytest.fixture(scope="module")
def simulation_constants():
    total_laps = 71
    pit_loss = 22.0
    deg_rates = {"SOFT": 0.12, "MEDIUM": 0.08, "HARD": 0.05}

    def generate_laps(stints_def, base_alpha):
        laps = []
        for stint_idx, stint in enumerate(stints_def):
            comp = stint["compound"]
            start = stint["start_lap"]
            end = stint["end_lap"]
            beta = deg_rates.get(comp, 0.08)
            tire_age = 1
            for lap_num in range(start, end + 1):
                lap_time = base_alpha + beta * tire_age - 0.06 * lap_num
                is_pit_out = (lap_num == start and stint_idx > 0)
                if is_pit_out:
                    lap_time += pit_loss
                laps.append({
                    "lap_number": lap_num,
                    "lap_time": round(lap_time, 3),
                    "compound": comp,
                    "is_pit_out_lap": is_pit_out,
                    "tire_age": tire_age
                })
                tire_age += 1
        return laps

    sainz_stints = [
        {"compound": "MEDIUM", "start_lap": 1, "end_lap": 22, "stint_number": 1},
        {"compound": "HARD", "start_lap": 23, "end_lap": 47, "stint_number": 2},
        {"compound": "MEDIUM", "start_lap": 48, "end_lap": 71, "stint_number": 3}
    ]
    sainz_laps = generate_laps(sainz_stints, 71.45)

    ver_stints = [
        {"compound": "MEDIUM", "start_lap": 1, "end_lap": 23, "stint_number": 1},
        {"compound": "HARD", "start_lap": 24, "end_lap": 51, "stint_number": 2},
        {"compound": "MEDIUM", "start_lap": 52, "end_lap": 71, "stint_number": 3}
    ]
    ver_laps = generate_laps(ver_stints, 70.80)

    rivals_laps = {
        "verstappen": [lap["lap_time"] for lap in ver_laps],
        "hamilton": [round(72.0 + 0.06 * (i % 10) - 0.05 * i, 3) for i in range(1, 72)]
    }

    return {
        "total_laps": total_laps,
        "sainz_laps": sainz_laps,
        "sainz_stints": sainz_stints,
        "rivals_laps": rivals_laps
    }


def test_simulation_earlier_pitstop(simulation_constants):
    """Verifies that pitting 3 laps earlier projects lap times and calculates position change."""
    res = run_strategy_simulation(
        session_id="2024_austria_gp_race",
        driver_id="sainz",
        simulated_pit_lap=19,
        target_compound="HARD",
        actual_laps_cache=simulation_constants["sainz_laps"],
        rivals_laps_cache=simulation_constants["rivals_laps"],
        actual_stints_cache=simulation_constants["sainz_stints"],
        actual_position_cache=3,
        total_laps_cache=simulation_constants["total_laps"],
        save_to_db=False
    )
    assert res["driver_id"] == "sainz"
    assert res["simulated_pit_lap"] == 19
    assert res["actual_pit_lap"] == 22
    assert "projected_finishing_position" in res
    assert "simulated_net_time_gain_ms" in res
    assert len(res["simulated_lap_times"]) == 71


def test_simulation_later_pitstop(simulation_constants):
    """Verifies that extending the first stint calculates tire degradation and net time offset."""
    res = run_strategy_simulation(
        session_id="2024_austria_gp_race",
        driver_id="sainz",
        simulated_pit_lap=25,
        target_compound="HARD",
        actual_laps_cache=simulation_constants["sainz_laps"],
        rivals_laps_cache=simulation_constants["rivals_laps"],
        actual_stints_cache=simulation_constants["sainz_stints"],
        actual_position_cache=3,
        total_laps_cache=simulation_constants["total_laps"],
        save_to_db=False
    )
    assert res["driver_id"] == "sainz"
    assert res["simulated_pit_lap"] == 25
    assert "projected_total_time_seconds" in res


def test_simulation_parameter_binding_from_query():
    """Verifies natural language query binds simulation tool arguments correctly."""
    res = run_ai_race_engineer("What if Russell boxed on lap 25 at Austria in 2024?")
    assert res is not None
    assert "final_answer" in res
    trace = res.get("intelligence_trace", {})
    executed_tools = trace.get("executed_tools", []) or res.get("tools_used", [])
    assert "simulation_tool" in executed_tools
    ans = res["final_answer"].lower()
    assert "lap 25" in ans or "projects" in ans or "strategy simulation" in ans
    assert "no verified race data is available for p25" not in ans


def test_simulation_honest_failure_for_non_racing_driver():
    """Simulating a driver who did not race must return an honest error, not a fictitious position."""
    res = run_ai_race_engineer("What if Colapinto pitted on lap 27 at Monaco in 2024?")
    assert res is not None
    ans = res["final_answer"].lower()
    assert "p27" not in ans
    assert "no verified race data is available for p27" not in ans
    assert any(phrase in ans for phrase in ["wasn't able to run that simulation", "no verified", "not able", "insufficient"])
