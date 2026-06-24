import os

os.environ["SUPABASE_URL"] = "https://example.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "service-key"
os.environ["SUPABASE_JWT_SECRET"] = "test-secret-that-is-long-enough!!"

from app import jobs  # noqa: E402
from app.schemas import ForecastRequest, SegmentSpec, SegmentOutput, ForecastPoint  # noqa: E402


def _make_request():
    """Build a ForecastRequest with TWO segments over the same small dataset.

    Both segments reference segmentValue "A" and "B", but the data only contains
    3 rows for "A" and nothing for "B".  training_records=100 exceeds the available
    rows for every segment, so both hit the ValueError("Not enough data...") guard
    without ever invoking a real model fit.
    """
    data = [
        {"date": "2024-01-01", "segment": "A", "y": 1.0},
        {"date": "2024-02-01", "segment": "A", "y": 2.0},
        {"date": "2024-03-01", "segment": "A", "y": 3.0},
    ]
    segments = [
        {
            "segmentValue": "A", "segment": "segment",
            "forecast_periods": 1, "frequency": "MS",
            "training_records": 100, "test_records": 1, "prophet_params": {},
        },
        {
            "segmentValue": "B", "segment": "segment",
            "forecast_periods": 1, "frequency": "MS",
            "training_records": 100, "test_records": 1, "prophet_params": {},
        },
    ]
    return ForecastRequest(
        model="prophet",
        date_column="date",
        segment_column="segment",
        dependent_variable="y",
        segments=segments,
        data=data,
        metrics=["mae"],
    )


def test_process_job_per_segment_failure_does_not_abort(monkeypatch):
    """process_job records per-segment errors without aborting; final status == completed."""
    captured = []

    def fake_update_job(job_id, fields):
        captured.append((job_id, fields))

    monkeypatch.setattr(jobs.db, "update_job", fake_update_job)

    req = _make_request()
    jobs.process_job("job-test", req)

    # There must be at least one update_job call.
    assert len(captured) >= 1, "update_job was never called"

    # The FINAL call must mark the job completed at 100%.
    final_job_id, final_fields = captured[-1]
    assert final_job_id == "job-test"
    assert final_fields["status"] == "completed"
    assert final_fields["progress"] == 100

    # The final results must contain exactly 2 segment entries.
    segments = final_fields["results"]["segments"]
    assert len(segments) == 2, f"Expected 2 segment entries, got {len(segments)}"

    segment_values = {s["segmentValue"] for s in segments}
    assert segment_values == {"A", "B"}, f"Unexpected segment values: {segment_values}"

    for seg in segments:
        # Each failed segment must carry an error message.
        assert "error" in seg, f"Missing 'error' key in segment {seg['segmentValue']}"
        assert seg["error"], f"'error' is empty for segment {seg['segmentValue']}"

        # Data lists must be empty (failure path initialises them as []).
        assert seg["training_data"] == [], f"training_data non-empty for {seg['segmentValue']}"
        assert seg["test_data"] == [], f"test_data non-empty for {seg['segmentValue']}"
        assert seg["forecast_data"] == [], f"forecast_data non-empty for {seg['segmentValue']}"

        # Metrics dict must be empty.
        assert seg["metrics"] == {}, f"metrics non-empty for {seg['segmentValue']}"


def _stub_out():
    p = ForecastPoint(date="2020-01-01", predicted=1.0, lower_bound=0.5, upper_bound=1.5)
    return SegmentOutput(training_data=[p], test_data=[p], forecast_data=[p], metrics={"mae": 0.1})


def _bm_request():
    rows = [{"date": f"2020-{m:02d}-01", "segment": "A", "y": float(m)} for m in range(1, 5)]
    return ForecastRequest(
        model="prophet", date_column="date", segment_column="segment",
        dependent_variable="y",
        segments=[SegmentSpec(segmentValue="A", segment="seg", forecast_periods=1,
                              frequency="MS", training_records=3, test_records=1,
                              prophet_params={"interval_width": 0.8})],
        data=rows, metrics=["mae"], benchmark_model="autogluon",
    )


def test_interval_width_in_result(monkeypatch):
    monkeypatch.setattr(jobs, "get_model", lambda name: (lambda **kw: _stub_out()))
    captured = []
    monkeypatch.setattr(jobs.db, "update_job", lambda jid, fields: captured.append(fields))
    req = _bm_request()
    req.benchmark_model = None
    jobs.process_job("job-iw", req)
    seg = captured[-1]["results"]["segments"][0]
    assert seg["interval_width"] == 0.8


def test_benchmark_attached(monkeypatch):
    monkeypatch.setattr(jobs, "get_model", lambda name: (lambda **kw: _stub_out()))
    captured = []
    monkeypatch.setattr(jobs.db, "update_job", lambda jid, fields: captured.append(fields))
    jobs.process_job("job-bm", _bm_request())
    seg = captured[-1]["results"]["segments"][0]
    assert seg["benchmark_model"] == "autogluon"
    assert seg["benchmark_test_data"] and seg["benchmark_forecast_data"]
    assert seg["benchmark_training_data"], "benchmark_training_data should be truthy"
    assert seg["benchmark_metrics"] == {"mae": 0.1}


def test_benchmark_failure_keeps_primary(monkeypatch):
    def fake_get(name):
        if name == "autogluon":
            def boom(**kw):
                raise RuntimeError("benchmark failed")
            return boom
        return lambda **kw: _stub_out()
    monkeypatch.setattr(jobs, "get_model", fake_get)
    captured = []
    monkeypatch.setattr(jobs.db, "update_job", lambda jid, fields: captured.append(fields))
    jobs.process_job("job-bmfail", _bm_request())
    final = captured[-1]
    seg = final["results"]["segments"][0]
    assert "benchmark_model" not in seg          # benchmark omitted
    assert seg["training_data"], "primary training_data should be truthy after benchmark failure"
    assert seg["test_data"]                        # primary intact
    assert seg["forecast_data"], "primary forecast_data should be truthy after benchmark failure"
    assert final["status"] == "completed"
