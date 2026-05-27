"""Unit tests for technical-indicator pipeline."""
import numpy as np
import pandas as pd
import pytest

from backend.ml.features import add_indicators, build_xy


@pytest.fixture
def sample_df():
    rng = np.random.default_rng(42)
    n = 250
    close = 100 + np.cumsum(rng.normal(0, 1, n))
    return pd.DataFrame({
        "date":   pd.date_range("2023-01-01", periods=n, freq="B"),
        "open":   close + rng.normal(0, 0.3, n),
        "high":   close + np.abs(rng.normal(0, 0.5, n)),
        "low":    close - np.abs(rng.normal(0, 0.5, n)),
        "close":  close,
        "volume": rng.integers(1_000_000, 5_000_000, n),
    })


def test_add_indicators_columns(sample_df):
    out = add_indicators(sample_df)
    for col in ("sma_20", "ema_12", "rsi_14", "macd", "bb_upper", "atr_14",
                "return_1", "close_lag_1"):
        assert col in out.columns


def test_rsi_in_range(sample_df):
    out = add_indicators(sample_df).dropna()
    assert ((out["rsi_14"] >= 0) & (out["rsi_14"] <= 100)).all()


def test_build_xy_no_nans(sample_df):
    X, y, feats = build_xy(sample_df, target_shift=1)
    assert not X.isna().any().any()
    assert not y.isna().any()
    assert len(X) == len(y)
    assert len(feats) > 10
