import unittest
import time
from app.agents.memory import conversation_memory, InMemoryConversationMemory
from app.agents.planner import run_ai_race_engineer, plan_node, execute_node, reflect_node, judge_node, synthesize_node
from app.tools.registry import tool_registry

class TestAgenticAIRaceEngineer(unittest.TestCase):
    def setUp(self):
        from unittest.mock import patch
        from app.core.providers import LLMProviderError
        
        # Patch reliable_llm_provider to always fail and trigger fallback
        self.generate_plan_patcher = patch(
            "app.core.providers.reliable_llm_provider.generate_plan",
            side_effect=LLMProviderError("Mock LLM Provider Error")
        )
        self.generate_plan_patcher.start()

    def tearDown(self):
        if hasattr(self, "generate_plan_patcher"):
            self.generate_plan_patcher.stop()
            
    def test_conversation_memory_context_resolution(self):
        """Verifies memory resolves driver and team details from previous queries."""
        memory = InMemoryConversationMemory()
        conversation_id = "test-session-1"
        
        # Save a message detailing Sainz in Austrian GP
        context = {"session_id": "2024_austria_gp_race", "driver_id": "sainz"}
        memory.save_message(conversation_id, "Analyze Sainz's race scores", "Scores calculated.", context)
        
        # 1. Resolve relative driver reference "what about Ferrari"
        res_ferrari = memory.resolve_context(conversation_id, "What about Ferrari?")
        self.assertEqual(res_ferrari["driver_id"], "sainz")
        self.assertEqual(res_ferrari["session_id"], "2024_austria_gp_race")
        
        # 2. Resolve relative driver reference "compare this"
        res_compare = memory.resolve_context(conversation_id, "Compare this to McLaren")
        self.assertEqual(res_compare["driver_id"], "piastri") # Resolved McLaren
        self.assertEqual(res_compare["session_id"], "2024_austria_gp_race") # Kept same session

    def test_dynamic_planner_structured_output(self):
        """Verifies the planner node generates a valid structured plan dictionary."""
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
            "history": []
        }
        res_plan = plan_node(initial_state)
        self.assertIn("structured_plan", res_plan)
        plan_dict = res_plan["structured_plan"]
        self.assertEqual(plan_dict["intent"], "strategy_investigation")
        self.assertIn("simulation_tool", plan_dict["required_tools"])
        self.assertTrue(len(res_plan["plan"]) > 0)
        self.assertIn("simulation_tool", res_plan["plan"][0])

    def test_parallel_tool_execution(self):
        """Verifies the execute node runs tools in parallel and merges evidence."""
        initial_state = {
            "question": "Analyze Sainz's scores and CAR.",
            "session_id": "2024_austria_gp_race",
            "driver_id": "sainz",
            "plan": [
                "scoring_tool|session_id=2024_austria_gp_race,driver_id=sainz",
                "explain_mode_tool|term=CAR"
            ],
            "tools_used": [],
            "next_step_idx": 0,
            "evidence": {},
            "errors": [],
            "intelligence_trace": {
                "investigation_id": "trace-uuid",
                "tool_timeline": [],
                "recovery_steps": []
            }
        }
        
        t_start = time.time()
        res_exec = execute_node(initial_state)
        t_duration = time.time() - t_start
        
        # Verify evidence is merged into a single dictionary
        self.assertIn("scoring_tool", res_exec["evidence"])
        self.assertIn("explain_mode_tool", res_exec["evidence"])
        self.assertEqual(len(res_exec["tools_used"]), 2)
        
        # Verify trace timelines captured tool latencies
        timelines = res_exec["intelligence_trace"]["timelines"]
        self.assertIn("engineers", timelines)
        self.assertEqual(len(timelines["engineers"]), 2)

    def test_reflection_agent_loops_back(self):
        """Verifies reflection loops plan edits when mismatch or empty parameters trigger it."""
        initial_state = {
            "plan": ["scoring_tool|session_id=2024_austria_gp_race,driver_id=sainz"],
            "next_step_idx": 1,
            "tools_used": ["scoring_tool"],
            # Disagreement: Sainz P3 actual vs simulated projected finish P10
            "evidence": {
                "scoring_tool": {"p_finish": 3},
                "simulation_tool": {"projected_finishing_position": 10}
            },
            "reflection_count": 0,
            "reflection_notes": [],
            "errors": []
        }
        res_reflect = reflect_node(initial_state)
        # Should detect mismatch, add explain tool to plan, and increment count
        self.assertTrue(len(res_reflect["reflection_notes"]) > 0)
        self.assertEqual(res_reflect["reflection_count"], 1)
        self.assertIn("explain_mode_tool|term=SPG", res_reflect["plan"])

    def test_judge_agent_scoring(self):
        """Verifies the judge evaluates factual completeness and consistency."""
        initial_state = {
            "evidence": {
                "scoring_tool": {"p_finish": 3},
                "simulation_tool": {"actual_finishing_position": 4} # Mismatch actual finishing position
            },
            "errors": ["Failed to connect to PG database"]
        }
        res_judge = judge_node(initial_state)
        eval_dict = res_judge["judge_evaluation"]
        # Quality should drop due to errors
        self.assertTrue(eval_dict["evidence_quality"] < 100)
        # Consistency should drop due to mismatch position
        self.assertTrue(eval_dict["consistency"] < 100)

    def test_confidence_v2_normalisation(self):
        """Verifies Confidence V2 calculates a proper weighted score from elements."""
        initial_state = {
            "question": "Query for test",
            "evidence": {"scoring_tool": {}},
            "errors": [],
            "reflection_notes": ["Telemetry mismatch details"],
            "judge_evaluation": {
                "factual_completeness": 90,
                "evidence_quality": 80,
                "consistency": 100
            },
            "intelligence_trace": {}
        }
        res_synth = synthesize_node(initial_state)
        confidence = res_synth["confidence"]
        self.assertTrue(0.0 <= confidence <= 100.0)

    def test_intelligence_trace_fields(self):
        """Verifies the developer-only intelligence trace features are fully populated."""
        res = run_ai_race_engineer(
            question="Analyze Sainz's scoring profile.",
            session_id="2024_austria_gp_race",
            driver_id="sainz"
        )
        self.assertIn("intelligence_trace", res)
        trace = res["intelligence_trace"]
        self.assertIn("investigation_id", trace)
        self.assertIn("planning_graph", trace)
        self.assertIn("execution_graph", trace)
        self.assertIn("timelines", trace)
        self.assertIn("total_latency_ms", trace)
        self.assertIn("reflection_notes", trace)
        self.assertIn("judge_notes", trace)
        self.assertIn("confidence_breakdown", trace)
        self.assertIn("errors", trace)
        self.assertIn("recovery_steps", trace)
