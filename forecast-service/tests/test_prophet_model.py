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
    assert out.forecast_data[0].date == "2023-01-01"
