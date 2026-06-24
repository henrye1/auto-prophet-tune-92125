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
    # NOTE: convert_frequency() triggers joblib multiprocessing which crashes
    # on Windows (access violation in loky resource tracker). Since
    # from_data_frame() already infers the correct freq from the data, the
    # convert_frequency() call is unnecessary and is omitted. pfreq is still
    # passed to TimeSeriesPredictor(freq=...) in _predict_block.
    # KNOWN DEBT: convert_frequency() was removed due to a Windows/joblib access
    # violation under pytest. TimeSeriesDataFrame.from_data_frame() (AutoGluon
    # 1.5.0) has no `freq` parameter, so frequency cannot be anchored here.
    # For irregular/gappy production data on Linux, frequency anchoring or
    # regularization (e.g. resample before calling _to_tsdf) may need revisiting.
    tsdf = TimeSeriesDataFrame.from_data_frame(
        d[["item_id", "timestamp", "target"]],
        id_column="item_id", timestamp_column="timestamp",
    )
    return tsdf


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
