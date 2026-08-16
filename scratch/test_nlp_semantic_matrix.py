import os
import sys
import unittest
import json

# Add ai_services path to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ai_services")))

from app.agents.nlp_parser import parse_semantic_query, preprocess_text, SemanticQueryContract
from app.agents.planner import run_ai_race_engineer, synthesize_node

class TestNLPSemanticMatrix(unittest.TestCase):

    def test_01_winner_monaco(self):
        query = "Who won Monaco GP?"
        contract = parse_semantic_query(query)
        self.assertEqual(contract["domain"], "formula_1")
        self.assertEqual(contract["requested_metric"], "winner")
        self.assertEqual(contract["requested_position"], 1)
        self.assertEqual(contract["entities"]["grand_prix"], "Monaco GP")

    def test_02_third_monaco(self):
        query = "Who came third at Monaco?"
        contract = parse_semantic_query(query)
        self.assertEqual(contract["domain"], "formula_1")
        self.assertEqual(contract["requested_metric"], "driver_at_position")
        self.assertEqual(contract["requested_position"], 3)
        self.assertEqual(contract["entities"]["grand_prix"], "Monaco GP")

    def test_03_leclerc_suzuka(self):
        query = "Where did Charles Leclerc finish at Suzuka?"
        contract = parse_semantic_query(query)
        self.assertEqual(contract["domain"], "formula_1")
        self.assertIn(contract["requested_metric"], ("finishing_position", "driver_position"))
        self.assertEqual(contract["requested_driver"], "Charles Leclerc")
        self.assertEqual(contract["entities"]["grand_prix"], "Japanese GP")
        self.assertEqual(contract["entities"]["circuit"].lower(), "suzuka")

    def test_04_podium_imola(self):
        query = "Give me the podium at Imola."
        contract = parse_semantic_query(query)
        self.assertEqual(contract["domain"], "formula_1")
        self.assertEqual(contract["requested_metric"], "podium")
        self.assertEqual(contract["limit"], 3)
        self.assertEqual(contract["entities"]["grand_prix"], "Emilia Romagna GP")

    def test_05_hamilton_fastest_lap_monza(self):
        query = "What was Hamilton's fastest lap at Monza?"
        contract = parse_semantic_query(query)
        self.assertEqual(contract["domain"], "formula_1")
        self.assertEqual(contract["requested_metric"], "fastest_lap")
        self.assertEqual(contract["requested_driver"], "Lewis Hamilton")
        self.assertEqual(contract["entities"]["grand_prix"], "Italian GP")

    def test_06_points_verstappen(self):
        query = "How many points did Verstappen score?"
        contract = parse_semantic_query(query)
        self.assertEqual(contract["domain"], "formula_1")
        self.assertEqual(contract["requested_metric"], "points")
        self.assertEqual(contract["requested_driver"], "Max Verstappen")

    def test_07_comparison_silverstone(self):
        query = "Compare Verstappen and Norris at Silverstone."
        contract = parse_semantic_query(query)
        self.assertEqual(contract["domain"], "formula_1")
        self.assertEqual(contract["intent"], "comparison")
        self.assertIn("Max Verstappen", contract["comparison_drivers"])
        self.assertIn("Lando Norris", contract["comparison_drivers"])
        self.assertEqual(contract["entities"]["grand_prix"], "British GP")

    def test_08_explain_drs(self):
        query = "Explain DRS."
        contract = parse_semantic_query(query)
        self.assertEqual(contract["domain"], "formula_1")
        self.assertEqual(contract["intent"], "explanation")

    def test_09_victory_shanghai(self):
        query = "Who took victory at Shanghai?"
        contract = parse_semantic_query(query)
        self.assertEqual(contract["domain"], "formula_1")
        self.assertEqual(contract["requested_metric"], "winner")
        self.assertEqual(contract["requested_position"], 1)
        self.assertEqual(contract["entities"]["grand_prix"], "Chinese GP")

    def test_10_top_five_spa(self):
        query = "Tell me the top five finishers at Spa."
        contract = parse_semantic_query(query)
        self.assertEqual(contract["domain"], "formula_1")
        self.assertIn(contract["requested_metric"], ("top_n", "driver_at_position"))
        self.assertEqual(contract["limit"], 5)
        self.assertEqual(contract["entities"]["grand_prix"], "Belgian GP")

    def test_paraphrase_variations(self):
        queries = [
            ("Who came 1st at Suzuka in 2024?", "winner", ["Japanese GP"]),
            ("Which driver ended up fifth at the 2024 Canadian Grand Prix?", "driver_at_position", ["Canadian GP", "Canadian Grand Prix"]),
            ("How did McLaren finish in the 2024 Singapore race?", "team_result", ["Singapore GP"]),
            ("Who won at Interlagos in 2024?", "winner", ["Brazilian GP"])
        ]
        for q, expected_metric, expected_gp_list in queries:
            contract = parse_semantic_query(q)
            self.assertEqual(contract["requested_metric"], expected_metric, f"Failed metric for query: {q}")
            self.assertIn(contract["entities"]["grand_prix"], expected_gp_list, f"Failed GP for query: {q}")

    def test_evidence_synthesis_no_default_winner(self):
        """Verify that synthesis node answers the requested metric and never defaults to winner."""
        # Test 1: Driver Finishing Position (Leclerc at Suzuka)
        state_leclerc = {
            "question": "Where did Charles Leclerc finish at Suzuka?",
            "semantic_contract": {
                "intent": "driver_position",
                "requested_metric": "finishing_position",
                "requested_driver": "Charles Leclerc",
                "entities": {"grand_prix": "Japanese GP", "season": 2024}
            },
            "evidence": {
                "race_results_tool": {
                    "winner": "Max Verstappen",
                    "grand_prix": "Japanese GP",
                    "season": 2024,
                    "classification": [
                        {"position": 1, "driver": "Max Verstappen"},
                        {"position": 2, "driver": "Sergio Perez"},
                        {"position": 3, "driver": "Carlos Sainz"},
                        {"position": 4, "driver": "Charles Leclerc"}
                    ]
                }
            },
            "confidence": 0.95,
            "intelligence_trace": {"intent": "driver_position"},
            "history": [],
            "errors": []
        }
        res_leclerc = synthesize_node(state_leclerc)
        answer_leclerc = res_leclerc["investigation_report"]["Executive Summary"]
        self.assertIn("Charles Leclerc finished P4", answer_leclerc)
        self.assertNotIn("Max Verstappen won", answer_leclerc)

        # Test 2: Podium / Top 3 (Imola)
        state_podium = {
            "question": "Give me the podium at Imola.",
            "semantic_contract": {
                "intent": "podium",
                "requested_metric": "podium",
                "limit": 3,
                "aggregation": "top_n",
                "entities": {"grand_prix": "Emilia Romagna GP", "season": 2024}
            },
            "evidence": {
                "race_results_tool": {
                    "winner": "Max Verstappen",
                    "grand_prix": "Emilia Romagna GP",
                    "season": 2024,
                    "classification": [
                        {"position": 1, "driver": "Max Verstappen"},
                        {"position": 2, "driver": "Lando Norris"},
                        {"position": 3, "driver": "Charles Leclerc"}
                    ]
                }
            },
            "confidence": 0.95,
            "intelligence_trace": {"intent": "podium"},
            "history": [],
            "errors": []
        }
        res_podium = synthesize_node(state_podium)
        answer_podium = res_podium["investigation_report"]["Executive Summary"]
        self.assertIn("Top 3 finishers", answer_podium)
        self.assertIn("P1: Max Verstappen", answer_podium)
        self.assertIn("P2: Lando Norris", answer_podium)
        self.assertIn("P3: Charles Leclerc", answer_podium)

if __name__ == "__main__":
    unittest.main()
