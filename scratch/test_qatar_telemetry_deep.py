import sys
import os
import json
import unittest
import dotenv

dotenv.load_dotenv('ai_services/.env')
os.environ["DISABLE_LLM_PROVIDER"] = "1"
os.environ["GEMINI_API_KEY"] = ""
os.environ["GROQ_API_KEY"] = ""
sys.path.insert(0, os.path.abspath('ai_services'))

from app.core.providers import reliable_llm_provider
reliable_llm_provider.gemini_client = None
reliable_llm_provider.groq_client = None

from app.tools.adapters import TelemetryTool
from app.agents.planner import run_ai_race_engineer

class TestQatarTelemetryDeep(unittest.TestCase):

    def test_1_telemetry_tool_direct(self):
        print("\n--- [TEST 1] Direct TelemetryTool Execution ---")
        tool = TelemetryTool()
        payload = {
            "driver_id": "max verstappen",
            "comparative_driver_id": "hamilton",
            "session_id": "2024_qatar_gp_race",
            "grand_prix": "Qatar GP"
        }
        res = tool.execute(payload)
        
        # Assertions required by user
        self.assertEqual(res.get("status"), "success", "TelemetryTool status must be 'success'")
        self.assertEqual(res.get("session_id"), "2024_qatar_gp_race", "session_id must be '2024_qatar_gp_race'")
        self.assertGreater(len(res.get("telemetry", [])), 0, "Driver A telemetry points must exist")
        self.assertGreater(len(res.get("comparative_telemetry", [])), 0, "Driver B comparative telemetry points must exist")
        
        sector_times = res.get("sector_times")
        self.assertIsNotNone(sector_times, "sector_times must exist")
        self.assertGreaterEqual(len(sector_times), 3, "sector_times must contain at least 3 sectors (S1, S2, S3)")
        
        sectors_found = [s.get("sector") for s in sector_times]
        self.assertIn("S1", sectors_found, "S1 sector time missing")
        self.assertIn("S2", sectors_found, "S2 sector time missing")
        self.assertIn("S3", sectors_found, "S3 sector time missing")
        
        self.assertIsNotNone(res.get("delta_lap_time_s"), "delta_lap_time_s must exist")
        print("[PASS] Tool-level direct test assertions passed 100% cleanly!")

    def test_2_planner_and_synthesizer(self):
        print("\n--- [TEST 2] Planner & Synthesizer Pipeline Execution ---")
        query = "Compare lap timings of Verstappen and Hamilton at Qatar GP"
        res = run_ai_race_engineer(query)
        
        trace = res.get("intelligence_trace", {})
        intent = trace.get("intent") or trace.get("classified_intent") or trace.get("metric")
        print(f"Detected Intent in Trace: {intent}")
        self.assertIn(intent, ["telemetry_comparison", "telemetry", "lap_timing"], f"Unexpected intent: {intent}")
        
        # Tools executed verification
        tools_used = res.get("tools_used") or []
        print(f"Tools Used: {tools_used}")
        self.assertIn("telemetry_tool", tools_used, "telemetry_tool must be executed")
        self.assertNotIn("race_results_tool", tools_used, "race_results_tool MUST NOT be executed")
        self.assertNotIn("scoring_tool", tools_used, "scoring_tool MUST NOT be executed")
        
        # Evidence check
        evidence = res.get("evidence") or {}
        self.assertIn("telemetry_tool", evidence, "telemetry_tool evidence must be in response")
        self.assertEqual(evidence["telemetry_tool"].get("status"), "success", "telemetry_tool evidence status must be success")
        
        # Final answer format verification
        final_ans = res.get("final_answer", "")
        print(f"Synthesized Final Answer:\n{final_ans}")
        
        self.assertNotIn("no verified telemetry data", final_ans.lower(), "Final answer must NOT claim missing telemetry data")
        self.assertNotIn("root-cause", final_ans.lower(), "Final answer must NOT contain root-cause analysis")
        self.assertIn("Qatar", final_ans, "Final answer must preserve Qatar GP location")
        self.assertIn("S1:", final_ans, "Final answer must contain S1 delta")
        self.assertIn("S2:", final_ans, "Final answer must contain S2 delta")
        self.assertIn("S3:", final_ans, "Final answer must contain S3 delta")
        self.assertIn("delta:", final_ans, "Final answer must contain lap delta")
        
        print("[PASS] Planner and synthesizer pipeline assertions passed 100% cleanly!")

if __name__ == "__main__":
    unittest.main()
