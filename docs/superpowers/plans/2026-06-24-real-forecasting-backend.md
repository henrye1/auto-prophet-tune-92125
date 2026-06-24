# Real Forecasting Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the client-side mock forecast with a real Prophet + AutoGluon backend that returns genuine forecasts and honest out-of-sample metrics in the app's existing result shape.

**Architecture:** A FastAPI service (`forecast-service/`) deployed to Render as a Docker container. The browser submits a forecast job (with its Supabase JWT), the service verifies the token, fits the real model per segment in a background task, and writes progress + results to a new `forecast_jobs` Supabase table. The browser polls that table via `supabase-js` and feeds the results into the existing results UI.

**Tech Stack:** Python 3.11, FastAPI, Uvicorn, Pydantic, PyJWT, httpx, pandas, Prophet, AutoGluon-TimeSeries, pytest. Frontend: existing Vite + React + TypeScript + supabase-js.

## Global Constraints

- Python version: **3.11** (AutoGluon-TimeSeries compatibility).
- All new Python code lives under `forecast-service/`; it is deployed separately from the frontend.
- Forecast points MUST match the existing TS `ForecastPoint` shape exactly: `{ date: string (YYYY-MM-DD), actual?: number, predicted: number, lower_bound: number, upper_bound: number, is_test?: boolean, is_forecast?: boolean }`.
- Per-segment results MUST match `SegmentForecastResult` (`src/types/forecastResults.ts`): `{ segment, segmentValue, training_data, test_data, forecast_data, metrics }`.
- Train/test split is explicit: train = first `training_records` rows (sorted ascending by date), test = next `test_records` rows.
- Clean-core scope: **univariate per segment** (no regressors), no transformations, no benchmark, no raw-vs-transformed.
- Frontend reads the service URL from `VITE_FORECAST_SERVICE_URL`; never hardcode it.
- Do not break the existing app: the only frontend behavior change is the forecast source.
- Python tests use pytest (TDD). Frontend has no test runner; verify frontend tasks with `npx tsc --noEmit -p tsconfig.app.json` and the `/run` skill.

---

### Task 1: Scaffold the forecast service

**Files:**
- Create: `forecast-service/requirements.txt`
- Create: `forecast-service/app/__init__.py`
- Create: `forecast-service/app/schemas.py`
- Create: `forecast-service/app/main.py`
- Create: `forecast-service/tests/__init__.py`
- Create: `forecast-service/tests/test_health.py`
- Create: `forecast-service/pytest.ini`

**Interfaces:**
- Produces: `app.schemas.SegmentSpec`, `app.schemas.ForecastRequest`, `app.schemas.ForecastPoint`, `app.schemas.SegmentOutput`; FastAPI `app` in `app.main` with `GET /health`.

- [ ] **Step 1: Create `requirements.txt`**

```
fastapi==0.115.*
uvicorn[standard]==0.34.*
pydantic==2.*
pyjwt==2.*
httpx==0.28.*
pandas==2.*
prophet==1.1.*
autogluon.timeseries==1.2.*
pytest==8.*
```

- [ ] **Step 2: Create empty package files**

Create `forecast-service/app/__init__.py` (empty) and `forecast-service/tests/__init__.py` (empty).

- [ ] **Step 3: Create `pytest.ini`**

```ini
[pytest]
pythonpath = .
testpaths = tests
```

- [ ] **Step 4: Write the Pydantic schemas in `app/schemas.py`**

```python
from typing import Any, Optional
from pydantic import BaseModel


class SegmentSpec(BaseModel):
    segmentValue: str
    segment: str
    forecast_periods: int
    frequency: str
    training_records: int
    test_records: int
    prophet_params: Optional[dict[str, Any]] = None


class ForecastRequest(BaseModel):
    model: str  # "prophet" | "autogluon"
    date_column: str
    segment_column: str
    dependent_variable: str
    segments: list[SegmentSpec]
    data: list[dict[str, Any]]
    metrics: list[str]


class ForecastPoint(BaseModel):
    date: str
    actual: Optional[float] = None
    predicted: float
    lower_bound: float
    upper_bound: float
    is_test: Optional[bool] = None
    is_forecast: Optional[bool] = None


class SegmentOutput(BaseModel):
    training_data: list[ForecastPoint]
    test_data: list[ForecastPoint]
    forecast_data: list[ForecastPoint]
    metrics: dict[str, Optional[float]]
```

- [ ] **Step 5: Write the failing health test in `tests/test_health.py`**

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_returns_ok():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
```

- [ ] **Step 6: Run it to verify it fails**

Run: `cd forecast-service && python -m pytest tests/test_health.py -v`
Expected: FAIL (ImportError: cannot import name 'app' / module not found).

- [ ] **Step 7: Write `app/main.py`**

```python
from fastapi import FastAPI

app = FastAPI(title="Forecast Service")


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 8: Run it to verify it passes**

Run: `cd forecast-service && python -m pytest tests/test_health.py -v`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add forecast-service/
git commit -m "feat(forecast-service): scaffold FastAPI app with health check and schemas"
```

---

### Task 2: Metrics module

**Files:**
- Create: `forecast-service/app/metrics.py`
- Create: `forecast-service/tests/test_metrics.py`

**Interfaces:**
- Produces: `app.metrics.compute_metrics(actual: list[float], predicted: list[float], lower: list[float], upper: list[float], train_actual: list[float], selected: list[str]) -> dict[str, Optional[float]]`. Supported keys: `mae, rmse, mse, mape, smape, r2, adj_r2, coverage, mase`.

- [ ] **Step 1: Write failing tests in `tests/test_metrics.py`**

```python
import math
from app.metrics import compute_metrics


def test_perfect_prediction_zero_error():
    actual = [10.0, 20.0, 30.0]
    pred = [10.0, 20.0, 30.0]
    lo = [9.0, 19.0, 29.0]
    hi = [11.0, 21.0, 31.0]
    train = [1.0, 2.0, 3.0, 4.0]
    m = compute_metrics(actual, pred, lo, hi, train, ["mae", "rmse", "mse", "r2", "coverage"])
    assert m["mae"] == 0.0
    assert m["rmse"] == 0.0
    assert m["mse"] == 0.0
    assert m["r2"] == 1.0
    assert m["coverage"] == 100.0


def test_known_mae_and_mape():
    actual = [100.0, 200.0]
    pred = [110.0, 180.0]  # errors 10 and 20
    lo = [0.0, 0.0]
    hi = [0.0, 0.0]
    train = [50.0, 60.0, 70.0]
    m = compute_metrics(actual, pred, lo, hi, train, ["mae", "mape"])
    assert m["mae"] == 15.0  # (10 + 20) / 2
    # mape = mean(10/100, 20/200) * 100 = mean(0.1, 0.1) * 100 = 10.0
    assert math.isclose(m["mape"], 10.0, rel_tol=1e-9)


def test_only_selected_metrics_returned():
    m = compute_metrics([1.0], [1.0], [0.0], [2.0], [1.0, 2.0], ["mae"])
    assert set(m.keys()) == {"mae"}


def test_coverage_counts_points_inside_interval():
    actual = [5.0, 50.0]
    pred = [5.0, 5.0]
    lo = [4.0, 4.0]
    hi = [6.0, 6.0]  # second actual (50) is outside
    m = compute_metrics(actual, pred, lo, hi, [1.0, 2.0], ["coverage"])
    assert m["coverage"] == 50.0
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd forecast-service && python -m pytest tests/test_metrics.py -v`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `app/metrics.py`**

```python
import math
from typing import Optional


def compute_metrics(actual, predicted, lower, upper, train_actual, selected):
    a = [float(x) for x in actual]
    p = [float(x) for x in predicted]
    n = len(a)
    errors = [a[i] - p[i] for i in range(n)]
    abs_errors = [abs(e) for e in errors]

    out: dict[str, Optional[float]] = {}

    def mae():
        return sum(abs_errors) / n if n else None

    def mse():
        return sum(e * e for e in errors) / n if n else None

    if "mae" in selected:
        out["mae"] = mae()
    if "mse" in selected:
        out["mse"] = mse()
    if "rmse" in selected:
        v = mse()
        out["rmse"] = math.sqrt(v) if v is not None else None
    if "mape" in selected:
        terms = [abs_errors[i] / abs(a[i]) for i in range(n) if a[i] != 0]
        out["mape"] = (sum(terms) / len(terms) * 100) if terms else None
    if "smape" in selected:
        terms = []
        for i in range(n):
            denom = abs(a[i]) + abs(p[i])
            if denom != 0:
                terms.append(2 * abs_errors[i] / denom)
        out["smape"] = (sum(terms) / len(terms) * 100) if terms else None
    if "r2" in selected or "adj_r2" in selected:
        mean_a = sum(a) / n if n else 0.0
        ss_tot = sum((x - mean_a) ** 2 for x in a)
        ss_res = sum(e * e for e in errors)
        r2 = 1 - ss_res / ss_tot if ss_tot != 0 else None
        if "r2" in selected:
            out["r2"] = r2
        if "adj_r2" in selected:
            # univariate (no regressors): adjusted R2 equals R2
            out["adj_r2"] = r2
    if "coverage" in selected:
        inside = sum(1 for i in range(n) if lower[i] <= a[i] <= upper[i])
        out["coverage"] = (inside / n * 100) if n else None
    if "mase" in selected:
        t = [float(x) for x in train_actual]
        naive = [abs(t[i] - t[i - 1]) for i in range(1, len(t))]
        scale = sum(naive) / len(naive) if naive else None
        if scale and scale != 0:
            out["mase"] = mae() / scale
        else:
            out["mase"] = None

    return out
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd forecast-service && python -m pytest tests/test_metrics.py -v`
Expected: PASS (all 4 tests).

- [ ] **Step 5: Commit**

```bash
git add forecast-service/app/metrics.py forecast-service/tests/test_metrics.py
git commit -m "feat(forecast-service): add out-of-sample metrics module"
```

---

### Task 3: Frequency normalization and train/test split utilities

**Files:**
- Create: `forecast-service/app/utils.py`
- Create: `forecast-service/tests/test_utils.py`

**Interfaces:**
- Produces:
  - `app.utils.to_pandas_freq(freq: str) -> str` — maps human/alias frequency strings to a pandas offset alias.
  - `app.utils.split_segment(df, date_column, training_records, test_records) -> tuple[DataFrame, DataFrame]` — returns (train, test), sorted ascending by date.
  - `app.utils.fmt_date(ts) -> str` — formats a pandas Timestamp to `YYYY-MM-DD`.

- [ ] **Step 1: Write failing tests in `tests/test_utils.py`**

```python
import pandas as pd
from app.utils import to_pandas_freq, split_segment, fmt_date


def test_to_pandas_freq_human_names():
    assert to_pandas_freq("monthly") == "MS"
    assert to_pandas_freq("daily") == "D"
    assert to_pandas_freq("weekly") == "W"
    assert to_pandas_freq("quarterly") == "QS"
    assert to_pandas_freq("yearly") == "YS"


def test_to_pandas_freq_passthrough_alias():
    assert to_pandas_freq("MS") == "MS"
    assert to_pandas_freq("D") == "D"


def test_to_pandas_freq_unknown_defaults_to_ms():
    assert to_pandas_freq("something-odd") == "MS"


def test_split_segment_orders_and_splits():
    df = pd.DataFrame({
        "date": ["2022-03-01", "2022-01-01", "2022-02-01", "2022-04-01"],
        "y": [3, 1, 2, 4],
    })
    train, test = split_segment(df, "date", training_records=3, test_records=1)
    assert list(train["y"]) == [1, 2, 3]
    assert list(test["y"]) == [4]


def test_fmt_date():
    assert fmt_date(pd.Timestamp("2022-05-01")) == "2022-05-01"
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd forecast-service && python -m pytest tests/test_utils.py -v`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `app/utils.py`**

```python
import pandas as pd

_FREQ_MAP = {
    "daily": "D", "day": "D", "d": "D",
    "weekly": "W", "week": "W", "w": "W",
    "monthly": "MS", "month": "MS", "m": "MS", "ms": "MS", "me": "MS",
    "quarterly": "QS", "quarter": "QS", "q": "QS", "qs": "QS",
    "yearly": "YS", "year": "YS", "annual": "YS", "y": "YS", "a": "YS", "ys": "YS",
}


def to_pandas_freq(freq: str) -> str:
    if not freq:
        return "MS"
    key = freq.strip().lower()
    if key in _FREQ_MAP:
        return _FREQ_MAP[key]
    # Already a pandas alias we recognize? keep common ones as-is.
    if freq in {"D", "W", "MS", "M", "QS", "Q", "YS", "Y", "H"}:
        return freq
    return "MS"


def split_segment(df: pd.DataFrame, date_column: str, training_records: int, test_records: int):
    ordered = df.copy()
    ordered[date_column] = pd.to_datetime(ordered[date_column])
    ordered = ordered.sort_values(date_column).reset_index(drop=True)
    train = ordered.iloc[:training_records].copy()
    test = ordered.iloc[training_records:training_records + test_records].copy()
    return train, test


def fmt_date(ts) -> str:
    return pd.Timestamp(ts).strftime("%Y-%m-%d")
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd forecast-service && python -m pytest tests/test_utils.py -v`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add forecast-service/app/utils.py forecast-service/tests/test_utils.py
git commit -m "feat(forecast-service): add frequency mapping and train/test split utils"
```

---

### Task 4: Prophet model

**Files:**
- Create: `forecast-service/app/models/__init__.py`
- Create: `forecast-service/app/models/prophet_model.py`
- Create: `forecast-service/tests/test_prophet_model.py`

**Interfaces:**
- Consumes: `app.schemas.SegmentOutput`, `app.metrics.compute_metrics`, `app.utils.to_pandas_freq`, `app.utils.fmt_date`.
- Produces: `app.models.prophet_model.fit_forecast(train_df, test_df, date_column, value_column, future_periods, freq, params, selected_metrics) -> SegmentOutput`.

- [ ] **Step 1: Create empty `forecast-service/app/models/__init__.py`** (empty for now; dispatcher added in Task 6).

- [ ] **Step 2: Write the failing test in `tests/test_prophet_model.py`**

```python
import numpy as np
import pandas as pd
from app.models.prophet_model import fit_forecast


def _make_series(n=36):
    dates = pd.date_range("2020-01-01", periods=n, freq="MS")
    trend = np.arange(n) * 2.0
    season = 10 * np.sin(2 * np.pi * (dates.month - 1) / 12)
    y = 100 + trend + season
    return pd.DataFrame({"date": dates.strftime("%Y-%m-%d"), "y": y})


def test_prophet_forecast_shapes_and_bounds():
    df = _make_series(36)
    train = df.iloc[:30].copy()
    test = df.iloc[30:].copy()  # 6 points
    out = fit_forecast(
        train_df=train, test_df=test,
        date_column="date", value_column="y",
        future_periods=4, freq="MS",
        params={"interval_width": 0.8},
        selected_metrics=["mae", "rmse", "coverage"],
    )
    assert len(out.training_data) == 30
    assert len(out.test_data) == 6
    assert len(out.forecast_data) == 4
    # bounds bracket prediction
    for pt in out.test_data + out.forecast_data:
        assert pt.lower_bound <= pt.predicted <= pt.upper_bound
    # test points carry the real actuals and flag
    assert out.test_data[0].actual is not None
    assert out.test_data[0].is_test is True
    assert out.forecast_data[0].is_forecast is True
    # metrics finite
    assert out.metrics["mae"] is not None and np.isfinite(out.metrics["mae"])
    # forecast dates continue monthly after last test date
    assert out.forecast_data[0].date == "2022-07-01"
```

- [ ] **Step 3: Run to verify it fails**

Run: `cd forecast-service && python -m pytest tests/test_prophet_model.py -v`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `app/models/prophet_model.py`**

```python
import pandas as pd
from prophet import Prophet

from app.schemas import SegmentOutput, ForecastPoint
from app.metrics import compute_metrics
from app.utils import to_pandas_freq, fmt_date


def fit_forecast(train_df, test_df, date_column, value_column,
                 future_periods, freq, params, selected_metrics):
    params = params or {}
    pfreq = to_pandas_freq(freq)

    train = train_df.copy()
    train[date_column] = pd.to_datetime(train[date_column])
    test = test_df.copy()
    test[date_column] = pd.to_datetime(test[date_column])

    fit_df = train.rename(columns={date_column: "ds", value_column: "y"})[["ds", "y"]]
    fit_df["y"] = pd.to_numeric(fit_df["y"], errors="coerce")
    fit_df = fit_df.dropna(subset=["y"])

    growth = params.get("growth", "linear")
    if growth not in ("linear", "flat"):
        growth = "linear"  # logistic needs a cap column; not in clean core

    model = Prophet(
        growth=growth,
        changepoint_prior_scale=params.get("changepoint_prior_scale", 0.05),
        seasonality_mode=params.get("seasonality_mode", "additive"),
        seasonality_prior_scale=params.get("seasonality_prior_scale", 10.0),
        yearly_seasonality=params.get("yearly_seasonality", "auto"),
        weekly_seasonality=params.get("weekly_seasonality", "auto"),
        daily_seasonality=params.get("daily_seasonality", "auto"),
        interval_width=params.get("interval_width", 0.8),
    )
    model.fit(fit_df)

    n_test = len(test)
    future = model.make_future_dataframe(
        periods=n_test + future_periods, freq=pfreq, include_history=True
    )
    fc = model.predict(future)

    n_train = len(fit_df)
    hist = fc.iloc[:n_train]
    test_rows = fc.iloc[n_train:n_train + n_test]
    fut_rows = fc.iloc[n_train + n_test:]

    train_actual_vals = list(fit_df["y"])

    training_data = [
        ForecastPoint(
            date=fmt_date(r.ds),
            actual=float(train_actual_vals[i]) if i < len(train_actual_vals) else None,
            predicted=float(r.yhat),
            lower_bound=float(r.yhat_lower),
            upper_bound=float(r.yhat_upper),
        )
        for i, r in enumerate(hist.itertuples())
    ]

    test_actual_vals = list(pd.to_numeric(test[value_column], errors="coerce"))
    test_data = []
    for i, r in enumerate(test_rows.itertuples()):
        actual = float(test_actual_vals[i]) if i < len(test_actual_vals) else None
        test_data.append(ForecastPoint(
            date=fmt_date(r.ds),
            actual=actual,
            predicted=float(r.yhat),
            lower_bound=float(r.yhat_lower),
            upper_bound=float(r.yhat_upper),
            is_test=True,
        ))

    forecast_data = [
        ForecastPoint(
            date=fmt_date(r.ds),
            predicted=float(r.yhat),
            lower_bound=float(r.yhat_lower),
            upper_bound=float(r.yhat_upper),
            is_forecast=True,
        )
        for r in fut_rows.itertuples()
    ]

    valid = [(t.actual, t.predicted, t.lower_bound, t.upper_bound)
             for t in test_data if t.actual is not None]
    if valid:
        metrics = compute_metrics(
            [v[0] for v in valid], [v[1] for v in valid],
            [v[2] for v in valid], [v[3] for v in valid],
            train_actual_vals, selected_metrics,
        )
    else:
        metrics = {k: None for k in selected_metrics}

    return SegmentOutput(
        training_data=training_data, test_data=test_data,
        forecast_data=forecast_data, metrics=metrics,
    )
```

- [ ] **Step 5: Run to verify it passes**

Run: `cd forecast-service && python -m pytest tests/test_prophet_model.py -v`
Expected: PASS (Prophet fits a small series in a few seconds).

- [ ] **Step 6: Commit**

```bash
git add forecast-service/app/models/ forecast-service/tests/test_prophet_model.py
git commit -m "feat(forecast-service): add Prophet model fit_forecast"
```

---

### Task 5: AutoGluon model

**Files:**
- Create: `forecast-service/app/models/autogluon_model.py`
- Create: `forecast-service/tests/test_autogluon_model.py`

**Interfaces:**
- Consumes: `app.schemas.SegmentOutput`, `app.metrics.compute_metrics`, `app.utils.to_pandas_freq`, `app.utils.fmt_date`.
- Produces: `app.models.autogluon_model.fit_forecast(train_df, test_df, date_column, value_column, future_periods, freq, params, selected_metrics) -> SegmentOutput`. Reads optional `params["time_limit"]` (default 90), `params["presets"]` (default `"medium_quality"`), `params["hyperparameters"]` (default None), `params["interval_width"]` (default 0.8).

- [ ] **Step 1: Write the failing test in `tests/test_autogluon_model.py`**

```python
import numpy as np
import pandas as pd
from app.models.autogluon_model import fit_forecast


def _make_series(n=30):
    dates = pd.date_range("2020-01-01", periods=n, freq="MS")
    y = 100 + np.arange(n) * 1.5
    return pd.DataFrame({"date": dates.strftime("%Y-%m-%d"), "y": y})


def test_autogluon_forecast_shapes():
    df = _make_series(30)
    train = df.iloc[:24].copy()
    test = df.iloc[24:].copy()  # 6 points
    out = fit_forecast(
        train_df=train, test_df=test,
        date_column="date", value_column="y",
        future_periods=3, freq="MS",
        # SeasonalNaive keeps the test fast and deterministic
        params={"interval_width": 0.8, "time_limit": 30,
                "hyperparameters": {"SeasonalNaive": {}}},
        selected_metrics=["mae", "rmse"],
    )
    assert len(out.test_data) == 6
    assert len(out.forecast_data) == 3
    for pt in out.test_data + out.forecast_data:
        assert pt.lower_bound <= pt.predicted <= pt.upper_bound
    assert out.forecast_data[0].is_forecast is True
    assert out.test_data[0].is_test is True
    assert out.forecast_data[0].date == "2022-07-01"
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd forecast-service && python -m pytest tests/test_autogluon_model.py -v`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `app/models/autogluon_model.py`**

```python
import pandas as pd
from autogluon.timeseries import TimeSeriesDataFrame, TimeSeriesPredictor

from app.schemas import SegmentOutput, ForecastPoint
from app.metrics import compute_metrics
from app.utils import to_pandas_freq, fmt_date

ITEM_ID = "series"


def _to_tsdf(df, date_column, value_column, pfreq):
    d = df.copy()
    d[date_column] = pd.to_datetime(d[date_column])
    d[value_column] = pd.to_numeric(d[value_column], errors="coerce")
    d = d.dropna(subset=[value_column])
    d = d.rename(columns={date_column: "timestamp", value_column: "target"})
    d["item_id"] = ITEM_ID
    tsdf = TimeSeriesDataFrame.from_data_frame(
        d[["item_id", "timestamp", "target"]],
        id_column="item_id", timestamp_column="timestamp",
    )
    return tsdf.convert_frequency(pfreq)


def _quantile_levels(interval_width):
    lo = round((1 - interval_width) / 2, 4)
    hi = round((1 + interval_width) / 2, 4)
    return lo, hi


def _predict_block(train_tsdf, prediction_length, freq, params, lo, hi):
    predictor = TimeSeriesPredictor(
        prediction_length=prediction_length,
        freq=freq,
        quantile_levels=[lo, hi],
        eval_metric="RMSE",
        verbosity=0,
    )
    fit_kwargs = {"time_limit": params.get("time_limit", 90)}
    if params.get("hyperparameters"):
        fit_kwargs["hyperparameters"] = params["hyperparameters"]
    else:
        fit_kwargs["presets"] = params.get("presets", "medium_quality")
    predictor.fit(train_tsdf, **fit_kwargs)
    preds = predictor.predict(train_tsdf)
    return preds.loc[ITEM_ID]


def fit_forecast(train_df, test_df, date_column, value_column,
                 future_periods, freq, params, selected_metrics):
    params = params or {}
    pfreq = to_pandas_freq(freq)
    lo, hi = _quantile_levels(params.get("interval_width", 0.8))

    train_tsdf = _to_tsdf(train_df, date_column, value_column, pfreq)
    n_test = len(test_df)

    # Test window: predict n_test steps from train end (out-of-sample)
    test_pred = _predict_block(train_tsdf, n_test, pfreq, params, lo, hi)

    # Future: refit on the full series and predict future_periods
    full_df = pd.concat([train_df, test_df], ignore_index=True)
    full_tsdf = _to_tsdf(full_df, date_column, value_column, pfreq)
    fut_pred = _predict_block(full_tsdf, future_periods, pfreq, params, lo, hi)

    lo_col, hi_col = str(lo), str(hi)

    test = test_df.copy()
    test[date_column] = pd.to_datetime(test[date_column])
    test_actual_vals = list(pd.to_numeric(test[value_column], errors="coerce"))

    test_data = []
    for i in range(len(test_pred)):
        row = test_pred.iloc[i]
        actual = float(test_actual_vals[i]) if i < len(test_actual_vals) else None
        test_data.append(ForecastPoint(
            date=fmt_date(test_pred.index[i]),
            actual=actual,
            predicted=float(row["mean"]),
            lower_bound=float(row[lo_col]),
            upper_bound=float(row[hi_col]),
            is_test=True,
        ))

    forecast_data = []
    for i in range(len(fut_pred)):
        row = fut_pred.iloc[i]
        forecast_data.append(ForecastPoint(
            date=fmt_date(fut_pred.index[i]),
            predicted=float(row["mean"]),
            lower_bound=float(row[lo_col]),
            upper_bound=float(row[hi_col]),
            is_forecast=True,
        ))

    # AutoGluon gives no in-sample fit; show history as the actual line.
    tr = train_df.copy()
    tr[date_column] = pd.to_datetime(tr[date_column])
    train_actual_vals = list(pd.to_numeric(tr[value_column], errors="coerce"))
    training_data = []
    for i, ts in enumerate(tr[date_column]):
        val = float(train_actual_vals[i]) if pd.notna(train_actual_vals[i]) else 0.0
        training_data.append(ForecastPoint(
            date=fmt_date(ts), actual=val, predicted=val,
            lower_bound=val, upper_bound=val,
        ))

    valid = [(t.actual, t.predicted, t.lower_bound, t.upper_bound)
             for t in test_data if t.actual is not None]
    if valid:
        metrics = compute_metrics(
            [v[0] for v in valid], [v[1] for v in valid],
            [v[2] for v in valid], [v[3] for v in valid],
            [v for v in train_actual_vals if pd.notna(v)], selected_metrics,
        )
    else:
        metrics = {k: None for k in selected_metrics}

    return SegmentOutput(
        training_data=training_data, test_data=test_data,
        forecast_data=forecast_data, metrics=metrics,
    )
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd forecast-service && python -m pytest tests/test_autogluon_model.py -v`
Expected: PASS (slow — AutoGluon import + a SeasonalNaive fit; allow ~1–2 min the first run).

- [ ] **Step 5: Commit**

```bash
git add forecast-service/app/models/autogluon_model.py forecast-service/tests/test_autogluon_model.py
git commit -m "feat(forecast-service): add AutoGluon-TimeSeries model fit_forecast"
```

---

### Task 6: Model dispatcher

**Files:**
- Modify: `forecast-service/app/models/__init__.py`
- Create: `forecast-service/tests/test_dispatch.py`

**Interfaces:**
- Consumes: `app.models.prophet_model.fit_forecast`, `app.models.autogluon_model.fit_forecast`.
- Produces: `app.models.get_model(name: str) -> callable` returning the matching `fit_forecast`; raises `ValueError` for unknown names.

- [ ] **Step 1: Write the failing test in `tests/test_dispatch.py`**

```python
import pytest
from app.models import get_model
from app.models import prophet_model, autogluon_model


def test_get_model_prophet():
    assert get_model("prophet") is prophet_model.fit_forecast


def test_get_model_autogluon():
    assert get_model("autogluon") is autogluon_model.fit_forecast


def test_get_model_unknown_raises():
    with pytest.raises(ValueError):
        get_model("arima")
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd forecast-service && python -m pytest tests/test_dispatch.py -v`
Expected: FAIL (get_model not defined).

- [ ] **Step 3: Implement `app/models/__init__.py`**

```python
from app.models import prophet_model, autogluon_model

_REGISTRY = {
    "prophet": prophet_model.fit_forecast,
    "autogluon": autogluon_model.fit_forecast,
}


def get_model(name: str):
    if name not in _REGISTRY:
        raise ValueError(f"Unsupported model: {name}")
    return _REGISTRY[name]
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd forecast-service && python -m pytest tests/test_dispatch.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add forecast-service/app/models/__init__.py forecast-service/tests/test_dispatch.py
git commit -m "feat(forecast-service): add model dispatcher"
```

---

### Task 7: Supabase JWT auth

**Files:**
- Create: `forecast-service/app/auth.py`
- Create: `forecast-service/tests/test_auth.py`

**Interfaces:**
- Produces: `app.auth.verify_token(token: str) -> str` returning the user id (`sub`); raises `fastapi.HTTPException(401)` on invalid/expired tokens. Reads `SUPABASE_JWT_SECRET` from the environment.

- [ ] **Step 1: Write the failing test in `tests/test_auth.py`**

```python
import os
import time
import jwt
import pytest
from fastapi import HTTPException

os.environ["SUPABASE_JWT_SECRET"] = "test-secret"
from app.auth import verify_token  # noqa: E402

SECRET = "test-secret"


def _token(sub="user-123", exp_delta=3600, aud="authenticated"):
    payload = {"sub": sub, "aud": aud, "exp": int(time.time()) + exp_delta}
    return jwt.encode(payload, SECRET, algorithm="HS256")


def test_valid_token_returns_user_id():
    assert verify_token(_token(sub="abc")) == "abc"


def test_expired_token_raises_401():
    with pytest.raises(HTTPException) as e:
        verify_token(_token(exp_delta=-10))
    assert e.value.status_code == 401


def test_malformed_token_raises_401():
    with pytest.raises(HTTPException) as e:
        verify_token("not-a-jwt")
    assert e.value.status_code == 401
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd forecast-service && python -m pytest tests/test_auth.py -v`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `app/auth.py`**

```python
import os
import jwt
from fastapi import HTTPException


def verify_token(token: str) -> str:
    secret = os.environ.get("SUPABASE_JWT_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="SUPABASE_JWT_SECRET not configured")
    try:
        payload = jwt.decode(
            token, secret, algorithms=["HS256"], audience="authenticated"
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Token missing subject")
    return sub
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd forecast-service && python -m pytest tests/test_auth.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add forecast-service/app/auth.py forecast-service/tests/test_auth.py
git commit -m "feat(forecast-service): add Supabase JWT verification"
```

---

### Task 8: Supabase job-row writer (db module)

**Files:**
- Create: `forecast-service/app/db.py`
- Create: `forecast-service/tests/test_db.py`

**Interfaces:**
- Produces:
  - `app.db.create_job(user_id: str, model: str) -> str` — inserts a `forecast_jobs` row (`status="pending"`, `progress=0`), returns the new `id`.
  - `app.db.update_job(job_id: str, fields: dict) -> None` — PATCHes the row.
  - Both use httpx against `{SUPABASE_URL}/rest/v1/forecast_jobs` with the service-role key. Reads `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

- [ ] **Step 1: Write the failing test in `tests/test_db.py`** (httpx mocked, no network)

```python
import os
import httpx
import pytest

os.environ["SUPABASE_URL"] = "https://example.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "service-key"
from app import db  # noqa: E402


def test_create_job_posts_and_returns_id(monkeypatch):
    captured = {}

    class FakeResp:
        status_code = 201
        def json(self):
            return [{"id": "job-1"}]
        def raise_for_status(self):
            pass

    def fake_post(url, headers=None, json=None, timeout=None):
        captured["url"] = url
        captured["json"] = json
        captured["headers"] = headers
        return FakeResp()

    monkeypatch.setattr(httpx, "post", fake_post)
    job_id = db.create_job("user-9", "prophet")
    assert job_id == "job-1"
    assert captured["url"].endswith("/rest/v1/forecast_jobs")
    assert captured["json"]["user_id"] == "user-9"
    assert captured["json"]["model"] == "prophet"
    assert captured["json"]["status"] == "pending"
    assert captured["headers"]["apikey"] == "service-key"


def test_update_job_patches_with_filter(monkeypatch):
    captured = {}

    class FakeResp:
        status_code = 204
        def raise_for_status(self):
            pass

    def fake_patch(url, headers=None, json=None, timeout=None):
        captured["url"] = url
        captured["json"] = json
        return FakeResp()

    monkeypatch.setattr(httpx, "patch", fake_patch)
    db.update_job("job-1", {"status": "completed", "progress": 100})
    assert "id=eq.job-1" in captured["url"]
    assert captured["json"]["status"] == "completed"
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd forecast-service && python -m pytest tests/test_db.py -v`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `app/db.py`**

```python
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd forecast-service && python -m pytest tests/test_db.py -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add forecast-service/app/db.py forecast-service/tests/test_db.py
git commit -m "feat(forecast-service): add Supabase job-row writer"
```

---

### Task 9: Job processing + POST /forecast endpoint

**Files:**
- Create: `forecast-service/app/jobs.py`
- Modify: `forecast-service/app/main.py`
- Create: `forecast-service/tests/test_endpoint.py`

**Interfaces:**
- Consumes: `app.db.create_job`, `app.db.update_job`, `app.models.get_model`, `app.utils.split_segment`, `app.auth.verify_token`, `app.schemas.ForecastRequest`.
- Produces:
  - `app.jobs.process_job(job_id: str, req: ForecastRequest) -> None` — runs all segments sequentially, updates the job row, sets final status.
  - `POST /forecast` (FastAPI) — verifies JWT from the `Authorization` header, creates a job, schedules `process_job` as a background task, returns `{"job_id": ...}`.

- [ ] **Step 1: Write the failing test in `tests/test_endpoint.py`** (db + model mocked)

```python
import os
import time
import jwt
from fastapi.testclient import TestClient

os.environ["SUPABASE_JWT_SECRET"] = "test-secret"
os.environ["SUPABASE_URL"] = "https://example.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "service-key"

from app import db, jobs  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)


def _token(sub="u1"):
    return jwt.encode(
        {"sub": sub, "aud": "authenticated", "exp": int(time.time()) + 3600},
        "test-secret", algorithm="HS256",
    )


def _payload():
    return {
        "model": "prophet",
        "date_column": "date",
        "segment_column": "segment",
        "dependent_variable": "y",
        "segments": [{
            "segmentValue": "A", "segment": "seg",
            "forecast_periods": 2, "frequency": "MS",
            "training_records": 3, "test_records": 1, "prophet_params": {},
        }],
        "data": [],
        "metrics": ["mae"],
    }


def test_post_forecast_requires_auth():
    resp = client.post("/forecast", json=_payload())
    assert resp.status_code == 401


def test_post_forecast_creates_job(monkeypatch):
    monkeypatch.setattr(db, "create_job", lambda user_id, model: "job-xyz")
    monkeypatch.setattr(jobs, "process_job", lambda job_id, req: None)
    resp = client.post(
        "/forecast", json=_payload(),
        headers={"Authorization": f"Bearer {_token()}"},
    )
    assert resp.status_code == 200
    assert resp.json()["job_id"] == "job-xyz"
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd forecast-service && python -m pytest tests/test_endpoint.py -v`
Expected: FAIL (no /forecast route / jobs module missing).

- [ ] **Step 3: Implement `app/jobs.py`**

```python
import pandas as pd

from app import db
from app.models import get_model
from app.utils import split_segment
from app.schemas import ForecastRequest

MIN_TRAIN_RECORDS = 2


def process_job(job_id: str, req: ForecastRequest) -> None:
    try:
        db.update_job(job_id, {"status": "running", "progress": 0})
        full = pd.DataFrame(req.data)
        fit_forecast = get_model(req.model)
        total = len(req.segments)
        segments_out = []

        for i, spec in enumerate(req.segments):
            seg_df = full[full[req.segment_column] == spec.segmentValue]
            try:
                if len(seg_df) < spec.training_records + 1 or spec.training_records < MIN_TRAIN_RECORDS:
                    raise ValueError("Not enough data to train this segment")
                train, test = split_segment(
                    seg_df, req.date_column, spec.training_records, spec.test_records
                )
                out = fit_forecast(
                    train_df=train, test_df=test,
                    date_column=req.date_column, value_column=req.dependent_variable,
                    future_periods=spec.forecast_periods, freq=spec.frequency,
                    params=spec.prophet_params or {}, selected_metrics=req.metrics,
                )
                segments_out.append({
                    "segment": spec.segment, "segmentValue": spec.segmentValue,
                    "model": req.model,
                    **out.model_dump(exclude_none=False),
                })
            except Exception as seg_err:  # noqa: BLE001
                segments_out.append({
                    "segment": spec.segment, "segmentValue": spec.segmentValue,
                    "model": req.model, "error": str(seg_err),
                    "training_data": [], "test_data": [], "forecast_data": [], "metrics": {},
                })

            progress = round((i + 1) / total * 100)
            db.update_job(job_id, {
                "status": "running", "progress": progress,
                "results": {"segments": segments_out, "model": req.model},
            })

        db.update_job(job_id, {
            "status": "completed", "progress": 100,
            "results": {"segments": segments_out, "model": req.model},
        })
    except Exception as err:  # noqa: BLE001
        db.update_job(job_id, {"status": "failed", "error": str(err)})
```

- [ ] **Step 4: Update `app/main.py`**

```python
from fastapi import FastAPI, BackgroundTasks, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.auth import verify_token
from app.schemas import ForecastRequest
from app import db, jobs

app = FastAPI(title="Forecast Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/forecast")
def create_forecast(
    req: ForecastRequest,
    background_tasks: BackgroundTasks,
    authorization: str = Header(default=""),
):
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    user_id = verify_token(token)
    job_id = db.create_job(user_id, req.model)
    background_tasks.add_task(jobs.process_job, job_id, req)
    return {"job_id": job_id}
```

- [ ] **Step 5: Run to verify it passes**

Run: `cd forecast-service && python -m pytest tests/test_endpoint.py -v`
Expected: PASS (2 tests).

- [ ] **Step 6: Run the full service test suite**

Run: `cd forecast-service && python -m pytest -v`
Expected: PASS (all tests across the service).

- [ ] **Step 7: Commit**

```bash
git add forecast-service/app/jobs.py forecast-service/app/main.py forecast-service/tests/test_endpoint.py
git commit -m "feat(forecast-service): add job processing and POST /forecast endpoint"
```

---

### Task 10: Containerization and Render config

**Files:**
- Create: `forecast-service/Dockerfile`
- Create: `forecast-service/.dockerignore`
- Create: `forecast-service/render.yaml`
- Create: `forecast-service/README.md`

**Interfaces:**
- Produces: a runnable container exposing the FastAPI app on `$PORT`; a Render blueprint.

- [ ] **Step 1: Create `forecast-service/Dockerfile`**

```dockerfile
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY app ./app

# Render provides $PORT
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

- [ ] **Step 2: Create `forecast-service/.dockerignore`**

```
tests/
__pycache__/
*.pyc
.pytest_cache/
AutogluonModels/
```

- [ ] **Step 3: Create `forecast-service/render.yaml`**

```yaml
services:
  - type: web
    name: forecast-service
    runtime: docker
    dockerfilePath: ./Dockerfile
    dockerContext: .
    plan: standard   # AutoGluon needs ~2GB RAM; do not use the free/starter tier
    healthCheckPath: /health
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: SUPABASE_JWT_SECRET
        sync: false
```

- [ ] **Step 4: Create `forecast-service/README.md`**

````markdown
# Forecast Service

FastAPI service that fits Prophet / AutoGluon-TimeSeries models and writes
results to the Supabase `forecast_jobs` table.

## Local dev

```bash
cd forecast-service
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_JWT_SECRET=...
uvicorn app.main:app --reload
pytest -v
```

## Deploy (Render)

1. Push this repo to GitHub.
2. In Render: New → Blueprint → point at `forecast-service/render.yaml`
   (or New → Web Service → Docker, root `forecast-service`).
3. Set env vars `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
   (Supabase dashboard → Project Settings → API / JWT secret).
4. Use the **Standard** plan or larger — AutoGluon needs the RAM.
5. Copy the service URL into the frontend `.env` as `VITE_FORECAST_SERVICE_URL`.
````

- [ ] **Step 5: Build the image locally to verify it compiles**

Run: `cd forecast-service && docker build -t forecast-service .`
Expected: build succeeds (slow — AutoGluon/torch are large). If Docker is unavailable locally, skip and rely on Render's build.

- [ ] **Step 6: Commit**

```bash
git add forecast-service/Dockerfile forecast-service/.dockerignore forecast-service/render.yaml forecast-service/README.md
git commit -m "chore(forecast-service): add Dockerfile and Render blueprint"
```

---

### Task 10b: Document the Supabase service-role secret rule

**Files:**
- Modify: `forecast-service/README.md`

- [ ] **Step 1: Append a security note to the README**

Add this section to `forecast-service/README.md`:

```markdown
## Security note

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and must live ONLY in the Render
service env — never in the frontend or committed to git. The browser only
ever uses the anon key and the user's own JWT.
```

- [ ] **Step 2: Commit**

```bash
git add forecast-service/README.md
git commit -m "docs(forecast-service): note service-role key handling"
```

---

### Task 11: forecast_jobs migration

**Files:**
- Create: `supabase/migrations/20260624120000_forecast_jobs.sql`

**Interfaces:**
- Produces: `public.forecast_jobs` table with RLS so users see only their own rows; an `updated_at` trigger reusing the existing `public.update_updated_at_column()` function.

- [ ] **Step 1: Write the migration `supabase/migrations/20260624120000_forecast_jobs.sql`**

```sql
-- Forecast jobs: submit-and-poll job store for the Python forecast service
CREATE TABLE IF NOT EXISTS public.forecast_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress NUMERIC NOT NULL DEFAULT 0,
  model TEXT NOT NULL,
  results JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.forecast_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own forecast jobs" ON public.forecast_jobs;
CREATE POLICY "Users can view their own forecast jobs"
ON public.forecast_jobs FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own forecast jobs" ON public.forecast_jobs;
CREATE POLICY "Users can create their own forecast jobs"
ON public.forecast_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own forecast jobs" ON public.forecast_jobs;
CREATE POLICY "Users can update their own forecast jobs"
ON public.forecast_jobs FOR UPDATE
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_forecast_jobs_updated_at ON public.forecast_jobs;
CREATE TRIGGER update_forecast_jobs_updated_at
  BEFORE UPDATE ON public.forecast_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_forecast_jobs_user_id ON public.forecast_jobs(user_id);
```

- [ ] **Step 2: Apply the migration**

Run: `cd "C:\Code\2026\forecasting\auto-prophet-tune-92125" && printf 'Y\n' | npx supabase db push`
Expected: `Applying migration 20260624120000_forecast_jobs.sql...` then `Finished supabase db push.`

- [ ] **Step 3: Regenerate the TypeScript types**

Run: `npx supabase gen types typescript --project-id lhwvbvremwspkzcpxqve > src/integrations/supabase/types.ts`
Expected: file rewritten; `forecast_jobs` now appears in it.

- [ ] **Step 4: Verify types include the new table**

Run: `grep -c "forecast_jobs:" src/integrations/supabase/types.ts`
Expected: at least `1`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260624120000_forecast_jobs.sql src/integrations/supabase/types.ts
git commit -m "feat(db): add forecast_jobs table with RLS"
```

---

### Task 12: Frontend forecast client

**Files:**
- Create: `src/lib/forecastClient.ts`

**Interfaces:**
- Consumes: `supabase` client (`@/integrations/supabase/client`), `ForecastResults` type (`@/types/forecastResults`).
- Produces:
  - `submitForecast(payload: ForecastJobPayload, accessToken: string): Promise<string>` (returns `job_id`).
  - `pollForecastJob(jobId: string, onProgress: (progress: number) => void, opts?: { intervalMs?: number; timeoutMs?: number }): Promise<ForecastResults>`.
  - `ForecastJobPayload` interface.

- [ ] **Step 1: Write `src/lib/forecastClient.ts`**

```typescript
import { supabase } from "@/integrations/supabase/client";
import type { ForecastResults } from "@/types/forecastResults";

export interface ForecastSegmentSpec {
  segmentValue: string;
  segment: string;
  forecast_periods: number;
  frequency: string;
  training_records: number;
  test_records: number;
  prophet_params?: Record<string, unknown> | null;
}

export interface ForecastJobPayload {
  model: string;
  date_column: string;
  segment_column: string;
  dependent_variable: string;
  segments: ForecastSegmentSpec[];
  data: any[];
  metrics: string[];
}

const SERVICE_URL = import.meta.env.VITE_FORECAST_SERVICE_URL as string;

export async function submitForecast(
  payload: ForecastJobPayload,
  accessToken: string,
): Promise<string> {
  if (!SERVICE_URL) {
    throw new Error("VITE_FORECAST_SERVICE_URL is not configured");
  }

  const doPost = () =>
    fetch(`${SERVICE_URL}/forecast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

  let resp: Response;
  try {
    resp = await doPost();
  } catch {
    // one retry for Render cold start
    await new Promise((r) => setTimeout(r, 3000));
    resp = await doPost();
  }

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Forecast submit failed (${resp.status}): ${text}`);
  }
  const json = await resp.json();
  return json.job_id as string;
}

export function pollForecastJob(
  jobId: string,
  onProgress: (progress: number) => void,
  opts: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<ForecastResults> {
  const intervalMs = opts.intervalMs ?? 2000;
  const timeoutMs = opts.timeoutMs ?? 10 * 60 * 1000;
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const tick = async () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error("Forecast timed out; the job may still be running."));
        return;
      }
      const { data, error } = await supabase
        .from("forecast_jobs")
        .select("status, progress, results, error")
        .eq("id", jobId)
        .single();

      if (error) {
        reject(new Error(error.message));
        return;
      }
      onProgress(Number(data.progress) || 0);

      if (data.status === "completed") {
        resolve(data.results as unknown as ForecastResults);
        return;
      }
      if (data.status === "failed") {
        reject(new Error(data.error || "Forecast failed"));
        return;
      }
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `cd "C:\Code\2026\forecasting\auto-prophet-tune-92125" && npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/forecastClient.ts
git commit -m "feat(web): add forecast service client (submit + poll)"
```

---

### Task 13: Wire the client into the run handler

**Files:**
- Modify: `src/pages/Index.tsx` (the `handleRunForecast` function, currently starting at line 589)
- Create/Modify: `.env` (add `VITE_FORECAST_SERVICE_URL`)
- Modify: `.env` is git-tracked in this repo; commit the new var with a placeholder value if the real URL isn't ready.

**Interfaces:**
- Consumes: `submitForecast`, `pollForecastJob`, `ForecastJobPayload` from `@/lib/forecastClient`.

- [ ] **Step 1: Add the import near the other imports in `src/pages/Index.tsx`**

```typescript
import { submitForecast, pollForecastJob, type ForecastJobPayload } from "@/lib/forecastClient";
```

- [ ] **Step 2: Replace the entire body of `handleRunForecast` (from line 589 to the end of that function, i.e. through the `setActiveTab("results")` block) with this clean-core version**

```typescript
  const handleRunForecast = async () => {
    if (segments.length === 0) {
      toast.error("Please configure at least one segment");
      return;
    }
    if (!dateColumn || !segmentColumn || !dependentVariable) {
      toast.error("Please configure all required columns");
      return;
    }

    setIsRunning(true);
    setForecastResults(null);
    setSegmentProgress(
      segments.map((s) => ({ segment: s.segment, status: "pending" as const, progress: 0 })),
    );
    setActiveTab("progress");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error("Please sign in again");
        setIsRunning(false);
        return;
      }

      const payload: ForecastJobPayload = {
        model: selectedModel,
        date_column: dateColumn,
        segment_column: segmentColumn,
        dependent_variable: dependentVariable,
        metrics: selectedMetrics,
        data: csvData,
        segments: segments.map((s) => ({
          segmentValue: s.segmentValue,
          segment: s.segment,
          forecast_periods: s.forecast_periods,
          frequency: s.frequency,
          training_records: s.training_records,
          test_records: s.test_records,
          prophet_params: (s.prophet_params as Record<string, unknown>) ?? null,
        })),
      };

      // mark all running so the progress UI shows activity
      setSegmentProgress((prev) =>
        prev.map((p) => ({ ...p, status: "running", progress: 0, message: "Submitting job..." })),
      );

      const jobId = await submitForecast(payload, accessToken);

      const results = await pollForecastJob(jobId, (progress) => {
        setSegmentProgress((prev) => prev.map((p) => ({ ...p, progress })));
      });

      setSegmentProgress((prev) =>
        prev.map((p) => ({ ...p, status: "completed", progress: 100 })),
      );
      setForecastResults(results as any);
      toast.success(`Forecast complete for ${results.segments.length} segment(s)`);
      setActiveTab("results");
    } catch (err) {
      console.error("Forecast error:", err);
      toast.error(err instanceof Error ? err.message : "Forecast failed");
      setSegmentProgress((prev) => prev.map((p) => ({ ...p, status: "error" as const })));
    } finally {
      setIsRunning(false);
    }
  };
```

- [ ] **Step 3: Remove the now-unused `generateMockForecast` function and its helpers**

Delete the `generateMockForecast` function definition (the `// Helper function to generate mock forecast results` block near the top of `src/pages/Index.tsx`). If `tsc` later reports other now-unused imports (e.g. `applyAnalysisTransformations` usage removed), remove those too.

- [ ] **Step 4: Add the env var to `.env`**

Add this line to `.env` (use the real Render URL once deployed; a placeholder is fine until then):

```
VITE_FORECAST_SERVICE_URL="https://forecast-service.onrender.com"
```

- [ ] **Step 5: Typecheck**

Run: `cd "C:\Code\2026\forecasting\auto-prophet-tune-92125" && npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors. Fix any unused-symbol errors by deleting the dead code they point at.

- [ ] **Step 6: Verify the dev server still serves the app**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/src/pages/Index.tsx`
Expected: `200` (start `npm run dev` first if needed).

- [ ] **Step 7: Commit**

```bash
git add src/pages/Index.tsx .env
git commit -m "feat(web): run real forecasts via the forecast service instead of the mock"
```

---

### Task 14: End-to-end manual verification

**Files:** none (verification only).

- [ ] **Step 1: Deploy the service to Render** following `forecast-service/README.md`, set the three env vars, and put the live URL into `.env` as `VITE_FORECAST_SERVICE_URL`. Restart `npm run dev`.

- [ ] **Step 2: Prophet run.** Use the `/run` skill (or open http://localhost:8080), sign in, upload `sample_timeseries.csv`, set columns (`date`/`segment`/`sales`... note the fixture's value column is `sales` — select it as the dependent variable), keep model = Prophet, run. Confirm: progress advances, results render, and metrics are realistic (NOT near-perfect).

- [ ] **Step 3: AutoGluon run.** Switch model to AutoGluon and run again. Confirm a forecast returns (allow a few minutes) and metrics render.

- [ ] **Step 4: Failure path.** Temporarily set `VITE_FORECAST_SERVICE_URL` to a bad URL, run, and confirm the UI surfaces an error toast and doesn't hang. Restore the URL.

- [ ] **Step 5: Final commit (if any tweaks were needed)**

```bash
git add -A
git commit -m "chore: end-to-end verification fixes for real forecasting"
```

---

## Self-Review Notes

- **Spec coverage:** architecture/components → Tasks 1–11; job lifecycle → Tasks 8–9, 12–13; forecast contract & model interface → Tasks 4–6; error handling → Tasks 7, 9, 12, 14; testing → each Python task is TDD, frontend uses `tsc` + `/run`; secrets/config → Tasks 10, 10b, 13.
- **Deferred items** (regressors, transformations, raw-vs-transformed, benchmark) are intentionally not implemented; Task 13 removes the mock paths that produced them.
- **Type consistency:** `fit_forecast(train_df, test_df, date_column, value_column, future_periods, freq, params, selected_metrics)` is identical across Prophet (Task 4), AutoGluon (Task 5), dispatcher (Task 6), and the caller in jobs (Task 9). `SegmentOutput`/`ForecastPoint` (Task 1) are consumed unchanged downstream. `create_job`/`update_job` (Task 8) signatures match their use in `process_job` (Task 9). `submitForecast`/`pollForecastJob` (Task 12) match the caller (Task 13).
- **Known follow-ups (not blockers):** the fixture's dependent column is `sales`; AutoGluon needs a paid Render tier; `.env` is git-tracked so the service URL lands in the repo (consistent with the existing anon key already there).
