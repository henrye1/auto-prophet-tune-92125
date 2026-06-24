from app.models import prophet_model, autogluon_model

_REGISTRY = {
    "prophet": prophet_model.fit_forecast,
    "autogluon": autogluon_model.fit_forecast,
}


def get_model(name: str):
    if name not in _REGISTRY:
        raise ValueError(f"Unsupported model: {name}")
    return _REGISTRY[name]
