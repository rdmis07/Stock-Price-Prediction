"""
Trains all 7 models (LR, DT, RF, XGB, LSTM, GRU, ARIMA) for a list of symbols.
Saves artifacts to settings.MODEL_DIR / <symbol> / <model>.{joblib,h5}.

Usage:
    python -m backend.ml.train --symbols AAPL MSFT NVDA TSLA --years 5
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.tree import DecisionTreeRegressor
from xgboost import XGBRegressor

from backend.ml.features import add_indicators, build_xy
from backend.ml.pipeline import build_pipeline
from backend.utils.config import settings
from backend.utils.data_fetcher import fetch_history
from backend.utils.logger import logger


def _metrics(y_true, y_pred) -> dict:
    return {
        "MAE":  float(mean_absolute_error(y_true, y_pred)),
        "MSE":  float(mean_squared_error(y_true, y_pred)),
        "RMSE": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "R2":   float(r2_score(y_true, y_pred)),
    }


def _chronological_split(X: pd.DataFrame, y: pd.Series, frac: float = 0.8):
    n = int(len(X) * frac)
    return X.iloc[:n], X.iloc[n:], y.iloc[:n], y.iloc[n:]


def train_classical_models(symbol: str, df: pd.DataFrame) -> dict:
    """Train LR, DT, RF, XGBoost (tabular models on engineered features)."""
    X, y, feats = build_xy(df, target_shift=1)
    X_train, X_test, y_train, y_test = _chronological_split(X, y)

    models = {
        "linear_regression": LinearRegression(),
        "decision_tree":     DecisionTreeRegressor(max_depth=10, min_samples_leaf=3, random_state=42),
        "random_forest":     RandomForestRegressor(n_estimators=300, max_depth=12, n_jobs=-1, random_state=42),
        "xgboost":           XGBRegressor(
            n_estimators=500, max_depth=6, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8, objective="reg:squarederror",
            tree_method="hist", random_state=42, n_jobs=-1,
        ),
    }

    out = {}
    for name, est in models.items():
        logger.info(f"[{symbol}] Training {name}…")
        pipe = build_pipeline(est, feats)
        pipe.fit(X_train, y_train)
        preds = pipe.predict(X_test)
        m = _metrics(y_test, preds)
        out[name] = m
        path = settings.MODEL_DIR / symbol / f"{name}.joblib"
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump({"pipeline": pipe, "features": feats}, path)
        logger.info(f"[{symbol}] {name} → R²={m['R2']:.3f}  RMSE={m['RMSE']:.3f}")
    return out


def train_deep_models(symbol: str, df: pd.DataFrame, lookback: int = 60, epochs: int = 30) -> dict:
    """Train LSTM + GRU sequence models on close prices + indicators."""
    # Lazy import so the package works without TF installed
    import tensorflow as tf
    from tensorflow.keras import layers, models  # noqa
    from sklearn.preprocessing import MinMaxScaler

    feat_df = add_indicators(df).dropna()
    feature_cols = ["close", "ema_12", "ema_26", "rsi_14", "macd",
                    "macd_hist", "bb_width", "atr_14"]
    data = feat_df[feature_cols].values

    scaler = MinMaxScaler()
    data_scaled = scaler.fit_transform(data)

    X, y = [], []
    for i in range(lookback, len(data_scaled)):
        X.append(data_scaled[i - lookback:i])
        y.append(data_scaled[i, 0])  # predict scaled close
    X, y = np.array(X), np.array(y)

    split = int(len(X) * 0.8)
    X_tr, X_te = X[:split], X[split:]
    y_tr, y_te = y[:split], y[split:]

    out = {}
    for arch in ("lstm", "gru"):
        logger.info(f"[{symbol}] Training {arch.upper()}…")
        Layer = layers.LSTM if arch == "lstm" else layers.GRU
        model = models.Sequential([
            layers.Input(shape=(lookback, len(feature_cols))),
            Layer(128, return_sequences=True),
            layers.Dropout(0.2),
            Layer(64),
            layers.Dense(32, activation="relu"),
            layers.Dense(1),
        ])
        model.compile(optimizer="adam", loss="mse", metrics=["mae"])
        model.fit(X_tr, y_tr, epochs=epochs, batch_size=32, validation_split=0.1, verbose=0)
        preds_scaled = model.predict(X_te, verbose=0).flatten()

        # inverse-scale the predictions back to USD
        dummy = np.zeros((len(preds_scaled), len(feature_cols)))
        dummy[:, 0] = preds_scaled
        preds = scaler.inverse_transform(dummy)[:, 0]
        dummy[:, 0] = y_te
        actual = scaler.inverse_transform(dummy)[:, 0]

        m = _metrics(actual, preds)
        out[arch] = m
        path = settings.MODEL_DIR / symbol / f"{arch}.keras"
        path.parent.mkdir(parents=True, exist_ok=True)
        model.save(path)
        joblib.dump(scaler, settings.MODEL_DIR / symbol / f"{arch}_scaler.joblib")
        logger.info(f"[{symbol}] {arch.upper()} → R²={m['R2']:.3f}  RMSE={m['RMSE']:.3f}")
    return out


def train_arima(symbol: str, df: pd.DataFrame) -> dict:
    """ARIMA(1,1,0) baseline."""
    from statsmodels.tsa.arima.model import ARIMA

    series = df["close"].astype(float)
    split = int(len(series) * 0.8)
    train, test = series.iloc[:split], series.iloc[split:]
    model = ARIMA(train, order=(1, 1, 0)).fit()
    forecast = model.forecast(steps=len(test))
    m = _metrics(test.values, forecast.values)
    path = settings.MODEL_DIR / symbol / "arima.joblib"
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, path)
    logger.info(f"[{symbol}] ARIMA → R²={m['R2']:.3f}  RMSE={m['RMSE']:.3f}")
    return {"arima": m}


def train_all(symbol: str, exchange: str = "NASDAQ", period: str = "5y") -> dict:
    df = fetch_history(symbol, exchange=exchange, period=period)
    metrics = {}
    metrics.update(train_classical_models(symbol, df))
    metrics.update(train_deep_models(symbol, df))
    metrics.update(train_arima(symbol, df))

    summary_path = settings.MODEL_DIR / symbol / "metrics.json"
    summary_path.write_text(json.dumps(metrics, indent=2))
    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbols", nargs="+", required=True)
    parser.add_argument("--exchange", default="NASDAQ")
    parser.add_argument("--years", type=int, default=5)
    args = parser.parse_args()

    period = f"{args.years}y"
    grand: dict = {}
    for s in args.symbols:
        grand[s] = train_all(s, exchange=args.exchange, period=period)

    Path("training_summary.json").write_text(json.dumps(grand, indent=2))
    print("✅ Training complete. See training_summary.json")
