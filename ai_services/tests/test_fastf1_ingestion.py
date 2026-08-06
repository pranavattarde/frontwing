import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.ingestion.fastf1_collector import FastF1Collector

class TestFastF1Ingestion(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.collector = FastF1Collector()

    @patch.object(FastF1Collector, "collect")
    def test_load_session_endpoint(self, mock_collect):
        mock_collect.side_effect = Exception("Offline mock mode")
        payload = {
            "year": 2026,
            "gp": "British",
            "session": "R"
        }
        # First load request (populates synthetic session)
        res1 = self.client.post("/sessions/load", json=payload)
        self.assertEqual(res1.status_code, 200)
        json1 = res1.json()
        self.assertIn("status", json1)
        self.assertIn(json1["status"], ["loaded", "cached"])
        self.assertIn("session_id", json1)

        # Second load request (returns cached status to avoid downloading/processing twice)
        res2 = self.client.post("/sessions/load", json=payload)
        self.assertEqual(res2.status_code, 200)
        json2 = res2.json()
        self.assertEqual(json2["status"], "cached")
        self.assertEqual(json2["session_id"], json1["session_id"])

    @patch.object(FastF1Collector, "collect")
    def test_collector_load_session_direct(self, mock_collect):
        mock_collect.side_effect = Exception("Offline mock mode")
        res = self.collector.load_session(2026, "Monaco", "R")
        self.assertIn("status", res)
        self.assertIn("session_id", res)

if __name__ == "__main__":
    unittest.main()
