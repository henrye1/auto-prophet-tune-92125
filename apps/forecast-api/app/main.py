from __future__ import annotations

import logging
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .forecasting import run_prophet_forecast
from .schemas import ForecastRequest, SegmentForecastResult

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="forecast-api", version="0.1.0")

_allowed_origins = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:8080").split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post(
    "/forecast",
    response_model=SegmentForecastResult,
    response_model_exclude_none=True,
)
def forecast(req: ForecastRequest) -> SegmentForecastResult:
    if req.model != "prophet":
        raise HTTPException(
            status_code=400,
            detail=f"Model '{req.model}' is not supported in v1. Only 'prophet' is implemented.",
        )
    try:
        return run_prophet_forecast(req)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Forecast failed")
        raise HTTPException(status_code=500, detail=f"Forecast failed: {exc}") from exc
