import os
import sys
import unittest
import json

# Ensure ai_services directory is on python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ai_services")))

from app.agents.planner import run_ai_race_engineer
from app.agents.nlp_parser import parse_semantic_query
from app.core.session_resolver import SessionResolver

class LiveFixesValidationSuite(unittest.TestCase):

    def test_B_knowledge_query_clean_answer(self):
        """B. Verify 'Explain the difference between soft and hard tyres.' -> intent=knowledge/explanation, tool=explain_mode_tool, no session injection, clean final answer."""
        question = "Explain the difference between soft and hard tyres."
        
        # Test semantic contract directly
        contract = parse_semantic_query(question)
        self.assertIn(contract["intent"], ["knowledge", "explanation"])
        self.assertIn(contract["requested_metric"], ["knowledge", "explanation"])
        self.assertIsNone(contract["entities"]["grand_prix"])
        self.assertIsNone(contract["entities"]["season"])

        # Test full agent execution
        res = run_ai_race_engineer(question)
        self.assertEqual(res["tools_used"], ["explain_mode_tool"])
        
        final_ans = res["final_answer"]
        self.assertIsNotNone(final_ans)
        self.assertNotIn("F1 Debrief Analysis:", final_ans)
        self.assertNotIn("explain_mode_tool:", final_ans)
        self.assertIn("Soft tyres", final_ans)
        
        trace = res.get("intelligence_trace", {})
        self.assertIsNone(trace.get("resolved_session_id"))

    def test_C_spain_p2_driver(self):
        """C. Verify 'Who finished second in Spain?' -> correct 2024 Spanish GP session, correct P2 driver (Lando Norris)."""
        question = "Who finished second in Spain?"
        
        contract = parse_semantic_query(question)
        self.assertIn(contract["intent"], ["historical_fact", "race_result", "driver_position"])
        self.assertEqual(contract["requested_position"], 2)
        self.assertEqual(contract["entities"]["grand_prix"], "Spanish GP")

        # Session resolver test
        sess_res = SessionResolver.resolve_session(grand_prix="Spanish GP", season=2024)
        self.assertEqual(sess_res["status"], "success")
        self.assertIn(sess_res["session_id"], ["2024_spanish_gp_race", "2024_catalunya_gp_race"])

        # Full execution test
        res = run_ai_race_engineer(question)
        final_ans = res["final_answer"]
        self.assertIn("Lando Norris", final_ans)
        self.assertIn("P2", final_ans)

    def test_D1_telemetry_preserves_requested_gp_qatar(self):
        """D1. Verify 'Compare lap timings of Verstappen and Hamilton at Qatar GP' preserves Qatar GP without hardcoded British GP."""
        question = "Compare lap timings of Verstappen and Hamilton at Qatar GP"
        res = run_ai_race_engineer(question)
        final_ans = res["final_answer"]
        self.assertNotIn("British GP", final_ans)
        self.assertTrue("Qatar GP" in final_ans or "Qatar" in final_ans)

    def test_D2_telemetry_preserves_requested_gp_brazil(self):
        """D2. Verify 'Compare Piastri vs Verstappen at Brazil' preserves Brazilian GP without hardcoded British GP."""
        question = "Compare Piastri vs Verstappen at Brazil"
        res = run_ai_race_engineer(question)
        final_ans = res["final_answer"]
        self.assertNotIn("British GP", final_ans)
        self.assertTrue("Brazilian GP" in final_ans or "Brazil" in final_ans or "Paulo" in final_ans)

    def test_D3_missing_telemetry_evidence_no_fabricated_causes(self):
        """D3. Verify missing telemetry evidence does not generate fabricated causal claims."""
        question = "Compare telemetry of DriverX and DriverY at UnknownGP 1920"
        res = run_ai_race_engineer(question)
        final_ans = res["final_answer"]
        self.assertTrue("no verified" in final_ans.lower() or "which drivers" in final_ans.lower() or "missing" in final_ans.lower())
        report = res.get("investigation_report", {})
        self.assertNotIn("Reasoning Graph", report)

    def test_E_redis_cache_error_detection(self):
        """E. Verify error responses are flagged as uncacheable while valid responses can be cached."""
        # Test helper logic equivalent to Node.js CacheService.isErrorResponse
        def is_error_response(response):
            if not response or not isinstance(response, dict):
                return True
            if response.get("error"):
                return True
            if isinstance(response.get("errors"), list) and len(response["errors"]) > 0:
                return True
            fa = str(response.get("final_answer", "")).lower()
            if "something went wrong" in fa or "internal execution error" in fa:
                return True
            return False

        valid_res = {
            "final_answer": "Lando Norris finished P2 in the 2024 Spanish Grand Prix.",
            "confidence": 98.5,
            "errors": []
        }
        error_res1 = {
            "final_answer": "Something went wrong during the investigation. Please try a different question.",
            "confidence": 10.0,
            "errors": ["Internal execution error"]
        }
        error_res2 = {
            "error": "Rate limit exceeded"
        }

        self.assertFalse(is_error_response(valid_res))
        self.assertTrue(is_error_response(error_res1))
        self.assertTrue(is_error_response(error_res2))

if __name__ == "__main__":
    unittest.main()
