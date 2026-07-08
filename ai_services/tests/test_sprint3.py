import unittest
from app.agents.personas import (
    ChiefRaceEngineer, StrategyEngineer, TelemetryEngineer,
    InvestigationEngineer, JudgeEngineer, ReflectionEngineer, ExplainEngineer
)
from app.agents.knowledge import (
    CircuitKnowledgePlaceholder, FIARegulationsPlaceholder,
    HistoricalArticlesPlaceholder, TechnicalRegulationsPlaceholder, RaceNotesPlaceholder
)
from app.agents.planner import run_ai_race_engineer, plan_node, execute_node, synthesize_node

class TestSprint3InvestigationPlatform(unittest.TestCase):
    
    def test_engineer_personas_interfaces(self):
        """Verifies all modular specialized engineers have roles and conform to execute interfaces."""
        chief = ChiefRaceEngineer()
        self.assertEqual(chief.name, "Chief Race Engineer")
        self.assertEqual(chief.role, "orchestration")
        
        strategy = StrategyEngineer()
        self.assertEqual(strategy.name, "Strategy Engineer")
        self.assertEqual(strategy.role, "strategy_simulation")
        
        telemetry = TelemetryEngineer()
        self.assertEqual(telemetry.name, "Telemetry Engineer")
        
        investigation = InvestigationEngineer()
        self.assertEqual(investigation.name, "Investigation Engineer")
        
        judge = JudgeEngineer()
        self.assertEqual(judge.name, "Judge Engineer")
        
        reflect = ReflectionEngineer()
        self.assertEqual(reflect.name, "Reflection Engineer")
        
        explain = ExplainEngineer()
        self.assertEqual(explain.name, "Explain Engineer")

    def test_knowledge_layer_interfaces(self):
        """Verifies placeholders circuit and regulation schemas retrieve indices correctly."""
        circuit_rag = CircuitKnowledgePlaceholder()
        layout = circuit_rag.query_circuit_layout("spielberg")
        self.assertEqual(layout["circuit_id"], "spielberg")
        self.assertIn("length_km", layout)
        
        fia_rag = FIARegulationsPlaceholder()
        rules = fia_rag.retrieve_sporting_rule("safety_car")
        self.assertTrue(len(rules) > 0)
        self.assertIn("Safety Car Procedures", rules[0]["title"])
        
        hist_rag = HistoricalArticlesPlaceholder()
        events = hist_rag.search_historical_events(2024, "spielberg")
        self.assertTrue(len(events) > 0)
        self.assertIn("Austrian GP", events[0]["headline"])
        
        tech_rag = TechnicalRegulationsPlaceholder()
        limit = tech_rag.verify_technical_limit("wing")
        self.assertIn("Article 3.5", limit["section"])
        
        notes_rag = RaceNotesPlaceholder()
        notes = notes_rag.get_event_debrief_notes("spielberg_race")
        self.assertTrue(len(notes) > 0)
        self.assertIn("lockup", notes[0]["note"])

    def test_structured_investigation_report(self):
        """Verifies the orchestrator runs the state graph and populates F1 Investigation Reports."""
        res = run_ai_race_engineer(
            question="Analyze Sainz's scoring and strategy.",
            session_id="2024_austria_gp_race",
            driver_id="sainz"
        )
        self.assertIn("investigation_report", res)
        report = res["investigation_report"]
        self.assertIn("Executive Summary", report)
        self.assertIn("Evidence", report)
        self.assertIn("Telemetry Findings", report)
        self.assertIn("Simulation Findings", report)
        self.assertIn("Historical Findings", report)
        self.assertIn("Alternative Scenarios", report)
        self.assertIn("Final Recommendation", report)
        self.assertIn("Confidence", report)

    def test_intelligence_trace_v2(self):
        """Verifies Trace V2 tracks planning graphs, execution graphs, latency statistics, and timelines."""
        res = run_ai_race_engineer(
            question="What if Verstappen pitted on lap 26 instead of 23?",
            session_id="2024_austria_gp_race",
            driver_id="verstappen"
        )
        self.assertIn("intelligence_trace", res)
        trace = res["intelligence_trace"]
        self.assertIn("planning_graph", trace)
        self.assertIn("execution_graph", trace)
        self.assertIn("timelines", trace)
        self.assertIn("total_latency_ms", trace)
        
        timelines = trace["timelines"]
        self.assertIn("planning", timelines)
        self.assertIn("engineers", timelines)
        self.assertIn("evidence", timelines)
        self.assertIn("reflection", timelines)
        self.assertIn("judge", timelines)
        self.assertIn("confidence", timelines)
