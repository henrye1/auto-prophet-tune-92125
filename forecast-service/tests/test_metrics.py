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
