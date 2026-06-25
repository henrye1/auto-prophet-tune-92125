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

// Transforms whose confidence band can be re-expressed meaningfully: element-wise
// and monotonic, so transforming the lower/upper bounds keeps a valid interval.
// `standardize` is excluded — it rescales each series by its own mean/std, so a
// shared band axis is not meaningful; `difference`/`seasonal_difference` change
// length and differencing an interval is not meaningful.
const BAND_SAFE = new Set(["log", "box_cox"]);

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

const numCol = (rows: ChartRow[], key: keyof ChartRow): number[] =>
  rows.map((r) => {
    const v = r[key];
    return isNum(v) ? (v as number) : NaN;
  });

export function toStationaryRows(
  rows: ChartRow[],
  chain: Array<{ type: string; parameters?: any }>,
): StationaryResult {
  const active = (chain || []).filter((t) => t && t.type && t.type !== "none");
  if (active.length === 0) {
    return { rows: [], applied: false, showBand: false };
  }

  const showBand = active.every((t) => BAND_SAFE.has(t.type));

  const transformArr = (arr: number[]): Array<number | null> => {
    let out = arr;
    for (const t of active) out = applyTransformation(out, t.type, t.parameters);
    return out.map((v) => (isNum(v) ? v : null));
  };

  const actual = transformArr(numCol(rows, "actual"));
  const fitted = transformArr(numCol(rows, "fitted"));
  const forecast = transformArr(numCol(rows, "forecast"));
  const benchFitted = transformArr(numCol(rows, "benchFitted"));
  const benchForecast = transformArr(numCol(rows, "benchForecast"));

  // Band: transform the bound LEVELS (lower, upper) and recompute base/span in
  // the transformed domain, so the band reflects T(upper) - T(lower) rather than
  // T(upper - lower).
  let ciBase: Array<number | null> = [];
  let ciSpan: Array<number | null> = [];
  if (showBand) {
    const lower = transformArr(numCol(rows, "ci_base"));
    const upper = transformArr(
      rows.map((r) =>
        isNum(r.ci_base) && isNum(r.ci_span)
          ? (r.ci_base as number) + (r.ci_span as number)
          : NaN,
      ),
    );
    ciBase = lower;
    ciSpan = lower.map((lo, i) =>
      isNum(lo) && isNum(upper[i]) ? (upper[i] as number) - (lo as number) : null,
    );
  }

  // All columns share the same active chain, so they drop the same number of
  // leading rows (e.g. `difference` drops 1, `seasonal_difference` drops the
  // period). Derive that offset from any column and trim the date axis to match.
  const k = rows.length - actual.length;
  const dates = rows.slice(k).map((r) => r.date);

  const outRows: ChartRow[] = dates.map((date, i) => ({
    date,
    actual: actual[i] ?? null,
    fitted: fitted[i] ?? null,
    forecast: forecast[i] ?? null,
    benchFitted: benchFitted[i] ?? null,
    benchForecast: benchForecast[i] ?? null,
    ci_base: showBand ? ciBase[i] ?? null : null,
    ci_span: showBand ? ciSpan[i] ?? null : null,
  }));

  return { rows: outRows, applied: true, showBand };
}
