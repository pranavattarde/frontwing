import unittest
from app.tools.registry import BaseF1Tool, tool_registry, ToolRegistry
from app.tools.adapters import ScoringTool, SimulationTool, TelemetryTool, ExplainModeTool
from app.agents.planner import run_ai_race_engineer, plan_node, execute_node, synthesize_node

class MockFailingTool(BaseF1Tool):
    @property
    def name(self) -> str:
        return "mock_failing_tool"
        
    @property
    def description(self) -> str:
        return "A mock tool that always raises an exception."
        
    @property
    def input_schema(self) -> dict:
        return {}
        
    def execute(self, inputs: dict) -> None:
        raise RuntimeError("Simulated database/tool execution failure")


class TestAIRaceEngineerBackend(unittest.TestCase):
    def setUp(self):
        # Ensure our failing mock tool is registered for testing error recovery
        try:
            tool_registry.register(MockFailingTool())
        except ValueError:
            # Already registered in dynamic import cycle
            pass

    def test_tool_registry_retrieval(self):
        """Verifies tools can be registered and retrieved by name."""
        scoring = tool_registry.get_tool("scoring_tool")
        self.assertEqual(scoring.name, "scoring_tool")
        self.assertIn("Calculates and aggregates", scoring.description)

        explain = tool_registry.get_tool("explain_mode_tool")
        self.assertEqual(explain.name, "explain_mode_tool")

    def test_explain_mode_adapter(self):
        """Verifies explain mode returns structured math definitions."""
        tool = tool_registry.get_tool("explain_mode_tool")
        res = tool.execute({"term": "CAR", "target_audience": "novice"})
        self.assertEqual(res["term"], "CAR")
        self.assertEqual(res["name"], "Clean Air Ratio")
        self.assertIn("Measures the percent of the race", res["explanation"])

    def test_telemetry_adapter_fallback(self):
        """Verifies telemetry adapter returns structured coordinates."""
        tool = tool_registry.get_tool("telemetry_tool")
        res = tool.execute({"session_id": "mock_session", "driver_id": "sainz", "lap_number": 42})
        self.assertEqual(res["driver_id"], "sainz")
        self.assertEqual(res["lap_number"], 42)
        self.assertTrue(len(res["telemetry"]) > 0)
        self.assertIn("speed", res["telemetry"][0])

    def test_scoring_adapter_execution(self):
        """Verifies scoring adapter calculates composite and individual grades."""
        tool = tool_registry.get_tool("scoring_tool")
        # Direct payload injection to bypass DB lookups
        mock_payload = {
            "total_laps": 71,
            "sc_laps": 4,
            "clean_air_laps": 58,
            "pit_stops": [
                {"lap": 22, "position_before": 3, "position_after": 4, "t_stationary": 2.5, "t_pit_lane": 21.3, "is_forced_stop": False}
            ],
            "stints": [
                {"compound": "MEDIUM", "length": 22, "optimal_length": 26, "clean_laps_times": [70.5, 70.4, 70.3], "is_forced": False}
            ]
        }
        res = tool.execute({"session_id": "aut-2024", "driver_id": "sainz", "data": mock_payload})
        self.assertIn("composite_score", res)
        self.assertIn("strategy_score", res)
        self.assertIn("pace_score", res)
        self.assertTrue(res["composite_score"] > 0)

    def test_simulation_adapter_execution(self):
        """Verifies simulation adapter runs what-if projections."""
        tool = tool_registry.get_tool("simulation_tool")
        # Mock data run
        res = tool.execute({
            "session_id": "2024_austria_gp_race",
            "driver_id": "sainz",
            "simulated_pit_lap": 20
        })
        self.assertEqual(res["driver_id"], "sainz")
        self.assertEqual(res["simulated_pit_lap"], 20)
        self.assertIn("simulated_net_time_gain_ms", res)
        self.assertIn("projected_finishing_position", res)

    def test_planner_routing_simulation(self):
        """Verifies routing logic dispatches simulation tool when 'what-if' or 'simulate' queries are posed."""
        res = run_ai_race_engineer(
            question="What if Sainz pitted on lap 20 instead of 22?",
            session_id="2024_austria_gp_race",
            driver_id="sainz"
        )
        self.assertIn("simulation_tool", res["tools_used"])
        self.assertEqual(res["question"], "What if Sainz pitted on lap 20 instead of 22?")
        self.assertTrue(len(res["evidence"]) > 0)
        self.assertIn("simulation_tool", res["evidence"])

    def test_planner_routing_scoring(self):
        """Verifies routing logic runs scoring & explain tools for performance debrief questions."""
        res = run_ai_race_engineer(
            question="Analyze Sainz's race performance scores.",
            session_id="2024_austria_gp_race",
            driver_id="sainz"
        )
        self.assertIn("scoring_tool", res["tools_used"])
        self.assertIn("explain_mode_tool", res["tools_used"])
        self.assertTrue("scoring_tool" in res["evidence"])
        self.assertTrue("explain_mode_tool" in res["evidence"])

    def test_planner_graceful_error_recovery(self):
        """Verifies the planner catches tool exceptions, logs errors, and executes successfully with reduced confidence."""
        # Query custom question designed to execute failing tool
        initial_state = {
            "question": "Execute failing check.",
            "session_id": "mock_session",
            "driver_id": "sainz",
            "plan": ["mock_failing_tool|"],
            "tools_used": [],
            "next_step_idx": 0,
            "evidence": {},
            "final_answer": "",
            "confidence": 0.0,
            "explain_mode_options": [],
            "errors": []
        }
        
        # Manually run execution node to verify error catch
        from app.agents.planner import execute_node, synthesize_node
        res_exec = execute_node(initial_state)
        
        # Verify it has parsed error successfully without raising exception
        self.assertEqual(len(res_exec["errors"]), 1)
        self.assertIn("Tool 'mock_failing_tool|' failed: Simulated database", res_exec["errors"][0])
        
        # Verify confidence is adjusted downwards
        initial_state.update(res_exec)
        res_synth = synthesize_node(initial_state)
        self.assertEqual(res_synth["confidence"], 80.0) # 95.0 - 15.0
