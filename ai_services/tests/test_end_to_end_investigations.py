"""
test_end_to_end_investigations.py
End-to-end integration tests executing the multi-agent AI race engineer pipeline
against real ingested PostgreSQL sessions. Validates report structures, short-bullet summaries,
absence of raw JSON/status leaks, and honest unsupported metric responses.
"""
import pytest
from app.agents.planner import run_ai_race_engineer


def _assert_valid_investigation(result: dict, query_name: str):
    """Helper verifying that an investigation returns a valid, structured, human-readable report."""
    assert isinstance(result, dict), f"Query '{query_name}' failed to return dict"
    
    answer = result.get("final_answer", "")
    assert len(answer) > 0, f"Query '{query_name}' returned empty final_answer"
    assert "{" not in answer, f"Query '{query_name}' leaked raw JSON in final_answer"
    assert "missing_data" not in answer.lower(), f"Query '{query_name}' leaked raw missing_data status"
    assert "system error" not in answer.lower(), f"Query '{query_name}' leaked raw system error"

    report = result.get("investigation_report", {})
    assert isinstance(report, dict), f"Query '{query_name}' missing investigation_report"
    assert "Executive Summary" in report, f"Query '{query_name}' missing Executive Summary"
    
    # Executive Summary must NOT contain unformatted markdown table dump
    exec_summary = report.get("Executive Summary", "")
    assert "|" not in exec_summary, f"Query '{query_name}' dumped raw markdown table in Executive Summary"


def test_e2e_winner_query():
    """Verifies winner query resolves to real classification and produces concise executive summary."""
    res = run_ai_race_engineer("Who won Austrian GP?")
    _assert_valid_investigation(res, "Who won Austrian GP?")
    answer = res.get("final_answer", "")
    assert "Russell" in answer or "George" in answer


def test_e2e_comparative_telemetry_query():
    """Verifies dual-driver head-to-head query surfaces personal best deltas and structured analysis."""
    res = run_ai_race_engineer("Compare Norris and Hamilton telemetry at Silverstone 2024")
    _assert_valid_investigation(res, "Compare Norris and Hamilton Silverstone 2024")
    
    # Verdict has short bullet summary
    exec_summary = res.get("investigation_report", {}).get("Executive Summary", "")
    assert "Norris" in exec_summary or "Hamilton" in exec_summary
    
    # Detailed findings has sector breakdown
    findings = res.get("investigation_report", {}).get("Telemetry Findings", "")
    assert "Sector 1:" in findings or "Sector" in findings


def test_e2e_strategy_simulation_query():
    """Verifies what-if pit query binds parameters and projects finishing outcome."""
    res = run_ai_race_engineer("What if Piastri pitted on lap 18 at Qatar in 2024?")
    _assert_valid_investigation(res, "What if Piastri pitted on lap 18 at Qatar")
    tools = res.get("tools_used", []) or res.get("intelligence_trace", {}).get("executed_tools", [])
    assert "simulation_tool" in tools


def test_e2e_scoring_scorecard_query():
    """Verifies performance debrief query runs scoring tool on real lap timing."""
    res = run_ai_race_engineer("Analyze Sainz's race performance scores at Austria in 2024")
    _assert_valid_investigation(res, "Analyze Sainz's race performance scores")
    tools = res.get("tools_used", []) or res.get("intelligence_trace", {}).get("executed_tools", [])
    assert "scoring_tool" in tools


def test_e2e_unsupported_metric_query():
    """Verifies queries for unsupported telemetry metrics honestly declare missing coverage."""
    query = "What was Hamilton's brake pressure in PSI at Monaco in 2024?"
    res = run_ai_race_engineer(query)
    ans = res.get("final_answer", "")
    assert "I do not currently have verified data for this metric" in ans
    assert "won the" not in ans
    assert res.get("confidence", 100) <= 30.0


def test_e2e_pit_timing_query():
    """Verifies pit timing questions report actual pit stop laps rather than race winner facts."""
    query = "When did Verstappen pit at Qatar in 2024?"
    res = run_ai_race_engineer(query)
    ans = res.get("final_answer", "")
    assert "won the" not in ans
    assert any(term in ans.lower() for term in ["pitted", "lap", "stop"])
