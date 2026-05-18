# forecast-api

Prophet forecasting backend for the auto-prophet-tune UI.

Stateless FastAPI service. One request fits one Prophet model for one segment and returns predictions plus metrics in the exact shape the frontend expects.

## Run locally

```sh
cd apps/forecast-api
python -m venv .venv
. .venv/Scripts/activate     # PowerShell: .venv\Scripts\Activate.ps1
pip install -e .
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Then point the frontend at it:

```sh
# in the project root
echo "VITE_FORECAST_API_URL=http://localhost:8000" >> .env
```

Restart `npm run dev` so Vite picks up the new env var.

## Endpoint

`POST /forecast` — body matches `ForecastRequest` in `app/schemas.py`.

`GET /health` — returns `{"ok": true}`.

## Run in Docker

```sh
docker build -t forecast-api .
docker run --rm -p 8000:8000 -e ALLOWED_ORIGINS=http://localhost:8080 forecast-api
```

## Limitations (v1)

- Prophet only. AutoGluon / ARIMA / AR / ARMA return a 400.
- If any regressors are configured, returns 400 — future-frame regressor values aren't supplied by the UI yet.
- No model persistence — fits per request.
- No auth — CORS-locked. Don't expose publicly without adding JWT verification.
