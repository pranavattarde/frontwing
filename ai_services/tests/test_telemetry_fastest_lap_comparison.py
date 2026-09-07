import os
import sys
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from app.core.db import execute_query
from app.tools.adapters import TelemetryTool
from app.agents.planner import run_ai_race_engineer

class TestTelemetryFastestLapComparison:
    """
    Verification Test Suite for:
    1. Strict personal best lap selection for both drivers in comparative queries.
    2. Evidence-grounded synthesized textual sector analysis.
    3. Multi-circuit validation across 3 self-invented driver pairs.
    """

    def test_comparison_1_british_gp_norris_vs_hamilton(self):
        """Pair 1: Norris vs Hamilton at 2024 British Grand Prix."""
        session_id = "2024_british_gp_race"
        
        # 1. Raw DB query verification of MIN(lap_time_ms)
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
        
        tool = TelemetryTool()
        res = tool.execute({
            "session_id": session_id,
            "driver_id": "norris",
            "comparative_driver_id": "hamilton"
        })
        
        assert res.get("status") == "success"
        # Strict personal best lap check
        assert res.get("lap_number") == expected_norris_lap, f"Norris lap {res.get('lap_number')} != expected {expected_norris_lap}"
        assert res.get("comparative_lap_number") == expected_hamilton_lap, f"Hamilton lap {res.get('comparative_lap_number')} != expected {expected_hamilton_lap}"
        
        # Analysis structure validation
        analysis_text = res.get("textual_analysis", "")
        assert "Lando Norris was faster overall on personal best laps" in analysis_text
        assert "Sector 1:" in analysis_text
        assert "Sector 2:" in analysis_text
        assert "Sector 3:" in analysis_text
        assert "Lewis Hamilton" in analysis_text
        assert "Performance Summary:" in analysis_text
        # Norris won S1 and S2, Hamilton won S3
        assert "Lando Norris was the stronger performer in Sector 1, Sector 2" in analysis_text
        assert "Lewis Hamilton held the advantage in Sector 3" in analysis_text

    def test_comparison_2_qatar_gp_verstappen_vs_piastri(self):
        """Pair 2: Verstappen vs Piastri at 2024 Qatar Grand Prix."""
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
        
        tool = TelemetryTool()
        res = tool.execute({
            "session_id": session_id,
            "driver_id": "verstappen",
            "comparative_driver_id": "piastri"
        })
        
        assert res.get("status") == "success"
        assert res.get("lap_number") == expected_ver_lap
        assert res.get("comparative_lap_number") == expected_pia_lap
        
        analysis_text = res.get("textual_analysis", "")
        assert "Max Verstappen was faster overall on personal best laps" in analysis_text
        assert "Sector 1:" in analysis_text
        assert "Sector 2:" in analysis_text
        assert "Sector 3:" in analysis_text
        assert "Performance Summary:" in analysis_text

    def test_comparison_3_hungary_gp_russell_vs_sainz(self):
        """Pair 3: Russell vs Sainz at 2024 Hungarian Grand Prix (2024_13_race)."""
        session_id = "2024_13_race"
        
        russell_pb = execute_query(
            "SELECT lap_number, lap_time_ms FROM laps WHERE session_id = %s AND driver_id = 'russell' AND is_valid = true ORDER BY lap_time_ms ASC LIMIT 1",
            (session_id,), fetch=True
        )
        sainz_pb = execute_query(
            "SELECT lap_number, lap_time_ms FROM laps WHERE session_id = %s AND driver_id = 'sainz' AND is_valid = true ORDER BY lap_time_ms ASC LIMIT 1",
            (session_id,), fetch=True
        )
        expected_rus_lap = int(russell_pb[0]["lap_number"])
        expected_sai_lap = int(sainz_pb[0]["lap_number"])
        
        tool = TelemetryTool()
        res = tool.execute({
            "session_id": session_id,
            "driver_id": "russell",
            "comparative_driver_id": "sainz"
        })
        
        assert res.get("status") == "success"
        assert res.get("lap_number") == expected_rus_lap
        assert res.get("comparative_lap_number") == expected_sai_lap
        
        analysis_text = res.get("textual_analysis", "")
        assert "George Russell was faster overall on personal best laps" in analysis_text
        assert "Sector 1:" in analysis_text
        assert "Sector 2:" in analysis_text
        assert "Sector 3:" in analysis_text
        assert "Carlos Sainz" in analysis_text
        assert "Performance Summary:" in analysis_text

    def test_end_to_end_agent_telemetry_comparison_query(self):
        """Verifies synthesizer surfaces the full 4-part textual analysis in the final answer."""
        query = "Compare Norris and Hamilton telemetry at Silverstone 2024"
        response = run_ai_race_engineer(query)
        
        final_ans = response.get("final_answer", "")
        assert "Lando Norris was faster overall on personal best laps" in final_ans
        assert "Sector 1:" in final_ans
        assert "Sector 2:" in final_ans
        assert "Sector 3:" in final_ans
        assert "Lewis Hamilton" in final_ans
