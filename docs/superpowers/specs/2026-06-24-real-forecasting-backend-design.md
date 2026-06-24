# Real Forecasting Backend — Design

**Date:** 2026-06-24
**Branch:** `feature/real-forecasting`
**Status:** Approved design, pending implementation plan

## Problem

The app's forecasting is a client-side mock (`generateMockForecast` in `src/pages/Index.tsx`). It does not run Prophet or AutoGluon:

- Test-period "predictions" are the real actual values jittered by ±5% random noise (leakage → near-perfect metrics).
- Future "forecasts" are the training average multiplied by a hardcoded linear trend and a hardcoded sine wave.

No real model is fit anywhere. The Prophet hyperparameter UI, transformations, and benchmark comparisons all wrap this placeholder. We want genuine Prophet **and** AutoGluon forecasts.

## Goals

- Replace the mock with real **Prophet** and **AutoGluon-TimeSeries** forecasts.
- Produce **honest out-of-sample metrics** on a proper train/test split.
- Return the **existing `SegmentForecastResult` shape** so the current results UI and charts work unchanged.
- Keep it appropriately simple for a **personal / internal tool** (low concurrency, occasional runs, can tolerate multi-minute AutoGluon runs).

## Non-goals (deferred)

These are explicitly out of scope for this "clean core first" version:

- **Regressors / covariates.** Forecasting forward needs *future* regressor values, which the app does not collect. The clean core is **univariate per segment**; the UI's regressor config is ignored and the result flags this so it is not silently dropped.
- **Data transformations** (log/difference for stationarity) applied before fitting.
- **Raw-vs-transformed comparison** and the **benchmark model**.
- Production concerns: autoscaling, multi-tenant load, job concurrency, monitoring.

These can each be added later behind the same interface.

## Context / intended use

- **Use:** personal / internal tool. Low concurrency, occasional runs, waiting is acceptable.
- **Hosting:** Python service on **Render** (Docker container). Note: AutoGluon (PyTorch, multi-GB image) does **not** fit Render's 512 MB free tier and that tier cold-starts after inactivity. Prophet fits comfortably; AutoGluon realistically needs a paid Render instance (~2 GB RAM). AutoGluon can be treated as opt-in if cost is a concern.
- **Request model:** submit-and-poll job (Approach B), with the **Supabase JWT** verified by the service.

## Architecture

```
┌─────────────┐   1. POST /forecast (+ JWT)      ┌──────────────────────┐
│  React app  │ ───────────────────────────────▶ │  FastAPI on Render   │
│  (browser)  │ ◀─── job_id ─────────────────────│  (Docker container)  │
└─────────────┘                                   │                      │
      │                                            │ - verify Supabase JWT│
      │ 2. poll forecast_jobs row (supabase-js)    │ - fit Prophet /      │
      ▼                                            │   AutoGluon          │
┌──────────────┐                                   │ - compute metrics    │
│  Supabase    │ ◀── 3. write progress + results ──│ - write job row      │
│ forecast_jobs│     (service role key)            └──────────────────────┘
│   table      │
└──────────────┘
```

The job store is a **Supabase table**, so the browser polls Supabase (not the compute box). This reuses the existing stack, survives a Render restart, and keeps polling traffic off the service.

### Components

**1. `forecast-service/` (new) — FastAPI app, Dockerized, deployed to Render.**

- `main.py` — `POST /forecast` (create job, return `job_id`, kick off background processing) and `GET /health`.
- `auth.py` — verifies the Supabase JWT locally (HS256 using the project's JWT secret); extracts `user_id`. Returns 401 on bad/expired tokens.
- `models/base.py` — the shared interface: `fit_forecast(train_df, test_df, future_periods, freq, params) -> SegmentOutput`.
- `models/prophet_model.py` — Prophet implementation.
- `models/autogluon_model.py` — AutoGluon-TimeSeries implementation.
- `models/__init__.py` — dispatcher mapping `model` string → implementation.
- `metrics.py` — out-of-sample metrics as pure functions.
- `jobs.py` — background processing loop; writes progress/results to `forecast_jobs` via the Supabase service-role key.
- `schemas.py` — Pydantic request/response models.
- `Dockerfile`, `requirements.txt`, `render.yaml` (or Render dashboard config).

Each model module is independently testable: feed a known series, assert on the forecast. The service has one clear responsibility: data in → forecast + metrics out.

**2. `forecast_jobs` table (new migration).**

| column      | type        | notes                                            |
|-------------|-------------|--------------------------------------------------|
| id          | uuid PK     | `gen_random_uuid()`                              |
| user_id     | uuid        | FK `auth.users(id)`; RLS key                     |
| status      | text        | `pending` / `running` / `completed` / `failed`   |
| progress    | numeric     | 0–100                                            |
| model       | text        | `prophet` / `autogluon`                          |
| results     | jsonb       | `{ segments: SegmentForecastResult[], model, timestamp }` |
| error       | text        | null unless failed                               |
| created_at  | timestamptz | default `now()`                                  |
| updated_at  | timestamptz | default `now()`; trigger-updated                 |

RLS: a user can select/insert/update only rows where `user_id = auth.uid()`. The service writes with the service-role key (bypasses RLS) but always sets `user_id` from the verified token.

**3. React changes (`src/pages/Index.tsx` + a small client module).**

- New `src/lib/forecastClient.ts`: `submitForecast(payload, accessToken) -> job_id` and a poll helper over the `forecast_jobs` row via `supabase-js`.
- Replace the `generateMockForecast` call path with: build payload → submit → poll → feed `results.segments` into the existing `ForecastResults` UI.
- The existing `ForecastProgress` component is driven by the row's `progress`.
- `generateMockForecast` and the deferred raw/benchmark branches are removed or guarded.
- New env var `VITE_FORECAST_SERVICE_URL` (the Render URL).

## Job lifecycle / data flow

1. **Submit (browser → service).** On Run, the app gathers one payload and POSTs with the Supabase access token in `Authorization: Bearer`:
   ```
   { model, date_column, segment_column, dependent_variable,
     segments: [{ segmentValue, forecast_periods, frequency, test_records, prophet_params }, ...],
     data: [ ...csv rows... ],
     metrics: ["mae","rmse", ...] }
   ```
2. **Create job (service).** Verify JWT → extract `user_id` → insert `forecast_jobs` row (`pending`, progress 0) → return `{ job_id }` immediately → start background task.
3. **Process (service, background).** For each segment, sequentially:
   - Split train / test using `test_records` (last N points held out).
   - Fit the chosen model on train; predict the test window **and** `forecast_periods` into the future at the segment's `frequency`.
   - Compute the requested metrics on the test set.
   - Update the row: `status=running`, `progress = done/total * 100`, append the segment result.
4. **Poll (browser → Supabase).** After receiving `job_id`, poll the row via `supabase-js` every ~2s (RLS-scoped). `progress` drives `ForecastProgress`.
5. **Finish.** Last segment done → `status=completed` with full `results`. Browser sees `completed`, stops polling, renders. On failure → `status=failed` with `error`, surfaced as a toast.

Deliberate choices for a personal tool: **sequential** segment processing (meaningful progress, avoids AutoGluon OOM); results stored **in the job row** (queryable history later); **polling** (~2s) rather than Realtime.

## Forecast contract & model interface

Shared interface:
```python
def fit_forecast(train_df, test_df, future_periods, freq, params) -> SegmentOutput
# SegmentOutput = { training_data, test_data, forecast_data, metrics }
```
Each point matches the existing `ForecastPoint`: `{ date, actual?, predicted, lower_bound, upper_bound, is_test?, is_forecast? }`.

**Prophet mapping:**
- Rename train columns to `ds`/`y`; fit `Prophet(growth, changepoint_prior_scale, seasonality_mode, seasonality_prior_scale, yearly/weekly/daily_seasonality, interval_width)` from `prophet_params`.
- Predict over test dates + `make_future_dataframe(periods=future_periods, freq=freq)`.
- `yhat` → `predicted`; `yhat_lower`/`yhat_upper` → bounds.
- `training_data` carries the in-sample fit so the chart shows a fitted line over history.

**AutoGluon mapping:**
- Build a `TimeSeriesDataFrame` (single `item_id` per segment).
- `TimeSeriesPredictor(prediction_length, eval_metric).fit(train, time_limit=<bounded, e.g. 60–90s>, presets="medium_quality")`.
- Test window: predict `prediction_length = len(test)` from the train end (honest out-of-sample).
- Future: predict from the full-series end.
- Mean/median quantile → `predicted`; quantiles derived from `interval_width` (e.g. 0.8 → 0.1 & 0.9) → bounds.

**Metrics** (`metrics.py`, on the test set only): MAE, RMSE, MAPE, MSE, R², SMAPE, MASE, coverage (share of test actuals within the interval). Only selected metrics are returned. With no regressors, `adj_r2` equals `r2`.

**Visible behavior change:** metrics will reflect real model error — no more near-perfect numbers from the mock predicting known values.

## Error handling

**Service:**
- Bad/expired JWT → `401`, no job created.
- Bad payload (missing columns, non-numeric target, empty segment) → `400` with a specific message; no job.
- Per-segment failure (won't converge, too few points) → that segment marked failed in `results` with its error; **remaining segments still run**.
- Whole-job crash / OOM / timeout → background handler catches, sets `status=failed` with the error. AutoGluon `time_limit` is bounded so it cannot run away.
- Minimum-data guard → segments below a sane floor (e.g. `≥ 2 × test_records` and an absolute minimum) fail fast with a clear "not enough data" message.

**Browser:**
- Submit fails (service down / Render cold start) → toast with retry hint; submit uses a longer timeout + one automatic retry.
- Poll sees `failed` → stop polling, surface error toast, clean UI state.
- Poll exceeds a safety cap (e.g. 10 min) → stop, inform the user the job may still be running, offer to keep waiting.

## Testing

- **Model modules** — unit tests with a small synthetic series (trend + season, like `sample_timeseries.csv`): forecast has correct length/dates, bounds bracket the prediction, metrics finite and within a sane range. One test per model.
- **Metrics** — pure functions tested against hand-computed values on tiny arrays.
- **Auth** — valid / expired / malformed tokens → expected status codes.
- **Endpoint** — `POST /forecast` with a mocked job store returns a `job_id`, creates a row, and invokes background processing.
- **End-to-end manual** — `/run` against `sample_timeseries.csv`: a Prophet run (watch progress, see real imperfect metrics), then an AutoGluon run.
- Prophet/AutoGluon internals are not re-tested — we test our glue and mapping.

## Secrets / configuration

**Render service env vars:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (to write job rows bypassing RLS)
- `SUPABASE_JWT_SECRET` (to verify incoming JWTs)

**Frontend env var:**
- `VITE_FORECAST_SERVICE_URL` (Render service URL)

## Open considerations (not blockers)

- AutoGluon cost on Render (paid instance for RAM). May make AutoGluon opt-in.
- Payload size: whole CSV is sent in the POST. Fine for personal data sizes (hundreds–thousands of rows); revisit if datasets grow.
- Cold starts on Render add latency to the first submit after idle; handled with retry + messaging.
