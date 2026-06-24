import os
from fastapi.testclient import TestClient

os.environ["SUPABASE_URL"] = "https://example.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "service-key"
os.environ["SUPABASE_ANON_KEY"] = "sb_publishable_test"

from app import db, jobs, main  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)


def _payload():
    return {
        "model": "prophet",
        "date_column": "date",
        "segment_column": "segment",
        "dependent_variable": "y",
        "segments": [{
            "segmentValue": "A", "segment": "seg",
            "forecast_periods": 2, "frequency": "MS",
            "training_records": 3, "test_records": 1, "prophet_params": {},
        }],
        "data": [],
        "metrics": ["mae"],
    }


def test_post_forecast_requires_auth():
    resp = client.post("/forecast", json=_payload())
    assert resp.status_code == 401


def test_post_forecast_creates_job(monkeypatch):
    monkeypatch.setattr(main, "verify_token", lambda token: "u1")
    monkeypatch.setattr(db, "create_job", lambda user_id, model: "job-xyz")
    monkeypatch.setattr(jobs, "process_job", lambda job_id, req: None)
    resp = client.post(
        "/forecast", json=_payload(),
        headers={"Authorization": "Bearer any-token"},
    )
    assert resp.status_code == 200
    assert resp.json()["job_id"] == "job-xyz"
