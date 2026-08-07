import unittest
from app.agents.planner import run_ai_race_engineer
from app.core.session_resolver import SessionResolver

class TestSprintValidation(unittest.TestCase):

    def _validate_pipeline(self, query: str, expected_gp_key: str):
        print(f"\n=======================================================")
        print(f"RUNNING VALIDATION PIPELINE FOR QUERY: '{query}'")
        print(f"=======================================================")

        res = run_ai_race_engineer(query)
        self.assertIn("final_answer", res)
        final_ans = res["final_answer"]
        self.assertNotIn("POST /sessions/load", final_ans)
        self.assertNotIn("missing_data", final_ans)
        self.assertNotIn("Tyre degradation", final_ans)
        self.assertNotIn("Root Cause Investigation", final_ans)

        trace = res.get("intelligence_trace", {})
        entities = trace.get("entities") or {}
        
        # Verify SessionResolver output directly
        resolved = SessionResolver.resolve_session(grand_prix=expected_gp_key, season=2024, session_type="Race")
        
        sess_id = resolved.get('session_id') or ''
        race_id = sess_id.replace('_race', '')
        print(f"Planner -> {trace.get('intent', 'race_result')}")
        print(f"Entities -> {entities}")
        print(f"Resolved IDs -> session_id: {sess_id}, race_id: {race_id}")
        print(f"Session -> {resolved.get('session_id')}")
        print(f"FastF1 Download? -> {'YES' if resolved.get('fastf1_downloaded') else 'NO'}")
        print(f"Rows inserted -> {resolved.get('rows_returned', 0)}")
        print(f"Rows returned -> {resolved.get('rows_returned', 0)}")
        print(f"Final Answer -> {final_ans}")
        print(f"=======================================================\n")
        
        self.assertEqual(resolved.get("status"), "success")
        self.assertTrue(resolved.get("rows_returned", 0) > 0)
        return res

    def test_01_who_won_monaco_gp(self):
        self._validate_pipeline("Who won Monaco GP?", "monaco")

    def test_02_who_won_austrian_gp(self):
        self._validate_pipeline("Who won Austrian GP?", "austria")

    def test_03_who_won_hungarian_gp(self):
        self._validate_pipeline("Who won Hungarian GP?", "hungary")

    def test_04_who_won_british_gp(self):
        self._validate_pipeline("Who won British GP?", "silverstone")

if __name__ == "__main__":
    unittest.main()
