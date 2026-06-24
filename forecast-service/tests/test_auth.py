import os
import time
import jwt
import pytest
from fastapi import HTTPException

os.environ["SUPABASE_JWT_SECRET"] = "test-secret"
from app.auth import verify_token  # noqa: E402

SECRET = "test-secret"


def _token(sub="user-123", exp_delta=3600, aud="authenticated"):
    payload = {"sub": sub, "aud": aud, "exp": int(time.time()) + exp_delta}
    return jwt.encode(payload, SECRET, algorithm="HS256")


def test_valid_token_returns_user_id():
    assert verify_token(_token(sub="abc")) == "abc"


def test_expired_token_raises_401():
    with pytest.raises(HTTPException) as e:
        verify_token(_token(exp_delta=-10))
    assert e.value.status_code == 401


def test_malformed_token_raises_401():
    with pytest.raises(HTTPException) as e:
        verify_token("not-a-jwt")
    assert e.value.status_code == 401
