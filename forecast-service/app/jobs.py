import pandas as pd
from datetime import datetime, timezone

from app import db
from app.models import get_model
from app.utils import split_segment
from app.schemas import ForecastRequest

MIN_TRAIN_RECORDS = 2


def process_job(job_id: str, req: ForecastRequest) -> None:
    try:
        db.update_job(job_id, {"status": "running", "progress": 0})
        started_at = datetime.now(timezone.utc).isoformat()
        full = pd.DataFrame(req.data)
        fit_forecast = get_model(req.model)

        # Resolve the optional benchmark fitter once (best-effort).
        bm_name = req.benchmark_model
        bm_fit = None
        if bm_name and bm_name != req.model:
            try:
                bm_fit = get_model(bm_name)
            except Exception:  # noqa: BLE001
                bm_fit = None

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
                params = spec.prophet_params or {}
                out = fit_forecast(
                    train_df=train, test_df=test,
                    date_column=req.date_column, value_column=req.dependent_variable,
                    future_periods=spec.forecast_periods, freq=spec.frequency,
                    params=params, selected_metrics=req.metrics,
                )
                seg_result = {
                    "segment": spec.segment, "segmentValue": spec.segmentValue,
                    "model": req.model,
                    "interval_width": params.get("interval_width", 0.8),
                    **out.model_dump(exclude_none=True),
                }

                if bm_fit is not None:
                    try:
                        bm_out = bm_fit(
                            train_df=train, test_df=test,
                            date_column=req.date_column, value_column=req.dependent_variable,
                            future_periods=spec.forecast_periods, freq=spec.frequency,
                            params=params, selected_metrics=req.metrics,
                        )
                        bm = bm_out.model_dump(exclude_none=True)
                        seg_result["benchmark_model"] = bm_name
                        seg_result["benchmark_training_data"] = bm["training_data"]
                        seg_result["benchmark_test_data"] = bm["test_data"]
                        seg_result["benchmark_forecast_data"] = bm["forecast_data"]
                        seg_result["benchmark_metrics"] = bm["metrics"]
                    except Exception:  # noqa: BLE001
                        pass  # benchmark is best-effort; omit on failure

                segments_out.append(seg_result)
            except Exception as seg_err:  # noqa: BLE001
                segments_out.append({
                    "segment": spec.segment, "segmentValue": spec.segmentValue,
                    "model": req.model, "error": str(seg_err),
                    "training_data": [], "test_data": [], "forecast_data": [], "metrics": {},
                })

            progress = round((i + 1) / total * 100)
            db.update_job(job_id, {
                "status": "running", "progress": progress,
                "results": {"segments": segments_out, "model": req.model, "timestamp": started_at},
            })

        db.update_job(job_id, {
            "status": "completed", "progress": 100,
            "results": {"segments": segments_out, "model": req.model, "timestamp": started_at},
        })
    except Exception as err:  # noqa: BLE001
        db.update_job(job_id, {"status": "failed", "error": str(err)})
