import pandas as pd
from app.utils import to_pandas_freq, split_segment, fmt_date


def test_to_pandas_freq_human_names():
    assert to_pandas_freq("monthly") == "MS"
    assert to_pandas_freq("daily") == "D"
    assert to_pandas_freq("weekly") == "W"
    assert to_pandas_freq("quarterly") == "QS"
    assert to_pandas_freq("yearly") == "YS"


def test_to_pandas_freq_passthrough_alias():
    assert to_pandas_freq("MS") == "MS"
    assert to_pandas_freq("D") == "D"


def test_to_pandas_freq_unknown_defaults_to_ms():
    assert to_pandas_freq("something-odd") == "MS"


def test_split_segment_orders_and_splits():
    df = pd.DataFrame({
        "date": ["2022-03-01", "2022-01-01", "2022-02-01", "2022-04-01"],
        "y": [3, 1, 2, 4],
    })
    train, test = split_segment(df, "date", training_records=3, test_records=1)
    assert list(train["y"]) == [1, 2, 3]
    assert list(test["y"]) == [4]


def test_fmt_date():
    assert fmt_date(pd.Timestamp("2022-05-01")) == "2022-05-01"
