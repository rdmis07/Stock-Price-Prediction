"""Portfolio CRUD + mark-to-market endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.database.models import Alert, Holding
from backend.utils.auth import get_current_user
from backend.utils.data_fetcher import fetch_intraday

router = APIRouter()


class HoldingBody(BaseModel):
    symbol: str
    exchange: str = "NASDAQ"
    qty: float
    avg_price: float


class AlertBody(BaseModel):
    symbol: str
    above: float | None = None
    below: float | None = None


@router.get("")
def list_holdings(db: Session = Depends(get_db), user=Depends(get_current_user)):
    uid = int(user["sub"])
    rows = db.query(Holding).filter(Holding.user_id == uid).all()
    enriched = []
    total_value = total_cost = 0.0
    for h in rows:
        live = fetch_intraday(h.symbol, h.exchange) or h.avg_price
        value = live * h.qty
        cost = h.avg_price * h.qty
        total_value += value; total_cost += cost
        enriched.append({
            "id": h.id, "symbol": h.symbol, "exchange": h.exchange,
            "qty": h.qty, "avg_price": h.avg_price, "live": live,
            "value": value, "pnl": value - cost,
            "pct": (live - h.avg_price) / h.avg_price * 100,
        })
    return {
        "holdings": enriched,
        "summary": {
            "total_value": total_value,
            "total_cost":  total_cost,
            "total_pnl":   total_value - total_cost,
            "total_pct":   ((total_value - total_cost) / total_cost * 100) if total_cost else 0,
        },
    }


@router.post("")
def add_holding(body: HoldingBody, db: Session = Depends(get_db),
                user=Depends(get_current_user)):
    h = Holding(user_id=int(user["sub"]), **body.model_dump())
    db.add(h); db.commit(); db.refresh(h)
    return {"id": h.id}


@router.delete("/{holding_id}")
def delete_holding(holding_id: int, db: Session = Depends(get_db),
                   user=Depends(get_current_user)):
    h = db.query(Holding).filter(Holding.id == holding_id,
                                 Holding.user_id == int(user["sub"])).first()
    if not h:
        raise HTTPException(404, "Holding not found")
    db.delete(h); db.commit()
    return {"deleted": True}


@router.post("/alerts")
def create_alert(body: AlertBody, db: Session = Depends(get_db),
                 user=Depends(get_current_user)):
    a = Alert(user_id=int(user["sub"]), **body.model_dump())
    db.add(a); db.commit(); db.refresh(a)
    return {"id": a.id}
