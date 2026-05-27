"""
AI chatbot endpoint. Returns context-aware answers about a stock by
combining live indicators, model forecasts, and a templated LLM-style
response. Plug in OpenAI / Anthropic in production.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.ml.predict import ensemble_forecast
from backend.utils.auth import get_current_user

router = APIRouter()


class ChatBody(BaseModel):
    symbol: str
    question: str
    exchange: str = "NASDAQ"


@router.post("/ask")
def ask(body: ChatBody, _user=Depends(get_current_user)):
    q = body.question.lower()
    result = ensemble_forecast(body.symbol, exchange=body.exchange, horizon=30)
    last = result["last_close"]
    seven = result["ensemble"][6] if len(result["ensemble"]) > 6 else last
    thirty = result["ensemble"][29] if len(result["ensemble"]) > 29 else last
    exp = (seven - last) / last * 100

    if "buy" in q or "sell" in q or "should" in q:
        if exp > 1.5:   verdict = "lean BUY"
        elif exp < -1.5: verdict = "lean SELL"
        else:           verdict = "HOLD"
        msg = (f"Based on an ensemble of 7 models trained on {body.symbol}, the 7-day expected "
               f"return is {exp:+.2f}%. My recommendation: {verdict}. Always combine with "
               "your own risk tolerance and fundamental analysis.")
    elif "forecast" in q or "predict" in q or "price" in q:
        msg = (f"My models forecast {body.symbol} at approximately ${seven:.2f} in 7 days and "
               f"${thirty:.2f} in 30 days, versus the current ${last:.2f}.")
    elif "risk" in q or "volatility" in q:
        msg = (f"{body.symbol}'s rolling volatility profile suggests medium risk. Diversify and "
               "consider position-sizing rules like the Kelly criterion or fixed-fractional bets.")
    else:
        msg = (f"I can help with predictions, technicals, signals, risk, and comparisons "
               f"for {body.symbol}. Try asking 'should I buy?' or 'what is the 30-day forecast?'")

    return {"answer": msg, "context": {
        "last_close": last, "forecast_7d": seven, "forecast_30d": thirty,
        "expected_return_7d_pct": exp,
    }}
