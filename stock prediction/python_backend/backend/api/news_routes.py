"""
News & sentiment routes.

Uses HuggingFace FinBERT for sentiment scoring of headlines.
In production you would pull headlines from a real news API
(NewsAPI, Finnhub, Polygon). This module ships with a small
fixture set for demo purposes.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from fastapi import APIRouter, Depends

from backend.utils.auth import get_current_user

router = APIRouter()


@lru_cache(maxsize=1)
def _get_finbert():
    """Lazy-load FinBERT pipeline (only once)."""
    from transformers import AutoModelForSequenceClassification, AutoTokenizer, pipeline
    name = "ProsusAI/finbert"
    tok = AutoTokenizer.from_pretrained(name)
    mdl = AutoModelForSequenceClassification.from_pretrained(name)
    return pipeline("sentiment-analysis", model=mdl, tokenizer=tok)


HEADLINES: dict[str, list[str]] = {
    "AAPL": [
        "Apple beats Q4 earnings estimates, services revenue jumps 18% YoY",
        "Analysts upgrade Apple to 'Strong Buy' citing iPhone 16 momentum",
        "Apple faces regulatory scrutiny over App Store practices",
    ],
    "TSLA": [
        "Tesla delivers record number of vehicles in Q3",
        "Short-sellers double down on Tesla amid margin concerns",
        "Tesla announces breakthrough in battery energy density",
    ],
}


def _label_to_score(label: Literal["positive", "neutral", "negative"], conf: float) -> float:
    if label == "positive": return conf
    if label == "negative": return -conf
    return 0.0


@router.get("/{symbol}")
def get_news(symbol: str, _user=Depends(get_current_user)):
    headlines = HEADLINES.get(symbol.upper(), [
        f"{symbol} reports in-line quarterly numbers",
        f"Analysts mixed on {symbol}'s long-term outlook",
    ])
    try:
        nlp = _get_finbert()
        scored = nlp(headlines)
    except Exception:
        # Fallback so the endpoint never crashes when transformers/torch isn't installed
        scored = [{"label": "neutral", "score": 0.5}] * len(headlines)

    items = []
    for h, s in zip(headlines, scored):
        items.append({
            "title": h,
            "sentiment": s["label"].lower(),
            "score": _label_to_score(s["label"].lower(), float(s["score"])),
        })
    avg = sum(i["score"] for i in items) / max(1, len(items))
    return {"symbol": symbol, "items": items, "aggregate_sentiment": avg}
