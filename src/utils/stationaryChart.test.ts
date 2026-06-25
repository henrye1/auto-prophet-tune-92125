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
    expect(out.rows[0].ci_span).toBeCloseTo(Math.log(11) - Math.log(9), 6);
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

  it("applies standardize, omits band, preserves length", () => {
    const rows = buildChartRows(seg);
    const out = toStationaryRows(rows, [{ type: "standardize" }]);
    expect(out.applied).toBe(true);
    expect(out.showBand).toBe(false);
    expect(out.rows).toHaveLength(rows.length);
    expect(out.rows[0].ci_base).toBeNull();
    expect(out.rows[0].ci_span).toBeNull();
  });
});
