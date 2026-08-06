import unittest
from app.agents.planner import adaptive_plan_extract, plan_node, execute_node

class TestAdaptivePlanner(unittest.TestCase):

    def test_example_1_who_won_monaco(self):
        """Verifies 'Who won Monaco GP?' adaptively extracts race_result intent and chooses ONLY race_results_tool."""
        q = "Who won Monaco GP?"
        res = adaptive_plan_extract(q)
        
        self.assertEqual(res["intent"], "race_result")
        self.assertEqual(res["entities"]["grand_prix"], "Monaco GP")
        self.assertIn("race_winner", res["required_evidence"])
        self.assertIn("classification", res["missing_evidence"])
        self.assertGreaterEqual(res["confidence"], 0.90)
        
        # Minimizes unnecessary tool calls
        self.assertEqual(res["tools"], ["race_results_tool"])

    def test_example_2_compare_verstappen_vs_norris(self):
        """Verifies 'Compare Verstappen vs Norris' adaptively extracts comparison intent and chooses race_results, telemetry, scoring tools."""
        q = "Compare Verstappen vs Norris"
        res = adaptive_plan_extract(q)
        
        self.assertEqual(res["intent"], "comparison")
        self.assertIn("verstappen", res["entities"]["drivers"])
        self.assertIn("norris", res["entities"]["drivers"])
        self.assertIn("telemetry_comparison", res["required_evidence"])
        self.assertIn("driver_scores", res["missing_evidence"])
        self.assertGreaterEqual(res["confidence"], 0.90)
        
        # Dynamically chosen tools
        self.assertEqual(res["tools"], ["race_results_tool", "telemetry_tool", "scoring_tool"])

    def test_example_3_why_ferrari_failed(self):
        """Verifies 'Why Ferrari failed' adaptively extracts investigation intent and chooses race_results, telemetry, knowledge, simulation tools."""
        q = "Why Ferrari failed"
        res = adaptive_plan_extract(q)
        
        self.assertEqual(res["intent"], "investigation")
        self.assertEqual(res["entities"]["team"], "Ferrari")
        self.assertIn("telemetry_degradation", res["required_evidence"])
        self.assertIn("strategy_simulation", res["missing_evidence"])
        self.assertGreaterEqual(res["confidence"], 0.90)
        
        # Dynamically chosen tools
        self.assertEqual(res["tools"], ["race_results_tool", "telemetry_tool", "knowledge_tool", "simulation_tool"])

    def test_plan_node_adaptive_structure(self):
        """Verifies plan_node outputs structured_plan with intent, entities, required_evidence, missing_evidence, and confidence."""
        state = {
            "question": "Why did Ferrari fail at Monaco GP?",
            "session_id": "2024_monaco_gp_race",
            "driver_id": "sainz",
            "plan": [],
            "tools_used": [],
            "next_step_idx": 0,
            "evidence": {},
            "final_answer": "",
            "confidence": 0.0,
            "explain_mode_options": [],
            "errors": [],
            "history": [],
            "streaming_events": [],
            "collaboration_graph": []
        }
        res = plan_node(state)
        self.assertIn("structured_plan", res)
        plan_dict = res["structured_plan"]
        
        self.assertEqual(plan_dict["intent"], "investigation")
        self.assertIn("entities", plan_dict)
        self.assertIn("required_evidence", plan_dict)
        self.assertIn("missing_evidence", plan_dict)
        self.assertIn("confidence", plan_dict)
        self.assertTrue(len(plan_dict["required_tools"]) >= 1)
        self.assertTrue(any(t in plan_dict["required_tools"] for t in ["race_results_tool", "investigation_tool", "telemetry_tool"]))


if __name__ == "__main__":
    unittest.main()
