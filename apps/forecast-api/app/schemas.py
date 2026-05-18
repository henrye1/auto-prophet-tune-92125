from __future__ import annotations

from typing import Any, Literal, Union

from pydantic import BaseModel, ConfigDict, Field

PerformanceMetric = Literal[
    "mae", "rmse", "mape", "mse", "r2", "adj_r2", "coverage", "smape", "mase"
]

ForecastModel = Literal["prophet", "autogluon", "arima", "ar", "arma"]


class CustomSeasonality(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    period: float
    fourier_order: int
    prior_scale: float | None = None
    mode: Literal["additive", "multiplicative"] | None = None


class ProphetParameters(BaseModel):
    model_config = ConfigDict(extra="ignore")
    growth: Literal["linear", "logistic"] = "linear"
    changepoint_prior_scale: float = 0.05
    seasonality_mode: Literal["additive", "multiplicative"] = "additive"
    seasonality_prior_scale: float = 10.0
    yearly_seasonality: Union[bool, int] = True
    weekly_seasonality: Union[bool, int] = False
    daily_seasonality: Union[bool, int] = False
    changepoint_range: float = 0.8
    cv_initial: float = 730
    cv_period: float = 180
    cv_horizon: float = 365
    custom_seasonalities: list[CustomSeasonality] = Field(default_factory=list)
    interval_width: float = 0.80
    lower_bound: float | None = None
    upper_bound: float | None = None


class Regressor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    prior_scale: float | None = None
    standardize: Union[bool, str] | None = None
    mode: Literal["additive", "multiplicative"] | None = None
    lead_lag: int | None = None


class SegmentInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    segment: str
    segmentValue: str
    regressors: list[Regressor] = Field(default_factory=list)
    forecast_periods: int
    frequency: str


class ForecastRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    model: ForecastModel = "prophet"
    date_column: str
    dependent_variable: str
    training_data: list[dict[str, Any]]
    test_data: list[dict[str, Any]] = Field(default_factory=list)
    segment: SegmentInfo
    prophet_params: ProphetParameters = Field(default_factory=ProphetParameters)
    selected_metrics: list[PerformanceMetric] = Field(
        default_factory=lambda: ["mae", "rmse", "mape", "coverage"]
    )


class ForecastPoint(BaseModel):
    model_config = ConfigDict(extra="ignore")
    date: str
    actual: float | None = None
    predicted: float
    lower_bound: float
    upper_bound: float
    is_test: bool | None = None
    is_forecast: bool | None = None


class Metrics(BaseModel):
    model_config = ConfigDict(extra="ignore")
    mae: float | None = None
    rmse: float | None = None
    mape: float | None = None
    mse: float | None = None
    r2: float | None = None
    adj_r2: float | None = None
    coverage: float | None = None
    smape: float | None = None
    mase: float | None = None


class SegmentForecastResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    segment: str
    segmentValue: str
    training_data: list[ForecastPoint]
    test_data: list[ForecastPoint]
    forecast_data: list[ForecastPoint]
    metrics: Metrics
    ai_commentary: str
    model: str = "prophet"
    interval_width: float | None = None
    lower_bound: float | None = None
    upper_bound: float | None = None
