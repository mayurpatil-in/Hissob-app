"""
Unit tests for Health Check & Core Endpoints
"""
import unittest
from fastapi.testclient import TestClient
from app.main import app

class HealthCheckTestCase(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("app", data)
        self.assertIn("version", data)
        self.assertIn("database", data)
        self.assertIn(data["status"], ["ok", "degraded"])

    def test_cors_headers(self):
        response = self.client.options(
            "/api/v1/auth/login",
            headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"}
        )
        self.assertIn(response.status_code, [200, 204])

if __name__ == "__main__":
    unittest.main()
