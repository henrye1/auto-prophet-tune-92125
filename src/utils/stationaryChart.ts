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
