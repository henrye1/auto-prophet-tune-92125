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
    benchmark_model: Optional[str] = None


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
