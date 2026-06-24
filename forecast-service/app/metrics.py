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
