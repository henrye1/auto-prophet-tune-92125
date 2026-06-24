import os
import httpx
import pytest

os.environ["SUPABASE_URL"] = "https://example.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "service-key"
from app import db  # noqa: E402


def test_create_job_posts_and_returns_id(monkeypatch):
    captured = {}

    class FakeResp:
        status_code = 201
        def json(self):
            return [{"id": "job-1"}]
        def raise_for_status(self):
            pass

    def fake_post(url, headers=None, json=None, timeout=None):
        captured["url"] = url
        captured["json"] = json
        captured["headers"] = headers
        return FakeResp()

    monkeypatch.setattr(httpx, "post", fake_post)
    job_id = db.create_job("user-9", "prophet")
    assert job_id == "job-1"
    assert captured["url"].endswith("/rest/v1/forecast_jobs")
    assert captured["json"]["user_id"] == "user-9"
    assert captured["json"]["model"] == "prophet"
    assert captured["json"]["status"] == "pending"
    assert captured["headers"]["apikey"] == "service-key"
    assert captured["headers"]["Authorization"] == "Bearer service-key"
    assert captured["headers"]["Prefer"] == "return=representation"
    assert captured["json"]["progress"] == 0


def test_update_job_patches_with_filter(monkeypatch):
    captured = {}

    class FakeResp:
        status_code = 204
        def raise_for_status(self):
            pass

    def fake_patch(url, headers=None, json=None, timeout=None):
        captured["url"] = url
        captured["json"] = json
        captured["headers"] = headers
        return FakeResp()

    monkeypatch.setattr(httpx, "patch", fake_patch)
    db.update_job("job-1", {"status": "completed", "progress": 100})
    assert "id=eq.job-1" in captured["url"]
    assert captured["headers"]["apikey"] == "service-key"
    assert captured["headers"]["Authorization"] == "Bearer service-key"
    assert captured["headers"]["Content-Type"] == "application/json"
    assert captured["json"]["status"] == "completed"
    assert captured["json"]["progress"] == 100
