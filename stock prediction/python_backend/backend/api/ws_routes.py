"""WebSocket endpoint for live tick streaming."""
from __future__ import annotations

import asyncio
import random

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.utils.data_fetcher import fetch_intraday
from backend.utils.logger import logger

router = APIRouter()


@router.websocket("/live/{symbol}")
async def live_ticks(websocket: WebSocket, symbol: str):
    """Stream a simulated tick (or real intraday quote) every 2 seconds."""
    await websocket.accept()
    logger.info(f"WS client connected for {symbol}")
    last = fetch_intraday(symbol) or 100.0

    try:
        while True:
            jitter = (random.random() - 0.5) * last * 0.0015
            last = max(0.01, last + jitter)
            await websocket.send_json({
                "symbol": symbol, "price": round(last, 2),
                "ts": asyncio.get_event_loop().time(),
            })
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        logger.info(f"WS client disconnected from {symbol}")
