import unittest
from fastapi.testclient import TestClient
from app.main import app

class TestAIServiceAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_check(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "healthy", "service": "frontwing-ai-services"})

    def test_simulate_route_no_data_error(self):
        # Since DB is down/not seeded for this session, it should raise a 400 or 500 error
        response = self.client.post("/simulate", json={
            "session_id": "non_existent_session",
            "driver_id": "leclerc",
            "simulated_pit_lap": 20,
            "save_to_db": False
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn("No timing data found in database", response.json()["detail"])

if __name__ == "__main__":
    unittest.main()
