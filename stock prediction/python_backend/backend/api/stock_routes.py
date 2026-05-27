"""Stock data + technical indicator endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.ml.features import add_indicators
from backend.utils.auth import get_current_user
from backend.utils.data_fetcher import fetch_history, fetch_intraday

router = APIRouter()


@router.get("/{symbol}")
def get_stock(symbol: str, exchange: str = Query("NASDAQ"), period: str = Query("1y"),
              _user=Depends(get_current_user)):
    try:
        df = fetch_history(symbol, exchange=exchange, period=period)
    except Exception as e:
        raise HTTPException(502, f"Upstream fetch failed: {e}")
    return {
        "symbol": symbol,
        "exchange": exchange,
        "records": df.assign(date=df["date"].astype(str)).to_dict(orient="records"),
    }


@router.get("/{symbol}/indicators")
def get_indicators(symbol: str, exchange: str = Query("NASDAQ"),
                   _user=Depends(get_current_user)):
    df = fetch_history(symbol, exchange=exchange, period="1y")
    feat = add_indicators(df).dropna()
    return feat.assign(date=feat["date"].astype(str)).to_dict(orient="records")


@router.get("/{symbol}/live")
def get_live(symbol: str, exchange: str = Query("NASDAQ"),
             _user=Depends(get_current_user)):
    price = fetch_intraday(symbol, exchange)
    return {"symbol": symbol, "price": price}
