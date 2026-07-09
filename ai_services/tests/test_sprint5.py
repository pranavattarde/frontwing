import unittest
import os
from unittest.mock import patch, MagicMock
from app.core.config import settings
from app.prompts.loader import load_prompt, _PROMPT_CACHE
from app.core.providers import GeminiProvider, GroqProvider, reliable_llm_provider, LLMProviderError
from app.agents.personas import engineer_registry
from app.core.startup import run_startup_health_checks

class TestSprint5ProductionInfrastructure(unittest.TestCase):
    
    def test_configuration_loading_and_validation(self):
        """Verifies environment variables load and validate correctly."""
        # Check defaults or environment configs are not empty
        self.assertIsNotNone(settings.DATABASE_URL)
        self.assertIsNotNone(settings.REDIS_URL)
        
        # Verify validation passes under normal settings
        settings.validate_or_raise()
        
        # Verify validation fails on empty critical settings
        old_db_url = os.environ.get("DATABASE_URL", "")
        try:
            os.environ["DATABASE_URL"] = ""
            with self.assertRaises(ValueError):
                settings.validate_or_raise()
        finally:
            os.environ["DATABASE_URL"] = old_db_url

    def test_prompt_loader_caching_and_fallbacks(self):
        """Verifies prompt loader loads markdown files, caches contents, and handles fallbacks gracefully."""
        # Clear cache first to test disk loader
        _PROMPT_CACHE.clear()
        
        # Test loading valid prompt
        content = load_prompt("planning")
        self.assertTrue(len(content) > 0)
        self.assertIn("planning", _PROMPT_CACHE)
        
        # Test fallback for non-existent prompt
        fallback_content = load_prompt("non_existent_prompt_99")
        self.assertIn("F1 AI Engineer assistant", fallback_content)

    @patch("app.core.providers.HAS_GEMINI", True)
    def test_llm_provider_failover_and_retries(self):
        """Verifies reliable llm provider coordinates failover Geminin -> Groq, retries, and tracks costs."""
        mock_gemini = MagicMock()
        mock_gemini.models.generate_content.side_effect = RuntimeError("Service Unavailable")
        
        mock_groq = MagicMock()
        mock_choices = MagicMock()
        mock_choices.message.content = '{"intent": "strategy_investigation", "complexity": "intermediate", "required_engineers": [], "required_tools": [], "execution_order": [], "expected_evidence": [], "fallback_plan": []}'
        mock_groq.chat.completions.create.return_value = MagicMock(choices=[mock_choices], usage=None)
        
        os.environ["GEMINI_API_KEY"] = "mock_key"
        os.environ["GROQ_API_KEY"] = "mock_key"
        
        with patch("app.core.providers.genai.Client", return_value=mock_gemini), \
             patch("app.core.providers.Groq", return_value=mock_groq):
                 
            plan, metrics = reliable_llm_provider.generate_plan("Sys instruction", "question query")
            
            # Gemini threw error, so retried 3 times (attemp 0, 1, 2) then failover to Groq
            self.assertEqual(metrics["llm_provider"], "groq")
            self.assertEqual(plan["intent"], "strategy_investigation")
            self.assertTrue(metrics["retries"] >= 3)
            self.assertTrue(metrics["estimated_cost"] > 0)

    def test_research_retrieval_modular(self):
        """Verifies Research Engineer executes modular RAG lookups correctly."""
        research_eng = engineer_registry.get_engineer("Research Engineer")
        res = research_eng.execute({}, {"query": "Sporting Regulations safety car delta"})
        self.assertEqual(res["status"], "success")
        self.assertTrue(len(res["references"]) > 0)
        self.assertEqual(res["references"][0]["source"], "FIA Sporting Regulations")

    def test_startup_validation_diagnostics(self):
        """Verifies startup validation runs and aggregates all health statuses."""
        diagnostics = run_startup_health_checks()
        self.assertIn("environment", diagnostics)
        self.assertIn("prompts", diagnostics)
        self.assertIn("knowledge", diagnostics)
        self.assertIn("database", diagnostics)
        self.assertIn("redis", diagnostics)
        self.assertIn("providers", diagnostics)
        # Should return a main healthy status boolean
        self.assertIn("healthy", diagnostics)
