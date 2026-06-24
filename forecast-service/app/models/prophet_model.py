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
