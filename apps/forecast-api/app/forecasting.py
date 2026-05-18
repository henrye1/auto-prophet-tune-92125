from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd
from prophet import Prophet

from .metrics import build_commentary, compute_metrics
from .schemas import (
    ForecastPoint,
    ForecastRequest,
    Metrics,
    ProphetParameters,
    SegmentForecastResult,
)


_FREQUENCY_MAP = {
    "d": "D", "day": "D", "daily": "D",
    "w": "W", "week": "W", "weekly": "W",
    "m": "MS", "month": "MS", "monthly": "MS", "ms": "MS", "me": "ME",
    "q": "QS", "quarter": "QS", "quarterly": "QS",
    "y": "YS", "year": "YS", "yearly": "YS", "a": "YS", "annual": "YS",
}


def _pandas_freq(frequency: str) -> str:
    key = (frequency or "").strip().lower()
    if key in _FREQUENCY_MAP:
        return _FREQUENCY_MAP[key]
    return key.upper() or "D"


def _to_float(value: Any) -> float:
    try:
        f = float(value)
    except (TypeError, ValueError):
        return float("nan")
    return f if math.isfinite(f) else float("nan")


def _clean_optional(value: float) -> float | None:
    return value if math.isfinite(value) else None


def _build_prophet(params: ProphetParameters, regressor_names: list[str]) -> Prophet:
    interval_width = params.interval_width
    if params.lower_bound is not None and params.upper_bound is not None:
        interval_width = max(
            0.0, min(1.0, params.upper_bound - params.lower_bound)
        )

    model = Prophet(
        growth=params.growth,
        changepoint_prior_scale=params.changepoint_prior_scale,
        seasonality_mode=params.seasonality_mode,
        seasonality_prior_scale=params.seasonality_prior_scale,
        yearly_seasonality=params.yearly_seasonality,
        weekly_seasonality=params.weekly_seasonality,
        daily_seasonality=params.daily_seasonality,
        changepoint_range=params.changepoint_range,
        interval_width=interval_width,
    )

    for cs in params.custom_seasonalities:
        kwargs: dict[str, Any] = {
            "name": cs.name,
            "period": cs.period,
            "fourier_order": cs.fourier_order,
        }
        if cs.prior_scale is not None:
            kwargs["prior_scale"] = cs.prior_scale
        if cs.mode is not None:
            kwargs["mode"] = cs.mode
        model.add_seasonality(**kwargs)

    for name in regressor_names:
        model.add_regressor(name)

    return model


def _rows_to_df(
    rows: list[dict[str, Any]],
    date_column: str,
    dependent: str,
    regressors: list[str],
) -> pd.DataFrame:
    df = pd.DataFrame(rows)
    if df.empty:
        return pd.DataFrame(columns=["ds", "y", *regressors])

    df = df.copy()
    df["ds"] = pd.to_datetime(df[date_column], errors="coerce")
    df["y"] = pd.to_numeric(df[dependent], errors="coerce")
    for r in regressors:
        df[r] = pd.to_numeric(df.get(r), errors="coerce")
    return df[["ds", "y", *regressors]]


def _predict_dataframe(model: Prophet, df: pd.DataFrame) -> pd.DataFrame:
    return model.predict(df.drop(columns=["y"], errors="ignore"))


def _points_from_prediction(
    predicted_df: pd.DataFrame,
    actuals: pd.Series | None,
    *,
    is_test: bool = False,
    is_forecast: bool = False,
) -> list[ForecastPoint]:
    points: list[ForecastPoint] = []
    for i, row in predicted_df.reset_index(drop=True).iterrows():
        date_value = row["ds"]
        if isinstance(date_value, pd.Timestamp):
            date_str = date_value.date().isoformat()
        else:
            date_str = str(date_value)

        actual = None
        if actuals is not None and i < len(actuals):
            v = actuals.iloc[i]
            if pd.notna(v):
                actual = float(v)

        point = ForecastPoint(
            date=date_str,
            actual=actual,
            predicted=float(row["yhat"]),
            lower_bound=float(row["yhat_lower"]),
            upper_bound=float(row["yhat_upper"]),
        )
        if is_test:
            point.is_test = True
        if is_forecast:
            point.is_forecast = True
        points.append(point)
    return points


def run_prophet_forecast(req: ForecastRequest) -> SegmentForecastResult:
    if req.model != "prophet":
        raise ValueError(
            f"Model '{req.model}' is not supported in v1. Only 'prophet' is implemented."
        )

    regressor_names = [r.name for r in req.segment.regressors]

    train_df = _rows_to_df(
        req.training_data, req.date_column, req.dependent_variable, regressor_names
    )
    train_df = train_df.dropna(subset=["ds", "y"])
    if train_df.empty:
        raise ValueError("Training data is empty after dropping rows with missing date/value.")

    test_df = _rows_to_df(
        req.test_data, req.date_column, req.dependent_variable, regressor_names
    )

    if regressor_names and (train_df[regressor_names].isna().any().any()):
        raise ValueError(
            "Some regressor values are missing in the training data — fill them before fitting."
        )

    model = _build_prophet(req.prophet_params, regressor_names)

    if req.prophet_params.growth == "logistic":
        cap = float(train_df["y"].max()) * 1.5 or 1.0
        train_df = train_df.assign(cap=cap)
    model.fit(train_df)

    training_preds = _predict_dataframe(model, train_df)
    training_points = _points_from_prediction(training_preds, train_df["y"])

    test_points: list[ForecastPoint] = []
    if not test_df.empty:
        test_features = test_df.dropna(subset=["ds"]).copy()
        if req.prophet_params.growth == "logistic":
            test_features["cap"] = float(train_df["y"].max()) * 1.5 or 1.0
        test_preds = _predict_dataframe(model, test_features)
        test_points = _points_from_prediction(
            test_preds, test_features["y"], is_test=True
        )

    future_points: list[ForecastPoint] = []
    if req.segment.forecast_periods > 0:
        if regressor_names:
            raise ValueError(
                "Future-frame regressor values are not supplied by the UI yet. "
                "Remove regressors or set forecast_periods=0."
            )
        future = model.make_future_dataframe(
            periods=req.segment.forecast_periods,
            freq=_pandas_freq(req.segment.frequency),
            include_history=False,
        )
        if req.prophet_params.growth == "logistic":
            future["cap"] = float(train_df["y"].max()) * 1.5 or 1.0
        future_preds = model.predict(future)
        future_points = _points_from_prediction(
            future_preds, None, is_forecast=True
        )

    metrics = compute_metrics(
        test_points,
        req.selected_metrics,
        n_regressors=len(regressor_names),
    )
    commentary = build_commentary(metrics)

    return SegmentForecastResult(
        segment=req.segment.segment,
        segmentValue=req.segment.segmentValue,
        training_data=training_points,
        test_data=test_points,
        forecast_data=future_points,
        metrics=metrics,
        ai_commentary=commentary,
        model="prophet",
        interval_width=req.prophet_params.interval_width,
        lower_bound=req.prophet_params.lower_bound,
        upper_bound=req.prophet_params.upper_bound,
    )
