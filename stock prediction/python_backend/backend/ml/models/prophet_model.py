"""
Prophet wrapper — Facebook's additive time-series forecaster.
Excellent for handling daily/weekly seasonality + holidays.

Usage:
    from backend.ml.models.prophet_model import train_prophet, predict_prophet
"""
from __future__ import annotations

import pandas as pd

try:
    from prophet import Prophet
except ImportError:                          # graceful fallback
    Prophet = None                           # type: ignore


def train_prophet(df: pd.DataFrame):
    """Fit Prophet on (date, close)."""
    if Prophet is None:
        raise RuntimeError("prophet not installed; `pip install prophet`")

    data = df[["date", "close"]].rename(columns={"date": "ds", "close": "y"})
    model = Prophet(
        daily_seasonality=False,
        weekly_seasonality=True,
        yearly_seasonality=True,
        changepoint_prior_scale=0.05,
        seasonality_mode="multiplicative",
    )
    model.fit(data)
    return model


def predict_prophet(model, horizon: int = 30) -> list[float]:
    """Forecast `horizon` business days ahead."""
    future = model.make_future_dataframe(periods=horizon, freq="B")
    forecast = model.predict(future)
    return forecast["yhat"].tail(horizon).astype(float).tolist()
