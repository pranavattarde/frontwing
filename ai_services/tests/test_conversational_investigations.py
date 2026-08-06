import unittest
from app.agents.memory import conversation_memory, PostgresConversationMemory
from app.agents.planner import adaptive_plan_extract

class TestConversationalInvestigations(unittest.TestCase):

    _CONV_ID = "test_thread_conv_4_turn"

    def setUp(self):
        """Clear the test conversation from PostgreSQL before each run."""
        try:
            from app.core.db import execute_query
            execute_query(
                "DELETE FROM conversations WHERE conversation_id = %s",
                (self._CONV_ID,)
            )
        except Exception:
            pass
        # Also clear in-memory fallback store
        if hasattr(conversation_memory, "_fallback_store"):
            conversation_memory._fallback_store.pop(self._CONV_ID, None)

    def tearDown(self):
        """Clean up test conversation after each run."""
        try:
            from app.core.db import execute_query
            execute_query(
                "DELETE FROM conversations WHERE conversation_id = %s",
                (self._CONV_ID,)
            )
        except Exception:
            pass

    def test_conversational_investigation_4_turn_sequence(self):
        """Verifies the exact 4-turn conversational sequence:

        Turn 1: Why Ferrari failed?
        Turn 2: What about Verstappen?
        Turn 3: Compare them.
        Turn 4: Show telemetry.
        Persists context and stores exchanges in PostgreSQL conversation memory.
        """
        conv_id = self._CONV_ID


        # Turn 1: "Why Ferrari failed?"
        q1 = "Why Ferrari failed?"
        ctx1 = conversation_memory.resolve_context(conv_id, q1)
        plan1 = adaptive_plan_extract(q1, session_id=ctx1.get("session_id"), driver_id=ctx1.get("driver_id"), history=conversation_memory.get_history(conv_id))
        
        self.assertEqual(plan1["intent"], "investigation")
        self.assertIn("telemetry_tool", plan1["tools"])
        self.assertIn("simulation_tool", plan1["tools"])

        conversation_memory.save_message(conv_id, q1, "Ferrari performance degraded due to tyre thermal wear on stint 2.", {
            "session_id": ctx1.get("session_id") or "2024_austria_gp_race",
            "driver_id": "sainz",
            "team": "Ferrari",
            "intent": "investigation"
        })

        # Turn 2: "What about Verstappen?"
        q2 = "What about Verstappen?"
        ctx2 = conversation_memory.resolve_context(conv_id, q2)
        self.assertEqual(ctx2["driver_id"], "verstappen")
        self.assertEqual(ctx2["session_id"], "2024_austria_gp_race")

        plan2 = adaptive_plan_extract(q2, session_id=ctx2["session_id"], driver_id=ctx2["driver_id"], history=conversation_memory.get_history(conv_id))
        self.assertIn("verstappen", plan2["entities"]["drivers"])

        conversation_memory.save_message(conv_id, q2, "Verstappen maintained leading pace but suffered brake balance overheating.", {
            "session_id": ctx2["session_id"],
            "driver_id": ctx2["driver_id"],
            "comparative_driver_id": "sainz",
            "intent": "investigation"
        })

        # Turn 3: "Compare them."
        q3 = "Compare them."
        ctx3 = conversation_memory.resolve_context(conv_id, q3)
        self.assertIn("sainz", ctx3["past_drivers"])
        self.assertIn("verstappen", ctx3["past_drivers"])

        plan3 = adaptive_plan_extract(q3, session_id=ctx3["session_id"], driver_id=ctx3["driver_id"], history=conversation_memory.get_history(conv_id))
        self.assertEqual(plan3["intent"], "comparison")
        self.assertIn("scoring_tool", plan3["tools"])
        self.assertIn("telemetry_tool", plan3["tools"])

        conversation_memory.save_message(conv_id, q3, "Sainz vs Verstappen comparison: Verstappen leads pace by 0.350s/lap in Sector 2.", {
            "session_id": ctx3["session_id"],
            "driver_id": "sainz",
            "comparative_driver_id": "verstappen",
            "intent": "comparison"
        })

        # Turn 4: "Show telemetry."
        q4 = "Show telemetry."
        ctx4 = conversation_memory.resolve_context(conv_id, q4)
        plan4 = adaptive_plan_extract(q4, session_id=ctx4["session_id"], driver_id=ctx4["driver_id"], history=conversation_memory.get_history(conv_id))
        
        self.assertEqual(plan4["intent"], "telemetry")
        self.assertIn("telemetry_tool", plan4["tools"])

        conversation_memory.save_message(conv_id, q4, "Displaying speed trace and throttle deltas for Sainz vs Verstappen.", {
            "session_id": ctx4["session_id"],
            "driver_id": "sainz",
            "comparative_driver_id": "verstappen",
            "intent": "telemetry"
        })

        # Retrieve full conversation history from PostgreSQL memory
        hist = conversation_memory.get_history(conv_id)
        self.assertEqual(len(hist), 4)
        self.assertEqual(hist[0]["question"], "Why Ferrari failed?")
        self.assertEqual(hist[1]["question"], "What about Verstappen?")
        self.assertEqual(hist[2]["question"], "Compare them.")
        self.assertEqual(hist[3]["question"], "Show telemetry.")


if __name__ == "__main__":
    unittest.main()
