"""
backend/app.py
─────────────────────────────────────────────────────────────
FastAPI entrypoint for the QuantumStock prediction system.
Mounts all REST + WebSocket routes, configures CORS, JWT,
logging and lifespan hooks (DB init, model warm-up).
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.utils.config import settings
from backend.utils.logger import logger
from backend.database.db import init_db
from backend.ml.predict import warm_up_models

# Route modules
from backend.api import (
    auth_routes,
    stock_routes,
    prediction_routes,
    portfolio_routes,
    news_routes,
    ws_routes,
    report_routes,
    chatbot_routes,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown hooks."""
    logger.info(f"🚀 Starting {settings.APP_NAME} v1.0 in {settings.APP_ENV} mode")
    init_db()
    warm_up_models()
    yield
    logger.info("👋 Shutting down gracefully")


app = FastAPI(
    title="QuantumStock — AI Stock Prediction API",
    description="Industry-grade stock market prediction backend.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────
app.include_router(auth_routes.router,       prefix="/api/auth",      tags=["Auth"])
app.include_router(stock_routes.router,      prefix="/api/stocks",    tags=["Stocks"])
app.include_router(prediction_routes.router, prefix="/api/predict",   tags=["Predictions"])
app.include_router(portfolio_routes.router,  prefix="/api/portfolio", tags=["Portfolio"])
app.include_router(news_routes.router,       prefix="/api/news",      tags=["News"])
app.include_router(ws_routes.router,         prefix="/ws",            tags=["WebSocket"])
app.include_router(report_routes.router,     prefix="/api/reports",   tags=["Reports"])
app.include_router(chatbot_routes.router,    prefix="/api/chat",      tags=["AI Chatbot"])


@app.get("/", tags=["Root"])
def root():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/health", tags=["Root"])
def health():
    return {"status": "healthy"}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    """Last-resort error handler."""
    logger.exception(f"Unhandled exception on {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": exc.__class__.__name__},
    )
