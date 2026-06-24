import pytest
from app.models import get_model
from app.models import prophet_model, autogluon_model


def test_get_model_prophet():
    assert get_model("prophet") is prophet_model.fit_forecast


def test_get_model_autogluon():
    assert get_model("autogluon") is autogluon_model.fit_forecast


def test_get_model_unknown_raises():
    with pytest.raises(ValueError):
        get_model("arima")
