import unittest
from app.agents.planner import run_ai_race_engineer, extract_entities, adaptive_plan_extract
from app.core.entity_resolver import EntityResolver
from app.agents.resolver import SessionResolver

class TestSprintValidation(unittest.TestCase):

    def test_01_who_won_monaco_gp(self):
        query = "Who won Monaco GP?"
        res = run_ai_race_engineer(query)
        self.assertIn("final_answer", res)
        self.assertNotIn("POST /sessions/load", res["final_answer"])
        # Factual query should NOT contain root cause reasoning graph or telemetry findings in report
        rep = res.get("investigation_report", {})
        self.assertNotIn("Reasoning Graph", rep)
        self.assertNotIn("Telemetry Findings", rep)
        print("\nQuery 1 (Who won Monaco GP?): SUCCESS")
        print("Final Answer:", res["final_answer"][:120])

    def test_02_who_won_monaco_gp_2024(self):
        query = "Who won Monaco GP 2024?"
        res = run_ai_race_engineer(query)
        trace = res.get("intelligence_trace", {})
        entities = trace.get("entities", {})
        self.assertEqual(entities.get("season"), 2024)
        print("\nQuery 2 (Who won Monaco GP 2024?): SUCCESS - Season 2024 preserved")

    def test_03_who_won_spanish_gp(self):
        query = "Who won Spanish GP?"
        res = run_ai_race_engineer(query)
        self.assertIn("final_answer", res)
        self.assertNotIn("POST /sessions/load", res["final_answer"])
        print("\nQuery 3 (Who won Spanish GP?): SUCCESS - Auto ingestion completed")

    def test_04_why_did_ferrari_fail_in_austria_gp(self):
        query = "Why did Ferrari fail in Austria GP?"
        res = run_ai_race_engineer(query)
        rep = res.get("investigation_report", {})
        # Analytical query MUST contain reasoning graph and evidence
        self.assertIn("Reasoning Graph", rep)
        self.assertIn("Executive Summary", rep)
        print("\nQuery 4 (Why did Ferrari fail in Austria GP?): SUCCESS - Full analytical report returned")

    def test_05_compare_verstappen_vs_norris_pace(self):
        query = "Compare Verstappen vs Norris pace"
        res = run_ai_race_engineer(query)
        evidence = res.get("evidence", {})
        self.assertIn("final_answer", res)
        print("\nQuery 5 (Compare Verstappen vs Norris pace): SUCCESS")

if __name__ == "__main__":
    unittest.main()
