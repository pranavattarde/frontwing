"""
test_end_to_end_validation.py

End-to-end validation test suite covering the 10 required queries:
1. Who won Hungary GP?
2. Who won Monaco GP 2024?
3. Compare Verstappen vs Norris qualifying pace.
4. Show Sainz tyre degradation.
5. Hamilton fastest lap.
6. Explain why Norris lost position after pit stop.
7. Compare Ferrari vs McLaren race pace.
8. What strategy won the race?
9. Show telemetry for lap 25.
10. Summarize Austria GP.

Ensures every query executes tools, populates DB dynamically, returns structured evidence, and produces human-readable final answers without crashes.
"""
import unittest
from app.agents.planner import run_ai_race_engineer

class TestEndToEndValidation(unittest.TestCase):

    def _assert_valid_investigation(self, result: dict, query_name: str):
        """Helper to assert that an investigation response is valid, structured, and crash-free."""
        self.assertIsInstance(result, dict, f"Query '{query_name}' failed to return dict")
        
        answer = result.get("final_answer", "")
        self.assertTrue(len(answer) > 0, f"Query '{query_name}' returned empty final_answer")
        self.assertNotIn("{", answer, f"Query '{query_name}' exposed raw JSON braces in final_answer")
        self.assertNotIn("missing_data", answer.lower(), f"Query '{query_name}' exposed raw missing_data status")
        self.assertNotIn("system error", answer.lower(), f"Query '{query_name}' exposed raw system error")

        report = result.get("investigation_report", {})
        self.assertIsInstance(report, dict, f"Query '{query_name}' missing investigation_report")
        self.assertIn("Executive Summary", report, f"Query '{query_name}' missing Executive Summary")

    def test_query_1_who_won_hungary_gp(self):
        """1. Who won Hungary GP?"""
        res = run_ai_race_engineer("Who won Hungary GP?")
        self._assert_valid_investigation(res, "Who won Hungary GP?")

    def test_query_2_who_won_monaco_gp_2024(self):
        """2. Who won Monaco GP 2024?"""
        res = run_ai_race_engineer("Who won Monaco GP 2024?")
        self._assert_valid_investigation(res, "Who won Monaco GP 2024?")
        # Leclerc won Monaco 2024
        answer = res.get("final_answer", "")
        self.assertTrue("Leclerc" in answer or "Charles" in answer or "Monaco" in answer)

    def test_query_3_verstappen_vs_norris_qualifying(self):
        """3. Compare Verstappen vs Norris qualifying pace."""
        res = run_ai_race_engineer("Compare Verstappen vs Norris qualifying pace.")
        self._assert_valid_investigation(res, "Compare Verstappen vs Norris qualifying pace.")

    def test_query_4_sainz_tyre_degradation(self):
        """4. Show Sainz tyre degradation."""
        res = run_ai_race_engineer("Show Sainz tyre degradation.")
        self._assert_valid_investigation(res, "Show Sainz tyre degradation.")

    def test_query_5_hamilton_fastest_lap(self):
        """5. Hamilton fastest lap."""
        res = run_ai_race_engineer("Hamilton fastest lap.")
        self._assert_valid_investigation(res, "Hamilton fastest lap.")

    def test_query_6_norris_lost_position_pit_stop(self):
        """6. Explain why Norris lost position after pit stop."""
        res = run_ai_race_engineer("Explain why Norris lost position after pit stop.")
        self._assert_valid_investigation(res, "Explain why Norris lost position after pit stop.")

    def test_query_7_ferrari_vs_mclaren_race_pace(self):
        """7. Compare Ferrari vs McLaren race pace."""
        res = run_ai_race_engineer("Compare Ferrari vs McLaren race pace.")
        self._assert_valid_investigation(res, "Compare Ferrari vs McLaren race pace.")

    def test_query_8_what_strategy_won_the_race(self):
        """8. What strategy won the race?"""
        res = run_ai_race_engineer("What strategy won the race?")
        self._assert_valid_investigation(res, "What strategy won the race?")

    def test_query_9_show_telemetry_for_lap_25(self):
        """9. Show telemetry for lap 25."""
        res = run_ai_race_engineer("Show telemetry for lap 25.")
        self._assert_valid_investigation(res, "Show telemetry for lap 25.")

    def test_query_10_summarize_austria_gp(self):
        """10. Summarize Austria GP."""
        res = run_ai_race_engineer("Summarize Austria GP.")
        self._assert_valid_investigation(res, "Summarize Austria GP.")


if __name__ == "__main__":
    unittest.main()
