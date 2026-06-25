# Stationary-domain chart + challenger on both charts

**Date:** 2026-06-25
**Status:** Approved
**Scope:** Frontend only. No backend / `forecast-service` / API changes.

## Problem

The forecast results view ([`src/components/forecast/ForecastResults.tsx`](../../../src/components/forecast/ForecastResults.tsx)) currently shows, per segment:

- One "Complete Time Series" chart plotting the **primary** model's actual / fitted / forecast + confidence band, in the **raw (original-scale)** domain.
- A metrics card and results table that *do* include the challenger (benchmark) model.

Two gaps:

1. The **challenger model** is computed by the backend and returned in `benchmark_*` fields, but it is **never drawn on the chart** — only in the metrics card and table.
2. There is **no view of the forecast in the stationary (transformed) domain**, even though the analysis stage computes stationarity transforms per segment.

## Decision

Frontend-only re-expression. We do **not** train or forecast a separate model on the stationary series, and we do **not** recompute metrics in the stationary domain. The stationary chart is a visual re-expression of the existing raw-domain forecast.

## Changes

### 1. Challenger lines on the existing raw chart

In the "Complete Time Series" chart, add two lines for the benchmark model when `segment.benchmark_model` is present:

- **Challenger Fitted (Test)** — from `segment.benchmark_test_data[].predicted`
- **Challenger Forecast** — from `segment.benchmark_forecast_data[].predicted`

Rendered as dashed lines in a distinct color (e.g. teal `rgb(13, 148, 136)`), with legend entries. No challenger confidence band (lines only). Aligned to the same `date` axis as the primary series.

### 2. New "Stationary (Transformed) View" chart

A second chart rendered below the raw chart in the same `TabsContent`, per segment.

- Re-expresses the same series — primary actual / fitted / forecast and (when present) challenger fitted / forecast — in the stationary domain by applying the **dependent variable's transformation chain** via the existing [`applyTransformationChain`](../../../src/utils/dataAnalysis.ts) (supports `log`, `difference`, `seasonal_difference`, `box_cox`, `standardize`).
- The transform chain is looked up from `segmentAnalysisStates[segment.segmentValue]?.dependent?.transformations`. `segmentAnalysisStates` is passed into `ForecastResults` as a **new optional prop** (already held in [`src/pages/Index.tsx`](../../../src/pages/Index.tsx)).
- **Empty-chain case:** if the segment has no applied transform (chain empty or all `type === 'none'`), the stationary view is **hidden** and replaced with a small note: "No stationarity transform applied for this segment."
- **Confidence band:** shown only for length-preserving transforms (`log`, `box_cox`, `standardize`); **omitted when the chain contains `difference` or `seasonal_difference`** (differencing bounds is not meaningful). The raw chart keeps its band unchanged.

### Series construction & transform application

- Build per-series numeric arrays aligned to the concatenated date axis (train -> test -> forecast): one array for actual, one for the primary predicted path (fitted over test, forecast over future), one each for challenger fitted/forecast, and (conditionally) bounds.
- Apply the dependent transform chain to each numeric array independently.
- **Length alignment:** `difference` returns `n-1` points and `seasonal_difference` returns `n-period`; after transforming, drop the leading `k` dates (where `k` = total elements removed by the chain) so all series and the date axis stay aligned. Length-preserving transforms leave the axis unchanged.
- `NaN`/`null` inside a series (e.g. actual is null in the forecast region) propagates as a gap in the line — acceptable, matches current `connectNulls` behavior.
- Transform parameters are not carried on the analysis transform entries, so defaults in `applyTransformation` apply (`box_cox` lambda=0 -> log; `seasonal_difference` period=12).

## Components affected

- `src/components/forecast/ForecastResults.tsx` — add challenger lines to existing chart; add stationary chart card; accept new `segmentAnalysisStates` prop; add a helper to build + transform aligned series.
- `src/pages/Index.tsx` — pass `segmentAnalysisStates` to `<ForecastResults>`.
- `src/utils/dataAnalysis.ts` — reuse existing `applyTransformation` / `applyTransformationChain`; no change expected (extend only if a helper is needed for date-axis trimming).

## Out of scope

- No `forecast-service` / `jobs.py` / schema changes.
- No separately-trained stationary model.
- No stationary-domain metric recomputation.

## Testing

- Segment **with** a length-preserving transform (`log`): stationary chart renders with band; values equal `log` of raw series.
- Segment **with** `difference`: stationary chart renders without band; axis dropped by 1 leading point; values equal first differences.
- Segment **with no** transform: stationary chart hidden, note shown.
- Segment **with** a benchmark model: challenger fitted + forecast lines appear on both raw and stationary charts.
- Segment **without** a benchmark: no challenger lines, no errors.
- Segment with `error`: unchanged (both charts suppressed, as today).
