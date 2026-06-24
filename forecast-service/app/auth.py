import os
import httpx
from fastapi import HTTPException


def verify_token(token: str) -> str:
    """Verify a Supabase user access token and return the user id.

    Delegates verification to Supabase's /auth/v1/user endpoint so it works
    regardless of JWT signing algorithm (this project uses ES256 asymmetric
    signing keys, not a legacy HS256 shared secret).
    """
    url = os.environ.get("SUPABASE_URL")
    apikey = os.environ.get("SUPABASE_ANON_KEY")
    if not url or not apikey:
        raise HTTPException(status_code=500, detail="Supabase auth env not configured")
    try:
        resp = httpx.get(
            f"{url.rstrip('/')}/auth/v1/user",
            headers={"Authorization": f"Bearer {token}", "apikey": apikey},
            timeout=10,
        )
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Auth service unreachable")
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user_id = resp.json().get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user id")
    return user_id
