import unittest
from app.agents.planner import run_ai_race_engineer
from app.tools.adapters import RaceResultsTool

class TestFixesEFG(unittest.TestCase):

    def test_fix_e_simulation_parameter_binding_query1(self):
        """Fix E Query 1: Piastri at Qatar on lap 18."""
        question = "What if Piastri pitted on lap 18 at Qatar in 2024?"
        res = run_ai_race_engineer(question)
        self.assertIsNotNone(res)
        self.assertIn("final_answer", res)
        trace = res.get("intelligence_trace", {})
        executed_tools = trace.get("executed_tools", []) or res.get("tools_used", [])
        self.assertIn("simulation_tool", executed_tools)
        ans = res["final_answer"].lower()
        self.assertTrue("lap 18" in ans or "projects" in ans or "strategy simulation" in ans)
        self.assertNotIn("no verified race data is available for p18", ans)

    def test_fix_e_simulation_parameter_binding_query2(self):
        """Fix E Query 2: Leclerc at Bahrain on lap 32."""
        question = "Simulate Leclerc pitting on lap 32 at Bahrain in 2024"
        res = run_ai_race_engineer(question)
        self.assertIsNotNone(res)
        trace = res.get("intelligence_trace", {})
        executed_tools = trace.get("executed_tools", []) or res.get("tools_used", [])
        self.assertIn("simulation_tool", executed_tools)
        ans = res["final_answer"].lower()
        self.assertTrue("lap 32" in ans or "projects" in ans or "strategy simulation" in ans)
        self.assertNotIn("no verified race data is available for p32", ans)

    def test_fix_e_simulation_parameter_binding_query3(self):
        """Fix E Query 3: Russell at Austria on lap 25."""
        question = "What if Russell boxed on lap 25 at Austria in 2024?"
        res = run_ai_race_engineer(question)
        self.assertIsNotNone(res)
        trace = res.get("intelligence_trace", {})
        executed_tools = trace.get("executed_tools", []) or res.get("tools_used", [])
        self.assertIn("simulation_tool", executed_tools)
        ans = res["final_answer"].lower()
        self.assertTrue("lap 25" in ans or "projects" in ans or "strategy simulation" in ans)
        self.assertNotIn("no verified race data is available for p25", ans)

    def test_fix_f_no_wrong_substitution_fallback_query1(self):
        """Fix F Query 1: Colapinto at Monaco 2024 (did not race) -> honest error, no P27 fallback."""
        question = "What if Colapinto pitted on lap 27 at Monaco in 2024?"
        res = run_ai_race_engineer(question)
        self.assertIsNotNone(res)
        ans = res["final_answer"].lower()
        self.assertNotIn("p27", ans)
        self.assertNotIn("no verified race data is available for p27", ans)
        self.assertTrue("wasn't able to run that simulation" in ans or "no verified" in ans or "not able" in ans)

    def test_fix_f_no_wrong_substitution_fallback_query2(self):
        """Fix F Query 2: Sargeant at Singapore 2024 (did not race) -> honest simulation failure, no P14."""
        question = "What if Sargeant pitted on lap 14 at Singapore in 2024?"
        res = run_ai_race_engineer(question)
        self.assertIsNotNone(res)
        ans = res["final_answer"].lower()
        self.assertNotIn("no verified race data is available for p14", ans)
        self.assertNotIn("p14", ans)
        self.assertTrue("wasn't able to run that simulation" in ans or "not able" in ans or "no verified" in ans)

    def test_fix_f_no_wrong_substitution_fallback_query3(self):
        """Fix F Query 3: Rate Sargeant's performance at Abu Dhabi 2024 (did not race) -> honest scoring failure."""
        question = "Rate Sargeant's performance scorecard at Abu Dhabi in 2024"
        res = run_ai_race_engineer(question)
        self.assertIsNotNone(res)
        ans = res["final_answer"].lower()
        self.assertNotIn("max verstappen won", ans)
        self.assertTrue("no verified scoring data" in ans or "no verified" in ans or "insufficient" in ans)

    def test_fix_g_race_results_tool_has_no_fake_root_cause(self):
        """Fix G: Verify race_results_tool does not contain root_cause_analysis boilerplate."""
        tool = RaceResultsTool()
        out = tool.validate_and_execute({"session_id": "2024_spanish_gp_race"}, "Who won the Spanish GP?")
        self.assertNotIn("root_cause_analysis", out)
        self.assertIn("winner", out)
        self.assertIn("classification", out)

    def test_fix_g_root_cause_investigation_query1(self):
        """Fix G Query 1: What went wrong with Leclerc's strategy at British GP 2024?"""
        question = "What went wrong with Leclerc's strategy at the 2024 British GP?"
        res = run_ai_race_engineer(question)
        self.assertIsNotNone(res)
        ans = res["final_answer"]
        self.assertNotIn("Verified race classification retrieved from PostgreSQL", ans)
        ans_lower = ans.lower()
        self.assertTrue(
            ("score" in ans_lower or "pitted" in ans_lower or "lap" in ans_lower or "p14" in ans_lower or "started" in ans_lower)
        )

    def test_fix_g_root_cause_investigation_query2(self):
        """Fix G Query 2: What went wrong with Norris's pace at the 2024 Austrian GP?"""
        question = "What went wrong with Norris's pace at the 2024 Austrian GP?"
        res = run_ai_race_engineer(question)
        self.assertIsNotNone(res)
        ans = res["final_answer"]
        self.assertNotIn("Verified race classification retrieved from PostgreSQL", ans)
        ans_lower = ans.lower()
        self.assertTrue(
            ("pace score" in ans_lower or "score" in ans_lower or "p20" in ans_lower or "retired" in ans_lower or "pitted" in ans_lower)
        )

    def test_fix_g_root_cause_investigation_query3(self):
        """Fix G Query 3: Why did Perez struggle during the 2024 Spanish GP?"""
        question = "Why did Perez struggle during the 2024 Spanish GP?"
        res = run_ai_race_engineer(question)
        self.assertIsNotNone(res)
        ans = res["final_answer"]
        self.assertNotIn("Verified race classification retrieved from PostgreSQL", ans)
        ans_lower = ans.lower()
        self.assertTrue(
            ("score" in ans_lower or "pitted" in ans_lower or "lap" in ans_lower or "started" in ans_lower or "finish" in ans_lower)
        )


if __name__ == "__main__":
    unittest.main()
