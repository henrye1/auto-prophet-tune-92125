import pandas as pd

from app import db
from app.models import get_model
from app.utils import split_segment
from app.schemas import ForecastRequest

MIN_TRAIN_RECORDS = 2


def process_job(job_id: str, req: ForecastRequest) -> None:
    try:
        db.update_job(job_id, {"status": "running", "progress": 0})
        full = pd.DataFrame(req.data)
        fit_forecast = get_model(req.model)
        total = len(req.segments)
        segments_out = []

        for i, spec in enumerate(req.segments):
            seg_df = full[full[req.segment_column] == spec.segmentValue]
            try:
                if len(seg_df) < spec.training_records + 1 or spec.training_records < MIN_TRAIN_RECORDS:
                    raise ValueError("Not enough data to train this segment")
                train, test = split_segment(
                    seg_df, req.date_column, spec.training_records, spec.test_records
                )
                out = fit_forecast(
                    train_df=train, test_df=test,
                    date_column=req.date_column, value_column=req.dependent_variable,
                    future_periods=spec.forecast_periods, freq=spec.frequency,
                    params=spec.prophet_params or {}, selected_metrics=req.metrics,
                )
                segments_out.append({
                    "segment": spec.segment, "segmentValue": spec.segmentValue,
                    "model": req.model,
                    **out.model_dump(exclude_none=False),
                })
            except Exception as seg_err:  # noqa: BLE001
                segments_out.append({
                    "segment": spec.segment, "segmentValue": spec.segmentValue,
                    "model": req.model, "error": str(seg_err),
                    "training_data": [], "test_data": [], "forecast_data": [], "metrics": {},
                })

            progress = round((i + 1) / total * 100)
            db.update_job(job_id, {
                "status": "running", "progress": progress,
                "results": {"segments": segments_out, "model": req.model},
            })

        db.update_job(job_id, {
            "status": "completed", "progress": 100,
            "results": {"segments": segments_out, "model": req.model},
        })
    except Exception as err:  # noqa: BLE001
        db.update_job(job_id, {"status": "failed", "error": str(err)})
