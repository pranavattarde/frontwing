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
    def test_load_session_endpoint_returns_error_on_fastf1_failure(self, mock_collect):
        """When FastF1 collect() raises, the endpoint must return status='error' — no synthetic fallback."""
        mock_collect.side_effect = Exception("Offline mock mode: no network")
        payload = {
            "year": 2026,
            "gp": "British",
            "session": "R"
        }
        res = self.client.post("/sessions/load", json=payload)
        self.assertEqual(res.status_code, 200)
        json_body = res.json()
        self.assertIn("status", json_body)
        # MUST be 'error', not 'loaded' or 'cached' — synthetic fallback is deleted
        self.assertEqual(json_body["status"], "error",
            f"Expected status='error' when FastF1 fails, got: {json_body['status']}")
        self.assertIsNone(json_body.get("session_id"),
            f"session_id must be None on error, got: {json_body.get('session_id')}")
        self.assertIn("message", json_body)
        self.assertIn("Offline mock mode", json_body["message"])

    @patch.object(FastF1Collector, "find_existing_session_id", return_value=None)
    @patch.object(FastF1Collector, "collect")
    def test_collector_load_session_direct_returns_error_on_failure(self, mock_collect, mock_find):
        """When FastF1 collect() raises, load_session() must return explicit error — no synthetic data."""
        mock_collect.side_effect = Exception("Offline mock mode: no network")
        res = self.collector.load_session(2026, "British", "R")
        self.assertIn("status", res)
        self.assertEqual(res["status"], "error",
            f"Expected status='error' when FastF1 fails, got: {res['status']}")
        self.assertIsNone(res.get("session_id"),
            f"session_id must be None on error, got: {res.get('session_id')}")
        self.assertIn("message", res)

if __name__ == "__main__":
    unittest.main()
