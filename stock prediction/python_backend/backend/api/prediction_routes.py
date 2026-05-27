"""Prediction endpoints: ensemble forecasts + signal generation."""
from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.database.models import PredictionLog
from backend.ml.predict import ensemble_forecast
from backend.ml.train import train_all
from backend.utils.auth import get_current_user
from backend.utils.logger import logger

router = APIRouter()


class PredictBody(BaseModel):
    horizon: int = 30
    exchange: str = "NASDAQ"


class TrainBody(BaseModel):
    symbol: str
    exchange: str = "NASDAQ"
    period: str = "5y"


def _signal_from_expected_return(exp_ret: float) -> str:
    if exp_ret > 0.05:  return "STRONG BUY"
    if exp_ret > 0.015: return "BUY"
    if exp_ret < -0.05: return "STRONG SELL"
    if exp_ret < -0.015:return "SELL"
    return "HOLD"


@router.post("/{symbol}")
def predict(symbol: str, body: PredictBody, db: Session = Depends(get_db),
            _user=Depends(get_current_user)):
    try:
        result = ensemble_forecast(symbol, exchange=body.exchange, horizon=body.horizon)
    except Exception as e:
        raise HTTPException(500, f"Prediction failed: {e}")

    last = result["last_close"]
    seven = result["ensemble"][6] if len(result["ensemble"]) > 6 else last
    expected_return = (seven - last) / last
    signal = _signal_from_expected_return(expected_return)
    confidence = min(0.99, 0.55 + abs(expected_return) * 5)

    db.add(PredictionLog(
        symbol=symbol, model="ensemble", horizon=body.horizon,
        predicted_close=seven, confidence=confidence, signal=signal,
    ))
    db.commit()
    logger.info(f"Prediction[{symbol}] {signal} ({confidence:.0%})")

    return {**result, "expected_return_7d": expected_return, "signal": signal, "confidence": confidence}


@router.post("/train")
def train(body: TrainBody, bg: BackgroundTasks, _user=Depends(get_current_user)):
    """Schedules training in a background task; returns immediately."""
    bg.add_task(train_all, body.symbol, body.exchange, body.period)
    return {"status": "queued", "symbol": body.symbol}


@router.get("/metrics/{symbol}")
def metrics(symbol: str, _user=Depends(get_current_user)):
    from backend.utils.config import settings
    import json
    p = settings.MODEL_DIR / symbol / "metrics.json"
    if not p.exists():
        raise HTTPException(404, "No trained models for this symbol")
    return json.loads(p.read_text())
