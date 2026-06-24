import pandas as pd

_FREQ_MAP = {
    "daily": "D", "day": "D", "d": "D",
    "weekly": "W", "week": "W", "w": "W",
    "monthly": "MS", "month": "MS", "m": "MS", "ms": "MS", "me": "MS",
    "quarterly": "QS", "quarter": "QS", "q": "QS", "qs": "QS",
    "yearly": "YS", "year": "YS", "annual": "YS", "y": "YS", "a": "YS", "ys": "YS",
}


def to_pandas_freq(freq: str) -> str:
    if not freq:
        return "MS"
    key = freq.strip().lower()
    if key in _FREQ_MAP:
        return _FREQ_MAP[key]
    # Already a pandas alias we recognize? keep common ones as-is.
    if freq in {"D", "W", "MS", "M", "QS", "Q", "YS", "Y", "H"}:
        return freq
    return "MS"


def split_segment(df: pd.DataFrame, date_column: str, training_records: int, test_records: int):
    ordered = df.copy()
    ordered[date_column] = pd.to_datetime(ordered[date_column])
    ordered = ordered.sort_values(date_column).reset_index(drop=True)
    train = ordered.iloc[:training_records].copy()
    test = ordered.iloc[training_records:training_records + test_records].copy()
    return train, test


def fmt_date(ts) -> str:
    return pd.Timestamp(ts).strftime("%Y-%m-%d")
