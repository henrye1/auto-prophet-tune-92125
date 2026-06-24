import os
import httpx
import pytest
from fastapi import HTTPException

os.environ["SUPABASE_URL"] = "https://example.supabase.co"
os.environ["SUPABASE_ANON_KEY"] = "sb_publishable_test"
from app.auth import verify_token  # noqa: E402


class FakeResp:
    def __init__(self, status_code, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def json(self):
        return self._payload


def test_valid_token_returns_user_id(monkeypatch):
    def fake_get(url, headers=None, timeout=None):
        assert headers["Authorization"].startswith("Bearer ")
        assert headers["apikey"]
        assert url.endswith("/auth/v1/user")
        return FakeResp(200, {"id": "abc"})
    monkeypatch.setattr(httpx, "get", fake_get)
    assert verify_token("good-token") == "abc"


def test_invalid_token_raises_401(monkeypatch):
    monkeypatch.setattr(httpx, "get", lambda *a, **k: FakeResp(401, {}))
    with pytest.raises(HTTPException) as e:
        verify_token("bad")
    assert e.value.status_code == 401


def test_missing_user_id_raises_401(monkeypatch):
    monkeypatch.setattr(httpx, "get", lambda *a, **k: FakeResp(200, {}))
    with pytest.raises(HTTPException) as e:
        verify_token("weird")
    assert e.value.status_code == 401


def test_unreachable_auth_raises_503(monkeypatch):
    def boom(*a, **k):
        raise httpx.ConnectError("down")
    monkeypatch.setattr(httpx, "get", boom)
    with pytest.raises(HTTPException) as e:
        verify_token("x")
    assert e.value.status_code == 503


def test_missing_env_raises_500(monkeypatch):
    monkeypatch.delenv("SUPABASE_ANON_KEY", raising=False)
    with pytest.raises(HTTPException) as e:
        verify_token("x")
    assert e.value.status_code == 500
