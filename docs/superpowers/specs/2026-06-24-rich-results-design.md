# Rich Results (Phase 2) — Design

**Date:** 2026-06-24
**Branch:** `feature/real-forecasting` (continues Phase 1)
**Status:** Approved design, pending implementation plan

## Problem

When the mock forecast (`generateMockForecast`) was replaced with the real Prophet/AutoGluon backend (Phase 1, "clean core"), the results page lost several sections because they were driven by fields the mock fabricated and the real backend doesn't produce: `ai_commentary`, `transformations_applied` + `raw_*` (raw-vs-transformed), and `benchmark_*`. Two chart labels are also now inaccurate (a hardcoded "With Transformations" title and a "95% Confidence" badge).

The results UI (`ForecastResults.tsx`, `ResultsTable.tsx`) still contains all the rendering code for these — it is just gated on fields that no longer arrive. This phase restores the valuable pieces with **real** data.

## Decisions (from brainstorming)

- **Transformations comparison: DROPPED.** Prophet and AutoGluon model trend/seasonality internally; pre-differencing/logging doesn't help them and correct inverse-transforms add complexity for little benefit. The dead raw-vs-transformed UI is removed rather than left dormant.
- **Benchmark: opt-in.** A toggle (off by default) + model dropdown (defaults to the other model). Backend fits a second model per segment only when requested.
- **AI commentary: edge function, progressive, per-segment.** Reuses the Gemini key already configured in Supabase edge functions; no new secret in the Python service. Results render instantly; commentary fills in afterward.

## Goals

- Restore a genuine **benchmark model comparison** (Prophet vs AutoGluon) using real fits.
- Add real **per-segment AI commentary** via Gemini.
- Fix the inaccurate chart labels and remove dead transformation UI.
- Keep all additions **best-effort / non-blocking**: a benchmark or commentary failure never breaks the core forecast.

## Non-goals

- Transformations / raw-vs-transformed comparison (explicitly dropped).
- Changing the core forecast pipeline from Phase 1.
- Adding the Gemini dependency to the Python forecast service.

## Architecture

Three mostly-independent pieces. The frontend already renders benchmark + commentary (props/toggles/CSV exist), so the work is concentrated in the Python service and one new edge function, with small frontend wiring.

```
Run (opt-in benchmark)                AI commentary (after results load)
  React ──payload{benchmark_model?}──▶ forecast-service        ForecastResults ──▶ forecast-commentary (Deno+Gemini)
        ◀── job_id; poll forecast_jobs ◀── benchmark_* + interval_width        ◀── ai_commentary (per segment)
```

### Components

**1. Python forecast service**
- `app/schemas.py` — `ForecastRequest` gains optional `benchmark_model: str | None`.
- `app/jobs.py` — per segment:
  - include `interval_width` (from the segment's `prophet_params`, default 0.8) in the result dict.
  - if `benchmark_model` is set and differs from `model`: fit it via `get_model(benchmark_model)` and attach `benchmark_model`, `benchmark_training_data`, `benchmark_test_data`, `benchmark_forecast_data`, `benchmark_metrics`. Wrap in its own try/except — on failure, omit the benchmark fields (primary result and the job still succeed).

**2. New edge function `supabase/functions/forecast-commentary/index.ts`** (Deno + Gemini)
- Same CORS + `GEMINI_API_KEY` + `generativelanguage.googleapis.com` pattern as `analyze-transformations`.
- Input: `{ segmentValue, model, metrics, forecastSummary }` (forecastSummary = a few numbers describing the forecast trend, computed client-side).
- Output: `{ commentary: string }` — 2–3 plain-language sentences about the model's fit and forecast.

**3. Frontend**
- `src/lib/forecastClient.ts` — `ForecastJobPayload` gains optional `benchmark_model`.
- `src/pages/Index.tsx` — benchmark UI state: a "Compare against a benchmark model" switch (default off) + a model dropdown defaulting to the other model; include `benchmark_model` in the payload when enabled. Place it with the model selector / run config.
- `src/components/forecast/ForecastResults.tsx`:
  - **Label fix:** main chart title `"Complete Time Series: With Transformations"` → `"Complete Time Series"`; hardcoded `"95% Confidence"` badge → dynamic from `interval_width` (via the existing `getConfidenceLabels` helper).
  - **Cleanup:** remove the unreachable raw-vs-transformed cards ("Transformation Impact Comparison", "Complete Time Series: Raw") and the "No Test Data after transformations" alert. Keep benchmark rendering.
  - **Commentary:** on load, fire one `supabase.functions.invoke('forecast-commentary', { body })` per segment, store results in local state keyed by `segmentValue`, render in the existing "AI Analysis" box as each resolves. Failures are swallowed (box stays hidden).
- `src/components/forecast/ResultsTable.tsx` — remove the `raw*` props and the transformed/raw toggle (dead after dropping transformations). Keep benchmark columns.

## Data flow

1. **Run.** If benchmark enabled, payload includes `benchmark_model`. Submit → poll `forecast_jobs` (unchanged Phase 1 flow).
2. **Results.** Each segment result now also carries `interval_width` and, when requested, `benchmark_*`. The page renders primary + benchmark immediately.
3. **Commentary.** `ForecastResults` fires per-segment commentary calls after mount; each fills its "AI Analysis" box when it returns. Independent of the forecast job.

## Error handling

- **Benchmark fit fails** → that segment omits `benchmark_*`; primary result and job unaffected.
- **Commentary call fails / `GEMINI_API_KEY` unset** → that segment's commentary box stays hidden; no error surfaced beyond a console log.
- **Benchmark = AutoGluon** → slow; the UI notes the extra runtime near the toggle.

## Testing

- **Python:** `jobs.py` benchmark path — mock `get_model` so both primary and benchmark return a stub `SegmentOutput`; assert `benchmark_*` present and metrics carried, and that a benchmark exception leaves the primary intact. Schema test for `benchmark_model` optionality. Existing suite stays green.
- **Frontend:** `npx tsc --noEmit -p tsconfig.app.json` clean; manual `/run` — a Prophet run with AutoGluon benchmark shows two sets of metrics/lines, and commentary boxes populate.
- **Edge function:** manual verification (Deno not unit-tested locally) — invoke with a sample body, confirm a commentary string returns.

## Configuration

- No new Python service env var.
- `forecast-commentary` edge function needs `GEMINI_API_KEY` (already set in Supabase from Phase 1) and must be deployed alongside the others.

## Open considerations (not blockers)

- AutoGluon-as-benchmark runtime (minutes); mitigated by opt-in + UI note.
- Commentary adds N Gemini calls per run (one per segment); fine for personal-tool segment counts.
