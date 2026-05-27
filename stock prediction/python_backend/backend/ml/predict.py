"""
Inference loader.  Loads persisted models from disk and produces forecasts
for next-day, 7-day and 30-day horizons.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from backend.ml.features import add_indicators, build_xy
from backend.utils.config import settings
from backend.utils.data_fetcher import fetch_history
from backend.utils.logger import logger


@lru_cache(maxsize=32)
def _load_classical(symbol: str, name: str):
    p = settings.MODEL_DIR / symbol / f"{name}.joblib"
    if not p.exists():
        raise FileNotFoundError(p)
    return joblib.load(p)


@lru_cache(maxsize=32)
def _load_keras(symbol: str, name: str):
    import tensorflow as tf
    p = settings.MODEL_DIR / symbol / f"{name}.keras"
    if not p.exists():
        raise FileNotFoundError(p)
    return tf.keras.models.load_model(p), joblib.load(settings.MODEL_DIR / symbol / f"{name}_scaler.joblib")


def warm_up_models() -> None:
    """Pre-load every saved model into the LRU cache."""
    count = 0
    for sym_dir in settings.MODEL_DIR.glob("*"):
        if not sym_dir.is_dir():
            continue
        for f in sym_dir.glob("*.joblib"):
            try:
                joblib.load(f); count += 1
            except Exception:
                pass
    logger.info(f"📦 Warmed up {count} model artifacts")


def predict_classical(symbol: str, model_name: str, df: pd.DataFrame, horizon: int = 30) -> list[float]:
    """Recursive one-step prediction using a classical model."""
    bundle = _load_classical(symbol, model_name)
    pipe, feats = bundle["pipeline"], bundle["features"]

    out: list[float] = []
    work = df.copy()
    for _ in range(horizon):
        X = add_indicators(work).dropna().iloc[[-1]][feats]
        nxt = float(pipe.predict(X)[0])
        out.append(nxt)
        last = work.iloc[-1].copy()
        last["date"] = last["date"] + pd.Timedelta(days=1)
        last["open"] = last["high"] = last["low"] = last["close"] = nxt
        work = pd.concat([work, pd.DataFrame([last])], ignore_index=True)
    return out


def predict_deep(symbol: str, arch: str, df: pd.DataFrame, horizon: int = 30, lookback: int = 60) -> list[float]:
    """Recursive forecast with LSTM or GRU."""
    model, scaler = _load_keras(symbol, arch)
    feature_cols = ["close", "ema_12", "ema_26", "rsi_14", "macd",
                    "macd_hist", "bb_width", "atr_14"]
    feat_df = add_indicators(df).dropna()
    data = feat_df[feature_cols].values
    scaled = scaler.transform(data)
    window = scaled[-lookback:].copy()

    out: list[float] = []
    for _ in range(horizon):
        x = window.reshape(1, lookback, len(feature_cols))
        pred_scaled = float(model.predict(x, verbose=0)[0, 0])
        # inverse-scale to USD
        dummy = np.zeros((1, len(feature_cols)))
        dummy[0, 0] = pred_scaled
        price = float(scaler.inverse_transform(dummy)[0, 0])
        out.append(price)
        next_row = window[-1].copy()
        next_row[0] = pred_scaled
        window = np.vstack([window[1:], next_row])
    return out


def predict_arima(symbol: str, horizon: int = 30) -> list[float]:
    model = _load_classical.__wrapped__(symbol, "arima")  # bypass cache wrap
    forecast = model.forecast(steps=horizon)
    return [float(v) for v in forecast]


def ensemble_forecast(symbol: str, exchange: str = "NASDAQ", horizon: int = 30) -> dict:
    """Run all models and return per-model + ensemble forecasts."""
    df = fetch_history(symbol, exchange=exchange, period="2y")
    forecasts: dict[str, list[float]] = {}

    for name in ("linear_regression", "decision_tree", "random_forest", "xgboost"):
        try:
            forecasts[name] = predict_classical(symbol, name, df, horizon)
        except FileNotFoundError:
            logger.warning(f"{name} not trained for {symbol}")

    for arch in ("lstm", "gru"):
        try:
            forecasts[arch] = predict_deep(symbol, arch, df, horizon)
        except FileNotFoundError:
            logger.warning(f"{arch} not trained for {symbol}")

    try:
        forecasts["arima"] = predict_arima(symbol, horizon)
    except Exception:
        pass

    matrix = np.array(list(forecasts.values()))
    ensemble = matrix.mean(axis=0).tolist() if len(matrix) else []

    metrics_path = settings.MODEL_DIR / symbol / "metrics.json"
    metrics = json.loads(metrics_path.read_text()) if metrics_path.exists() else {}

    return {
        "symbol": symbol,
        "horizon": horizon,
        "last_close": float(df["close"].iloc[-1]),
        "models": forecasts,
        "ensemble": ensemble,
        "metrics": metrics,
    }
