"""
Yahoo Finance data fetcher with on-disk caching.
Supports US (NASDAQ/NYSE) and Indian (NSE/BSE) stocks.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import pandas as pd
import yfinance as yf

from backend.utils.config import settings
from backend.utils.logger import logger

# Map our exchange tag → yfinance suffix
SUFFIX = {"NSE": ".NS", "BSE": ".BO", "NASDAQ": "", "NYSE": ""}


def _cache_path(symbol: str) -> Path:
    return settings.DATASET_DIR / f"{symbol.replace('.', '_')}.parquet"


def fetch_history(
    symbol: str,
    exchange: str = "NASDAQ",
    period: str = "5y",
    interval: str = "1d",
    use_cache: bool = True,
    cache_ttl_hours: int = 6,
) -> pd.DataFrame:
    """Fetch OHLCV history for a symbol; falls back to cache on network errors."""
    full_symbol = f"{symbol}{SUFFIX.get(exchange, '')}"
    cache = _cache_path(full_symbol)

    # Cache hit?
    if use_cache and cache.exists():
        mtime = datetime.fromtimestamp(cache.stat().st_mtime)
        if datetime.now() - mtime < timedelta(hours=cache_ttl_hours):
            logger.debug(f"Cache hit for {full_symbol}")
            return pd.read_parquet(cache)

    try:
        logger.info(f"Fetching {full_symbol} from Yahoo Finance ({period}, {interval})")
        df = yf.download(full_symbol, period=period, interval=interval, progress=False, auto_adjust=True)
        if df.empty:
            raise ValueError(f"No data returned for {full_symbol}")
        # Flatten potential multi-index columns
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        df = df.rename(columns=str.lower).reset_index()
        df["date"] = pd.to_datetime(df["date"]).dt.tz_localize(None)
        df.to_parquet(cache, index=False)
        return df
    except Exception as e:
        logger.error(f"Fetch failed for {full_symbol}: {e}")
        if cache.exists():
            logger.warning("Returning stale cache")
            return pd.read_parquet(cache)
        raise


def fetch_intraday(symbol: str, exchange: str = "NASDAQ") -> Optional[float]:
    """Return last known intraday price (or None)."""
    full_symbol = f"{symbol}{SUFFIX.get(exchange, '')}"
    try:
        t = yf.Ticker(full_symbol)
        info = t.fast_info
        return float(info.last_price)
    except Exception as e:
        logger.warning(f"Intraday fetch failed for {full_symbol}: {e}")
        return None
