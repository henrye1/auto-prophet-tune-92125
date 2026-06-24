# Forecast Service

FastAPI service that fits Prophet / AutoGluon-TimeSeries models and writes
results to the Supabase `forecast_jobs` table.

## Local dev

```bash
cd forecast-service
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=...
uvicorn app.main:app --reload
pytest -v
```

## Deploy (Render)

1. Push this repo to GitHub.
2. In Render: New → Blueprint → point at `forecast-service/render.yaml`
   (or New → Web Service → Docker, root `forecast-service`).
3. Set env vars:
   - `SUPABASE_URL` — your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — the `sb_secret_...` key (Supabase dashboard →
     Project Settings → API). Bypasses RLS for job writes in this service.
   - `SUPABASE_ANON_KEY` — the `sb_publishable_...` key. Used as `apikey` header
     when calling `/auth/v1/user` for token introspection.
4. Use the **Standard** plan or larger — AutoGluon needs the RAM.
5. Copy the service URL into the frontend `.env` as `VITE_FORECAST_SERVICE_URL`.

## Auth

Bearer tokens are verified via Supabase token introspection (`GET /auth/v1/user`).
This approach works regardless of JWT signing algorithm — the project uses ES256
asymmetric signing keys, which are incompatible with HS256 shared-secret decoding.
The `/auth/v1/user` call simply asks Supabase whether the token is valid and returns
the user object; no local key material is needed.

## Security note

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and must live ONLY in the Render
service env — never in the frontend or committed to git. The browser only
ever uses the anon key and the user's own JWT.
