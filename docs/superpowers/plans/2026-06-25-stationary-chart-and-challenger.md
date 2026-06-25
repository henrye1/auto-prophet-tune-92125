# Stationary-domain Chart + Challenger on Both Charts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the forecast in the stationary (transformed) domain as a second chart, and draw the challenger (benchmark) model's fitted/forecast lines on both the raw and stationary charts.

**Architecture:** Frontend-only. Extract a pure helper module that (a) assembles aligned chart rows including challenger series and (b) re-expresses those rows in the stationary domain by applying the dependent variable's transformation chain. `ForecastResults` consumes the helper to render two charts; `Index` passes the existing `segmentAnalysisStates` down so the transform chain is available.

**Tech Stack:** React 18, TypeScript, Vite, recharts, vitest (added in Task 1 for the pure helper).

## Global Constraints

- No backend / `forecast-service` / API / schema changes.
- No separately-trained stationary model; the stationary chart is a visual re-expression of the existing raw-domain forecast.
- No stationary-domain metric recomputation; the metrics card stays raw-domain.
- Path alias `@/*` -> `./src/*` is available in app code; vitest must be configured to resolve it.
- Reuse existing `applyTransformation` from `src/utils/dataAnalysis.ts`; do not reimplement transforms.
- Challenger band is never drawn (lines only). Stationary band is drawn only for length-preserving transforms (`log`, `box_cox`, `standardize`).

## File Structure

- Create: `src/utils/stationaryChart.ts` — pure helpers `buildChartRows()` and `toStationaryRows()` + shared types/constants.
- Create: `src/utils/stationaryChart.test.ts` — vitest unit tests for the helpers.
- Create: `vitest.config.ts` — vitest config with `@` alias and node environment.
- Modify: `package.json` — add `vitest` devDependency and `test` script.
- Modify: `src/components/forecast/ForecastResults.tsx` — accept `segmentAnalysisStates` prop; use `buildChartRows` for the raw chart; add challenger lines; add the stationary chart card.
- Modify: `src/pages/Index.tsx` — pass `segmentAnalysisStates` into `<ForecastResults>`.

---

## Task 1: Pure helper module + vitest

**Files:**
- Create: `src/utils/stationaryChart.ts`
- Create: `src/utils/stationaryChart.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `applyTransformation(data: number[], transformation: string, parameters?: any): number[]` from `src/utils/dataAnalysis.ts`; `SegmentForecastResult`, `ForecastPoint` from `src/types/forecastResults.ts`.
- Produces:
  - `interface ChartRow { date: string; actual: number | null; fitted: number | null; forecast: number | null; benchFitted: number | null; benchForecast: number | null; ci_base: number | null; ci_span: number | null; }`
  - `buildChartRows(segment: SegmentForecastResult): ChartRow[]`
  - `interface StationaryResult { rows: ChartRow[]; applied: boolean; showBand: boolean; }`
  - `toStationaryRows(rows: ChartRow[], chain: Array<{ type: string; parameters?: any }>): StationaryResult`

- [ ] **Step 1: Add vitest devDependency and test script**

Edit `package.json`. In `"scripts"` add a `test` entry; in `"devDependencies"` add `vitest`:

```json
    "preview": "vite preview",
    "test": "vitest run"
```

```json
    "vite": "^5.4.19",
    "vitest": "^2.1.9"
```

(Keep existing entries; add commas as needed so JSON stays valid.)

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Install the new dependency**

Run: `npm install`
Expected: completes without error; `node_modules/vitest` exists.

- [ ] **Step 4: Write the failing tests**

Create `src/utils/stationaryChart.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildChartRows, toStationaryRows } from "./stationaryChart";
import type { SegmentForecastResult } from "@/types/forecastResults";

const seg: SegmentForecastResult = {
  segment: "A",
  segmentValue: "A",
  training_data: [
    { date: "2020-01-01", actual: 10, predicted: 10, lower_bound: 9, upper_bound: 11 },
    { date: "2020-02-01", actual: 20, predicted: 20, lower_bound: 18, upper_bound: 22 },
  ],
  test_data: [
    { date: "2020-03-01", actual: 30, predicted: 28, lower_bound: 26, upper_bound: 30 },
  ],
  forecast_data: [
    { date: "2020-04-01", predicted: 40, lower_bound: 36, upper_bound: 44 },
  ],
  benchmark_model: "autogluon",
  benchmark_test_data: [
    { date: "2020-03-01", predicted: 27, lower_bound: 25, upper_bound: 29 },
  ],
  benchmark_forecast_data: [
    { date: "2020-04-01", predicted: 41, lower_bound: 37, upper_bound: 45 },
  ],
};

describe("buildChartRows", () => {
  it("places fitted in test region and forecast in forecast region", () => {
    const rows = buildChartRows(seg);
    expect(rows.map((r) => r.date)).toEqual([
      "2020-01-01", "2020-02-01", "2020-03-01", "2020-04-01",
    ]);
    // training rows: actual present, no fitted/forecast
    expect(rows[0].actual).toBe(10);
    expect(rows[0].fitted).toBeNull();
    expect(rows[0].forecast).toBeNull();
    // test row: fitted set, forecast null
    expect(rows[2].fitted).toBe(28);
    expect(rows[2].forecast).toBeNull();
    // forecast row: forecast set, fitted null, actual null
    expect(rows[3].forecast).toBe(40);
    expect(rows[3].fitted).toBeNull();
    expect(rows[3].actual).toBeNull();
  });

  it("aligns challenger fitted/forecast by date", () => {
    const rows = buildChartRows(seg);
    expect(rows[2].benchFitted).toBe(27);
    expect(rows[2].benchForecast).toBeNull();
    expect(rows[3].benchForecast).toBe(41);
    expect(rows[3].benchFitted).toBeNull();
    expect(rows[0].benchFitted).toBeNull();
  });

  it("computes ci_base and ci_span", () => {
    const rows = buildChartRows(seg);
    expect(rows[0].ci_base).toBe(9);
    expect(rows[0].ci_span).toBe(2);
  });
});

describe("toStationaryRows", () => {
  it("returns applied=false for an empty chain", () => {
    const rows = buildChartRows(seg);
    const out = toStationaryRows(rows, []);
    expect(out.applied).toBe(false);
    expect(out.rows).toEqual([]);
  });

  it("returns applied=false when all transforms are 'none'", () => {
    const rows = buildChartRows(seg);
    const out = toStationaryRows(rows, [{ type: "none" }]);
    expect(out.applied).toBe(false);
  });

  it("applies log, keeps band and length", () => {
    const rows = buildChartRows(seg);
    const out = toStationaryRows(rows, [{ type: "log" }]);
    expect(out.applied).toBe(true);
    expect(out.showBand).toBe(true);
    expect(out.rows).toHaveLength(rows.length);
    expect(out.rows[0].actual).toBeCloseTo(Math.log(10), 6);
    expect(out.rows[0].ci_base).toBeCloseTo(Math.log(9), 6);
  });

  it("applies difference, drops band and one leading date", () => {
    const rows = buildChartRows(seg);
    const out = toStationaryRows(rows, [{ type: "difference" }]);
    expect(out.applied).toBe(true);
    expect(out.showBand).toBe(false);
    expect(out.rows).toHaveLength(rows.length - 1);
    expect(out.rows[0].date).toBe("2020-02-01");
    // actual diff: 20 - 10 = 10
    expect(out.rows[0].actual).toBe(10);
    // band suppressed
    expect(out.rows[0].ci_base).toBeNull();
    expect(out.rows[0].ci_span).toBeNull();
  });
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `stationaryChart.ts` does not export `buildChartRows` / `toStationaryRows` (module/resolve error).

- [ ] **Step 6: Implement the helper**

Create `src/utils/stationaryChart.ts`:

```ts
import { applyTransformation } from "./dataAnalysis";
import type { SegmentForecastResult } from "@/types/forecastResults";

export interface ChartRow {
  date: string;
  actual: number | null;
  fitted: number | null;
  forecast: number | null;
  benchFitted: number | null;
  benchForecast: number | null;
  ci_base: number | null;
  ci_span: number | null;
}

export interface StationaryResult {
  rows: ChartRow[];
  applied: boolean;
  showBand: boolean;
}

const LENGTH_PRESERVING = new Set(["log", "box_cox", "standardize"]);

const isNum = (v: any): v is number =>
  typeof v === "number" && !isNaN(v) && isFinite(v);

export function buildChartRows(segment: SegmentForecastResult): ChartRow[] {
  const training = segment.training_data || [];
  const test = segment.test_data || [];
  const forecast = segment.forecast_data || [];
  const all = [...training, ...test, ...forecast];
  const testStart = training.length;
  const testEnd = testStart + test.length;

  const benchTest = new Map(
    (segment.benchmark_test_data || []).map((d) => [d.date, d.predicted]),
  );
  const benchForecast = new Map(
    (segment.benchmark_forecast_data || []).map((d) => [d.date, d.predicted]),
  );

  return all.map((point, idx) => {
    let fitted: number | null = null;
    let forecastVal: number | null = null;
    if (idx >= testStart && idx < testEnd) fitted = point.predicted;
    else if (idx >= testEnd) forecastVal = point.predicted;

    const inTest = idx >= testStart && idx < testEnd;
    const inForecast = idx >= testEnd;

    return {
      date: point.date,
      actual: isNum(point.actual) ? (point.actual as number) : null,
      fitted: isNum(fitted) ? fitted : null,
      forecast: isNum(forecastVal) ? forecastVal : null,
      benchFitted:
        inTest && benchTest.has(point.date)
          ? (benchTest.get(point.date) as number)
          : null,
      benchForecast:
        inForecast && benchForecast.has(point.date)
          ? (benchForecast.get(point.date) as number)
          : null,
      ci_base:
        isNum(point.lower_bound) && isNum(point.upper_bound)
          ? point.lower_bound
          : null,
      ci_span:
        isNum(point.lower_bound) && isNum(point.upper_bound)
          ? point.upper_bound - point.lower_bound
          : null,
    };
  });
}

const NUMERIC_COLS: Array<keyof ChartRow> = [
  "actual",
  "fitted",
  "forecast",
  "benchFitted",
  "benchForecast",
  "ci_base",
  "ci_span",
];

export function toStationaryRows(
  rows: ChartRow[],
  chain: Array<{ type: string; parameters?: any }>,
): StationaryResult {
  const active = (chain || []).filter((t) => t && t.type && t.type !== "none");
  if (active.length === 0) {
    return { rows: [], applied: false, showBand: false };
  }

  const showBand = active.every((t) => LENGTH_PRESERVING.has(t.type));

  const transformCol = (key: keyof ChartRow): Array<number | null> => {
    const raw: number[] = rows.map((r) => {
      const v = r[key];
      return isNum(v) ? (v as number) : NaN;
    });
    let out = raw;
    for (const t of active) {
      out = applyTransformation(out, t.type, t.parameters);
    }
    return out.map((v) => (isNum(v) ? v : null));
  };

  const transformed: Record<string, Array<number | null>> = {};
  for (const c of NUMERIC_COLS) transformed[c] = transformCol(c);

  const k = rows.length - transformed["actual"].length; // leading dates removed
  const dates = rows.slice(k).map((r) => r.date);

  const outRows: ChartRow[] = dates.map((date, i) => ({
    date,
    actual: transformed["actual"][i],
    fitted: transformed["fitted"][i],
    forecast: transformed["forecast"][i],
    benchFitted: transformed["benchFitted"][i],
    benchForecast: transformed["benchForecast"][i],
    ci_base: showBand ? transformed["ci_base"][i] : null,
    ci_span: showBand ? transformed["ci_span"][i] : null,
  }));

  return { rows: outRows, applied: true, showBand };
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all tests in `stationaryChart.test.ts` green.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/utils/stationaryChart.ts src/utils/stationaryChart.test.ts
git commit -m "feat(web): add stationary-chart helper + vitest"
```

---

## Task 2: Raw chart uses helper + challenger lines + new prop

**Files:**
- Modify: `src/components/forecast/ForecastResults.tsx`
- Modify: `src/pages/Index.tsx`

**Interfaces:**
- Consumes: `buildChartRows`, `ChartRow` from `src/utils/stationaryChart.ts` (Task 1).
- Produces: `ForecastResults` now accepts an optional prop `segmentAnalysisStates?: Record<string, Record<string, any>>` (used in Task 3).

- [ ] **Step 1: Add imports and the new prop to ForecastResults**

In `src/components/forecast/ForecastResults.tsx`, add to the imports near the top (after the existing `import type { PerformanceMetric }` line):

```tsx
import { buildChartRows, toStationaryRows } from "@/utils/stationaryChart";
```

Change the props interface:

```tsx
interface ForecastResultsProps {
  results: ForecastResultsType;
  selectedMetrics: PerformanceMetric[];
  segmentAnalysisStates?: Record<string, Record<string, any>>;
}
```

Change the component signature:

```tsx
export const ForecastResults = ({ results, selectedMetrics, segmentAnalysisStates }: ForecastResultsProps) => {
```

- [ ] **Step 2: Replace the inline raw-chart data builder with the helper**

In the "Complete Time Series" `<ComposedChart>`, replace the inline IIFE passed to `data={(() => { ... })()}` (the block that builds `allData` and maps it to `{ date, actual, fitted, forecast, ci_base, ci_span }`) with:

```tsx
                    <ComposedChart data={buildChartRows(segment)}>
```

(Delete the entire former IIFE body that previously produced the array.)

- [ ] **Step 3: Add challenger lines to the raw chart**

Immediately after the existing `forecast` `<Line>` (the purple `dataKey="forecast"` line) and before `</ComposedChart>`, add:

```tsx
                    {segment.benchmark_model && (
                      <Line
                        type="monotone"
                        dataKey="benchFitted"
                        stroke="rgb(13, 148, 136)"
                        strokeWidth={2}
                        strokeDasharray="2 2"
                        dot={false}
                        name={`Challenger Fitted (${segment.benchmark_model})`}
                        connectNulls={true}
                      />
                    )}
                    {segment.benchmark_model && (
                      <Line
                        type="monotone"
                        dataKey="benchForecast"
                        stroke="rgb(13, 148, 136)"
                        strokeWidth={2}
                        strokeDasharray="2 6"
                        dot={false}
                        name={`Challenger Forecast (${segment.benchmark_model})`}
                        connectNulls={true}
                      />
                    )}
```

- [ ] **Step 4: Add a challenger legend badge to the raw chart header row**

In the badge row above the raw chart (the `flex gap-2 mb-4 flex-wrap` div), after the purple "Forecast" badge, add:

```tsx
                  {segment.benchmark_model && (
                    <Badge variant="outline" className="bg-teal-500/10 border-teal-500/30">
                      <div className="w-3 h-3 rounded-full bg-teal-600 mr-2" />
                      Challenger ({segment.benchmark_model})
                    </Badge>
                  )}
```

- [ ] **Step 5: Pass the prop from Index**

In `src/pages/Index.tsx`, find the render (around line 725):

```tsx
                <ForecastResults results={forecastResults} selectedMetrics={selectedMetrics} />
```

Replace with:

```tsx
                <ForecastResults results={forecastResults} selectedMetrics={selectedMetrics} segmentAnalysisStates={segmentAnalysisStates} />
```

- [ ] **Step 6: Typecheck / build**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 7: Manual verification**

Run: `npm run dev` (if not already running), open the app, run a forecast with a benchmark model enabled, open Results.
Expected: the "Complete Time Series" chart now shows two teal dashed challenger lines (fitted + forecast) plus a "Challenger (...)" legend badge. Segments without a benchmark show no teal lines and no badge.

- [ ] **Step 8: Commit**

```bash
git add src/components/forecast/ForecastResults.tsx src/pages/Index.tsx
git commit -m "feat(web): draw challenger model on the forecast chart"
```

---

## Task 3: Stationary (transformed) view chart

**Files:**
- Modify: `src/components/forecast/ForecastResults.tsx`

**Interfaces:**
- Consumes: `buildChartRows`, `toStationaryRows`, `StationaryResult` from `src/utils/stationaryChart.ts`; the `segmentAnalysisStates` prop added in Task 2.

- [ ] **Step 1: Add the stationary chart card after the raw chart**

In `src/components/forecast/ForecastResults.tsx`, immediately after the closing `</Card>` of the "Complete Time Series" card and before the `{/* Results Table */}` block, insert:

```tsx
            {/* Stationary (Transformed) View */}
            {!segment.error && (() => {
              const chain = segmentAnalysisStates?.[segment.segmentValue]?.dependent?.transformations || [];
              const stationary = toStationaryRows(buildChartRows(segment), chain);

              if (!stationary.applied) {
                return (
                  <Card className="border-amber-500/30 bg-amber-50/10">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="h-4 w-4 text-amber-600" />
                        Stationary (Transformed) View
                      </CardTitle>
                      <CardDescription>
                        No stationarity transform applied for this segment.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              }

              return (
                <Card className="border-indigo-500/30 bg-indigo-50/10">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-4 w-4 text-indigo-600" />
                      Stationary (Transformed) View
                    </CardTitle>
                    <CardDescription>
                      Forecast re-expressed in the stationary domain
                      {!stationary.showBand && " (confidence band omitted for differencing)"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <ComposedChart data={stationary.rows}>
                        <defs>
                          <linearGradient id={`confidenceGradient-stationary-${segment.segment}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          className="text-xs"
                          tickFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '0.5rem',
                          }}
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                          formatter={(value: any) => [typeof value === 'number' ? value.toFixed(4) : value, '']}
                        />
                        <Legend />

                        {stationary.showBand && (
                          <Area
                            type="monotone"
                            dataKey="ci_base"
                            stackId="ci"
                            stroke="none"
                            fill="none"
                            fillOpacity={0}
                            name=" "
                            legendType="none"
                            connectNulls={true}
                            activeDot={false}
                          />
                        )}
                        {stationary.showBand && (
                          <Area
                            type="monotone"
                            dataKey="ci_span"
                            stackId="ci"
                            stroke="rgb(99, 102, 241)"
                            strokeWidth={1}
                            strokeOpacity={0.25}
                            fill={`url(#confidenceGradient-stationary-${segment.segment})`}
                            name="Confidence"
                            connectNulls={true}
                            activeDot={false}
                          />
                        )}

                        <Line
                          type="monotone"
                          dataKey="actual"
                          stroke="rgb(37, 99, 235)"
                          strokeWidth={2.5}
                          dot={false}
                          name="Actual (stationary)"
                          connectNulls={true}
                        />
                        <Line
                          type="monotone"
                          dataKey="fitted"
                          stroke="rgb(249, 115, 22)"
                          strokeWidth={2.5}
                          strokeDasharray="5 5"
                          dot={false}
                          name="Fitted (Test)"
                          connectNulls={true}
                        />
                        <Line
                          type="monotone"
                          dataKey="forecast"
                          stroke="rgb(147, 51, 234)"
                          strokeWidth={2.5}
                          strokeDasharray="8 4"
                          dot={false}
                          name="Forecast"
                          connectNulls={true}
                        />
                        {segment.benchmark_model && (
                          <Line
                            type="monotone"
                            dataKey="benchFitted"
                            stroke="rgb(13, 148, 136)"
                            strokeWidth={2}
                            strokeDasharray="2 2"
                            dot={false}
                            name={`Challenger Fitted (${segment.benchmark_model})`}
                            connectNulls={true}
                          />
                        )}
                        {segment.benchmark_model && (
                          <Line
                            type="monotone"
                            dataKey="benchForecast"
                            stroke="rgb(13, 148, 136)"
                            strokeWidth={2}
                            strokeDasharray="2 6"
                            dot={false}
                            name={`Challenger Forecast (${segment.benchmark_model})`}
                            connectNulls={true}
                          />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              );
            })()}
```

- [ ] **Step 2: Typecheck / build**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`; in the app, run a forecast where the dependent variable has a stationarity transform applied (e.g. `log` or `difference`), plus a benchmark model, then open Results.
Expected:
- A second "Stationary (Transformed) View" chart appears below the raw chart.
- For a `log` transform: a confidence band is shown; values are the log-scaled series.
- For a `difference` transform: no band; the chart starts one period later; the description notes the band is omitted.
- Challenger fitted/forecast (teal dashed) appear on the stationary chart too.
- For a segment with no transform: the card shows "No stationarity transform applied for this segment."

- [ ] **Step 4: Commit**

```bash
git add src/components/forecast/ForecastResults.tsx
git commit -m "feat(web): add stationary-domain forecast chart with challenger"
```

---

## Self-Review

**Spec coverage:**
- Challenger on raw chart -> Task 2 (Steps 3-4). ✓
- Challenger on stationary chart -> Task 3 (Step 1, bench lines). ✓
- Stationary diagram + forecasting results -> Task 3. ✓
- Frontend-only re-expression via existing transforms -> Task 1 (`toStationaryRows` uses `applyTransformation`). ✓
- Transform chain from `segmentAnalysisStates[segmentValue].dependent.transformations` -> Task 2 (prop) + Task 3 (lookup). ✓
- Empty-chain -> hide + note -> Task 3 (Step 1, `!stationary.applied` branch). ✓
- Band only for length-preserving transforms -> Task 1 (`showBand`) + Task 3 (conditional Areas). ✓
- No backend/metrics changes -> Global Constraints; no backend tasks present. ✓
- Error segment unchanged -> Task 3 guarded by `!segment.error`; raw chart already guarded. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"; all steps contain concrete code/commands. ✓

**Type consistency:** `buildChartRows`/`toStationaryRows`/`ChartRow`/`StationaryResult` names and signatures match between Task 1 definition and Tasks 2-3 usage; prop `segmentAnalysisStates` defined in Task 2 and consumed in Task 3. ✓
