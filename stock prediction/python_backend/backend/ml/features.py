"""
Feature engineering: technical indicators + lag features.
Uses `ta` library for SMA/EMA/RSI/MACD/Bollinger/ATR.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from ta.momentum import RSIIndicator
from ta.trend import EMAIndicator, MACD, SMAIndicator
from ta.volatility import AverageTrueRange, BollingerBands


def add_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add a battery of technical indicators to a DataFrame containing
    `open, high, low, close, volume` columns.
    """
    out = df.copy()
    close, high, low, vol = out["close"], out["high"], out["low"], out["volume"]

    # Moving averages
    out["sma_10"] = SMAIndicator(close, window=10).sma_indicator()
    out["sma_20"] = SMAIndicator(close, window=20).sma_indicator()
    out["sma_50"] = SMAIndicator(close, window=50).sma_indicator()
    out["ema_12"] = EMAIndicator(close, window=12).ema_indicator()
    out["ema_26"] = EMAIndicator(close, window=26).ema_indicator()

    # RSI
    out["rsi_14"] = RSIIndicator(close, window=14).rsi()

    # MACD
    macd = MACD(close, window_slow=26, window_fast=12, window_sign=9)
    out["macd"] = macd.macd()
    out["macd_signal"] = macd.macd_signal()
    out["macd_hist"] = macd.macd_diff()

    # Bollinger Bands
    bb = BollingerBands(close, window=20, window_dev=2)
    out["bb_upper"] = bb.bollinger_hband()
    out["bb_lower"] = bb.bollinger_lband()
    out["bb_width"] = (out["bb_upper"] - out["bb_lower"]) / close

    # Volatility
    out["atr_14"] = AverageTrueRange(high, low, close, window=14).average_true_range()

    # Returns & momentum
    out["return_1"] = close.pct_change(1)
    out["return_5"] = close.pct_change(5)
    out["return_10"] = close.pct_change(10)
    out["momentum_10"] = close - close.shift(10)

    # Volume features
    out["volume_zscore"] = (vol - vol.rolling(20).mean()) / vol.rolling(20).std()

    # Lag features
    for k in (1, 2, 3, 5):
        out[f"close_lag_{k}"] = close.shift(k)

    out = out.replace([np.inf, -np.inf], np.nan)
    return out


def build_xy(df: pd.DataFrame, target_shift: int = 1):
    """
    Build supervised dataset. `y` = next-day close (or target_shift-day-ahead).
    Returns X (features), y (target), and feature column list.
    """
    df = add_indicators(df)
    df["target"] = df["close"].shift(-target_shift)
    df = df.dropna()
    feature_cols = [c for c in df.columns if c not in ("date", "target")]
    X = df[feature_cols]
    y = df["target"]
    return X, y, feature_cols
