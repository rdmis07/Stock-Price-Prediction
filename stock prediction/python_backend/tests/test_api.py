"""API smoke tests using FastAPI's TestClient."""
from fastapi.testclient import TestClient

from backend.app import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


def test_signup_login_flow():
    payload = {"name": "Test", "email": "test@example.com", "password": "demo1234"}
    r = client.post("/api/auth/signup", json=payload)
    assert r.status_code in (201, 409)             # 409 on rerun
    r = client.post("/api/auth/login", json={"email": payload["email"], "password": payload["password"]})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data


def test_protected_requires_token():
    r = client.get("/api/stocks/AAPL")
    assert r.status_code == 401
