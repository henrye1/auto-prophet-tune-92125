import os
import httpx


def _base_url():
    return os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1/forecast_jobs"


def _headers(extra=None):
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    h = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if extra:
        h.update(extra)
    return h


def create_job(user_id: str, model: str) -> str:
    resp = httpx.post(
        _base_url(),
        headers=_headers({"Prefer": "return=representation"}),
        json={"user_id": user_id, "model": model, "status": "pending", "progress": 0},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()[0]["id"]


def update_job(job_id: str, fields: dict) -> None:
    resp = httpx.patch(
        f"{_base_url()}?id=eq.{job_id}",
        headers=_headers(),
        json=fields,
        timeout=30,
    )
    resp.raise_for_status()
