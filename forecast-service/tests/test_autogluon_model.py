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
