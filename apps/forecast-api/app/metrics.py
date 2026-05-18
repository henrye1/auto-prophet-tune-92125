from __future__ import annotations

import math
from typing import Iterable

from .schemas import ForecastPoint, Metrics, PerformanceMetric


def _is_finite(x: float | None) -> bool:
    return x is not None and math.isfinite(x)


def compute_metrics(
    test_points: list[ForecastPoint],
    selected: Iterable[PerformanceMetric],
    n_regressors: int,
) -> Metrics:
    selected_set = set(selected)
    valid = [
        p for p in test_points if _is_finite(p.actual) and _is_finite(p.predicted)
    ]
    if not valid:
        return Metrics()

    actuals = [float(p.actual) for p in valid]  # type: ignore[arg-type]
    predicted = [float(p.predicted) for p in valid]
    errors = [a - p for a, p in zip(actuals, predicted)]
    n = len(valid)

    out = Metrics()

    if "mae" in selected_set:
        out.mae = sum(abs(e) for e in errors) / n

    if "mse" in selected_set:
        out.mse = sum(e * e for e in errors) / n

    if "rmse" in selected_set:
        out.rmse = math.sqrt(sum(e * e for e in errors) / n)

    if "mape" in selected_set:
        samples = [(a, e) for a, e in zip(actuals, errors) if a != 0]
        out.mape = (
            sum(abs(e / a) * 100 for a, e in samples) / len(samples)
            if samples
            else None
        )

    if "smape" in selected_set:
        samples = [
            (a, p, e)
            for a, p, e in zip(actuals, predicted, errors)
            if abs(a) + abs(p) > 0
        ]
        out.smape = (
            sum((abs(e) / ((abs(a) + abs(p)) / 2)) * 100 for a, p, e in samples)
            / len(samples)
            if samples
            else None
        )

    if "r2" in selected_set or "adj_r2" in selected_set:
        mean = sum(actuals) / n
        ss_res = sum(e * e for e in errors)
        ss_tot = sum((v - mean) ** 2 for v in actuals)
        r2 = None if ss_tot == 0 else 1 - ss_res / ss_tot
        if "r2" in selected_set:
            out.r2 = r2
        if "adj_r2" in selected_set:
            if r2 is not None and n > n_regressors + 1:
                out.adj_r2 = 1 - ((1 - r2) * (n - 1)) / (n - n_regressors - 1)

    if "coverage" in selected_set:
        coverage_samples = [
            p
            for p in valid
            if _is_finite(p.lower_bound) and _is_finite(p.upper_bound)
        ]
        if coverage_samples:
            hits = sum(
                1
                for p in coverage_samples
                if p.lower_bound <= float(p.actual) <= p.upper_bound  # type: ignore[arg-type]
            )
            out.coverage = hits / len(coverage_samples) * 100

    if "mase" in selected_set:
        naive_errors = [abs(actuals[i] - actuals[i - 1]) for i in range(1, n)]
        mean_naive = sum(naive_errors) / len(naive_errors) if naive_errors else 0
        if mean_naive > 0:
            out.mase = (sum(abs(e) for e in errors) / n) / mean_naive

    return out


def build_commentary(metrics: Metrics) -> str:
    mape = metrics.mape
    coverage = metrics.coverage
    r2 = metrics.r2

    if mape is None:
        accuracy = "uncertain"
        mape_str = "n/a"
    else:
        accuracy = (
            "excellent" if mape < 10 else "good" if mape < 20 else "moderate"
        )
        mape_str = f"{mape:.1f}%"

    coverage_str = (
        "Confidence intervals effectively capture uncertainty."
        if coverage is not None and coverage > 90
        else "Consider adjusting interval width."
    )

    if r2 is None:
        strength = "uncertain"
        r2_str = "n/a"
        r2_tail = "metrics could not be computed"
    else:
        strength = "strong" if r2 > 0.8 else "moderate" if r2 > 0.6 else "weak"
        r2_str = f"{r2:.3f}"
        r2_tail = (
            "the model captures most variance in the data"
            if r2 > 0.8
            else "there may be room for improvement"
        )

    return (
        "Performance Analysis:\n\n"
        f"The model shows {accuracy} accuracy with MAPE of {mape_str}. "
        f"{coverage_str}\n\n"
        f"The {strength} R² of {r2_str} indicates {r2_tail}."
    )
