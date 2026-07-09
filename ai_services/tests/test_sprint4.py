import unittest
import os
from unittest.mock import patch, MagicMock
from app.agents.knowledge import rag_knowledge
from app.agents.personas import engineer_registry
from app.agents.planner import run_ai_race_engineer, plan_node, execute_node, synthesize_node

class TestSprint4AgenticProduction(unittest.TestCase):
    
    def test_knowledge_engineer_rag_loaders(self):
        """Verifies modular RAG loaders and keyword search relevance matches."""
        # Test direct retrieval keyword matches
        results_rules = rag_knowledge.retrieve("Article 40.8 safety car")
        self.assertTrue(len(results_rules) > 0)
        self.assertEqual(results_rules[0]["source"], "FIA Sporting Regulations")
        
        # Test tyre strategy match
        results_tyre = rag_knowledge.retrieve("Hard tyre optimal stint length")
        self.assertTrue(len(results_tyre) > 0)
        self.assertEqual(results_tyre[0]["source"], "Tyre Strategy Articles")
        
        # Test circuit lockup match
        results_circuit = rag_knowledge.retrieve("Spielberg uphill Turn 3 wind")
        self.assertTrue(len(results_circuit) > 0)
        self.assertEqual(results_circuit[0]["source"], "Circuit Notes")

    def test_explain_engineer_multitarget_synthesis(self):
        """Verifies Explain Engineer generates beginner, intermediate, and expert explanations from same evidence."""
        mock_state = {
            "evidence": {
                "scoring_tool": {
                    "composite_score": 82.65,
                    "strategy_score": 67.32,
                    "tire_score": 98.67,
                    "pitstop_score": 87.67,
                    "p_start": 4,
                    "p_finish": 3
                }
            }
        }
        
        explain_eng = engineer_registry.get_engineer("Explain Engineer")
        explanations = explain_eng.execute(mock_state, {})
        
        self.assertIn("beginner", explanations)
        self.assertIn("intermediate", explanations)
        self.assertIn("engineer", explanations)
        
        # Verify content exists and references metrics
        self.assertIn("82.65", explanations["beginner"])
        self.assertIn("82.65", explanations["intermediate"])
        self.assertIn("82.65", explanations["engineer"])

    def test_gemini_planner_validation_success(self):
        """Verifies plan validation succeeds on correct structured JSON plan."""
        initial_state = {
            "question": "What if Sainz pitted on lap 20 instead of 22?",
            "session_id": "2024_austria_gp_race",
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
        
        res_plan = plan_node(initial_state)
        self.assertIn("structured_plan", res_plan)
        plan_dict = res_plan["structured_plan"]
        self.assertIn("intent", plan_dict)
        self.assertIn("complexity", plan_dict)
        self.assertIn("required_engineers", plan_dict)
        self.assertIn("fallback_plan", plan_dict)

    @patch("app.agents.planner.HAS_GEMINI", True)
    def test_gemini_failover_to_groq(self):
        """Verifies planner automatically falls back to Groq if Gemini throws exception."""
        # Mock Gemini client to throw exception, and Groq to return a valid JSON plan
        mock_gemini_client = MagicMock()
        mock_gemini_client.models.generate_content.side_effect = RuntimeError("Quota limit exceeded")
        
        mock_groq_client = MagicMock()
        mock_choices = MagicMock()
        mock_choices.message.content = (
            "{\n"
            "    \"intent\": \"strategy_investigation\",\n"
            "    \"complexity\": \"intermediate\",\n"
            "    \"required_engineers\": [\"Strategy Engineer\"],\n"
            "    \"required_tools\": [\"simulation_tool\"],\n"
            "    \"execution_order\": [\"simulation_tool|simulated_pit_lap=20\"],\n"
            "    \"expected_evidence\": [\"projected_finishing_position\"],\n"
            "    \"fallback_plan\": [\"scoring_tool\"]\n"
            "}"
        )
        mock_groq_client.chat.completions.create.return_value = MagicMock(choices=[mock_choices], usage=None)
        
        initial_state = {
            "question": "What if Sainz pitted on lap 20?",
            "session_id": "2024_austria_gp_race",
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
        
        # Set dummy keys to trigger LLM calls
        os.environ["GEMINI_API_KEY"] = "mock_gemini_key"
        os.environ["GROQ_API_KEY"] = "mock_groq_key"
        
        with patch("app.agents.planner.genai.Client", return_value=mock_gemini_client), \
             patch("app.agents.planner.Groq", return_value=mock_groq_client):
                 
            res_plan = plan_node(initial_state)
            
            # Verify plan is resolved
            self.assertEqual(res_plan["intelligence_trace"]["llm_provider"], "groq")
            self.assertEqual(res_plan["structured_plan"]["intent"], "strategy_investigation")

    def test_streaming_events_and_trace_v3(self):
        """Verifies execution logs streaming events and complete Trace V3 properties."""
        res = run_ai_race_engineer(
            question="What if Sainz pitted on lap 20?",
            session_id="2024_austria_gp_race",
            driver_id="sainz"
        )
        
        # Verify streaming events list is present and matches sequence
        self.assertIn("streaming_events", res)
        events = res["streaming_events"]
        event_types = [e["event"] for e in events]
        self.assertIn("planning", event_types)
        self.assertIn("tool_started", event_types)
        self.assertIn("tool_finished", event_types)
        self.assertIn("reflection", event_types)
        self.assertIn("judge", event_types)
        self.assertIn("completed", event_types)
        
        # Verify Trace V3 structure
        self.assertIn("intelligence_trace", res)
        trace = res["intelligence_trace"]
        self.assertIn("planning_graph", trace)
        self.assertIn("reasoning_graph", trace)
        self.assertIn("evidence_graph", trace)
        self.assertIn("engineer_collaboration_graph", trace)
        self.assertIn("llm_provider", trace)
        self.assertIn("llm_latency", trace)
        self.assertIn("prompt_tokens", trace)
        self.assertIn("completion_tokens", trace)

    def test_engineer_collaboration_trace(self):
        """Verifies specialized engineers collaborate dynamically and log traces."""
        initial_state = {
            "question": "Simulate lap 20 strategy stop.",
            "session_id": "2024_austria_gp_race",
            "driver_id": "sainz",
            "plan": ["simulation_tool|simulated_pit_lap=20"],
            "tools_used": [],
            "next_step_idx": 0,
            "evidence": {},
            "errors": [],
            "streaming_events": [],
            "collaboration_graph": [],
            "intelligence_trace": {
                "investigation_id": "trace-collaboration-uuid",
                "timelines": {}
            }
        }
        
        res_exec = execute_node(initial_state)
        # StrategyEngineer should collaborate and invoke KnowledgeEngineer
        collab = res_exec["collaboration_graph"]
        self.assertTrue(len(collab) > 0)
        self.assertEqual(collab[0], ["Strategy Engineer", "Knowledge Engineer"])
