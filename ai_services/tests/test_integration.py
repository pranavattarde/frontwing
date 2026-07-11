import unittest
import os
from unittest.mock import patch, MagicMock
from app.core.startup import run_startup_health_checks
from app.agents.resolver import SessionResolver
from app.tools.registry import tool_registry
from app.agents.personas import engineer_registry
from app.core.providers import reliable_llm_provider
from app.agents.planner import run_ai_race_engineer

class TestProductionIntegration(unittest.TestCase):
    
    def test_startup_health_diagnostics(self):
        """Verifies startup checks complete with expected services and tools registered."""
        # This checks the expanded checks are registered in diagnostics dict
        res = run_startup_health_checks()
        self.assertIn("environment", res)
        self.assertIn("prompts", res)
        self.assertIn("knowledge", res)
        self.assertIn("tools", res)
        self.assertIn("database", res)
        self.assertIn("redis", res)
        self.assertIn("providers", res)
        self.assertIn("simulation", res)

    def test_dynamic_session_resolution(self):
        """Verifies resolver maps years, drivers, tracks, and sessions dynamically from query text."""
        # Query resolving Carlos Sainz Monaco GP 2024
        res1 = SessionResolver.resolve("What if Sainz pitted on lap 20 during the 2024 Monaco Grand Prix?")
        self.assertEqual(res1["driver_id"], "sainz")
        self.assertEqual(res1["year"], 2024)
        self.assertEqual(res1["circuit_id"], "monaco")
        
        # Query resolving Max Verstappen Sprint 2023 Belgium GP
        res2 = SessionResolver.resolve("Compare Verstappen's degradation during the 2023 Belgium sprint.")
        self.assertEqual(res2["driver_id"], "verstappen")
        self.assertEqual(res2["year"], 2023)
        self.assertEqual(res2["circuit_id"], "belgium")
        self.assertEqual(res2["session_type"], "Sprint")

    def test_audited_tool_registrations(self):
        """Verifies registration of every required tool in the registry."""
        required = ["scoring_tool", "simulation_tool", "explain_mode_tool", "research_tool", "investigation_tool", "knowledge_tool"]
        for t in required:
            tool = tool_registry.get_tool(t)
            self.assertEqual(tool.name, t)

    def test_knowledge_lookup_retrieval(self):
        """Verifies semantic RAG retrieval execution."""
        tool = tool_registry.get_tool("knowledge_tool")
        res = tool.execute({"query": "Articles safety car delta"})
        self.assertTrue(len(res) > 0)
        self.assertIn("source", res[0])

    @patch("app.core.providers.HAS_GEMINI", True)
    def test_reliable_llm_planning_flow(self):
        """Verifies plan parses successfully on first attempt with Gemini path."""
        mock_gemini = MagicMock()
        mock_gemini.models.generate_content.return_value = MagicMock(
            text='{"intent": "strategy_investigation", "complexity": "intermediate", "required_engineers": [], "required_tools": [], "execution_order": [], "expected_evidence": [], "fallback_plan": []}'
        )
        
        os.environ["GEMINI_API_KEY"] = "mock_key"
        with patch("app.core.providers.genai.Client", return_value=mock_gemini):
            plan, metrics = reliable_llm_provider.generate_plan("System instructions", "User query")
            self.assertEqual(metrics["llm_provider"], "gemini")
            self.assertEqual(plan["intent"], "strategy_investigation")

    @patch("app.core.providers.HAS_GEMINI", True)
    def test_groq_failover_flow(self):
        """Verifies automatic failover to Groq path if Gemini throws an error."""
        mock_gemini = MagicMock()
        mock_gemini.models.generate_content.side_effect = RuntimeError("Quota Exceeded")
        
        mock_groq = MagicMock()
        mock_choices = MagicMock()
        mock_choices.message.content = '{"intent": "driver_investigation", "complexity": "intermediate", "required_engineers": [], "required_tools": [], "execution_order": [], "expected_evidence": [], "fallback_plan": []}'
        mock_groq.chat.completions.create.return_value = MagicMock(choices=[mock_choices], usage=None)
        
        os.environ["GEMINI_API_KEY"] = "mock_key"
        os.environ["GROQ_API_KEY"] = "mock_key"
        
        with patch("app.core.providers.genai.Client", return_value=mock_gemini), \
             patch("app.core.providers.Groq", return_value=mock_groq):
            plan, metrics = reliable_llm_provider.generate_plan("System instructions", "User query")
            self.assertEqual(metrics["llm_provider"], "groq")
            self.assertEqual(plan["intent"], "driver_investigation")
            self.assertTrue(metrics["retries"] >= 3)
