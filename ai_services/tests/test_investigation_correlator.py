import unittest
from app.agents.context_builder import build_structured_context
from app.agents.investigation_correlator import InvestigationCorrelator

class TestInvestigationCorrelator(unittest.TestCase):

    def test_multi_domain_root_cause_correlation(self):
        """Verifies multi-domain evidence correlation generates an explicit root-cause reasoning graph."""
        evidence = {
            "telemetry_tool": {
                "driver": "sainz",
                "driver_id": "sainz",
                "lap_number": 22,
                "top_speed": 315.4,
                "average_speed": 235.8,
                "tyres": [{"compound": "MEDIUM", "laps_run": 22}]
            },
            "scoring_tool": {
                "tire_score": 82.5,
                "strategy_score": 75.0,
                "pace_score": 88.0,
                "composite_score": 81.8
            },
            "simulation_tool": {
                "pit_stop_lap": 19,
                "actual_pit_lap": 22,
                "target_compound": "HARD",
                "traffic_loss": 22.0,
                "undercut_gain": -1.4,
                "actual_finishing_position": 3,
                "projected_finishing_position": 3
            },
            "race_results_tool": {
                "grand_prix": "Austrian Grand Prix",
                "winner": "Max Verstappen",
                "podium": ["Max Verstappen", "Lando Norris", "Carlos Sainz"],
                "classification": [
                    {"driver": "Carlos Sainz", "position": 3, "grid": 4, "team": "Scuderia Ferrari", "status": "Finished"}
                ]
            },
            "knowledge_tool": [
                {
                    "title": "Safety Car Regulation",
                    "content": "Article 40.8 governs safety car delta speeds during pit lane entry windows."
                }
            ]
        }
        
        struct_ctx = build_structured_context(evidence, "Why did Ferrari fail?")
        corr = InvestigationCorrelator.correlate(struct_ctx, "Why did Ferrari fail?")
        
        # Verify explicit reasoning graph format
        self.assertIn("reasoning_graph", corr)
        self.assertIn("reasoning_graph_text", corr)
        self.assertTrue(len(corr["reasoning_graph"]) >= 4)
        self.assertIn("↓", corr["reasoning_graph_text"])
        
        # Verify domain correlations reference retrieved tool sources without hallucinations
        self.assertIn("Telemetry", corr["telemetry_findings"])
        self.assertIn("Strategy Simulation", corr["strategy_findings"])
        self.assertIn("Classification", corr["historical_findings"])
        self.assertIn("Regulation", corr["regulations_findings"])
        self.assertIn("Root Cause Chain:", corr["final_recommendation"])

    def test_partial_evidence_correlation(self):
        """Verifies correlation handles partial evidence gracefully without breaking."""
        evidence = {
            "telemetry_tool": {
                "driver_id": "verstappen",
                "lap_number": 40,
                "tyres": [{"compound": "HARD", "laps_run": 40}]
            }
        }
        struct_ctx = build_structured_context(evidence, "What caused Verstappen's pace drop?")
        corr = InvestigationCorrelator.correlate(struct_ctx, "What caused Verstappen's pace drop?")
        
        self.assertIn("reasoning_graph", corr)
        self.assertTrue(len(corr["reasoning_graph"]) > 0)
        self.assertIn("↓", corr["reasoning_graph_text"])


if __name__ == "__main__":
    unittest.main()
