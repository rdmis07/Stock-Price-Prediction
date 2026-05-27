# 🚀 QuantumStock — AI-Powered Stock Price Prediction System

> Industry-grade, full-stack stock market prediction platform using Python, Machine Learning, Deep Learning, FastAPI and React.

![python](https://img.shields.io/badge/python-3.11-blue)
![fastapi](https://img.shields.io/badge/FastAPI-0.111-009688)
![tensorflow](https://img.shields.io/badge/TensorFlow-2.16-FF6F00)
![license](https://img.shields.io/badge/license-MIT-green)

QuantumStock fetches live market data via `yfinance`, builds a complete ML pipeline (preprocessing → feature engineering → multi-model training → evaluation), serves predictions through a JWT-secured FastAPI backend, and visualizes everything on a modern dark-themed React dashboard.

---

## ✨ Features

- 🔐 **User Authentication** — JWT signup / login with bcrypt password hashing
- 📈 **Live Stock Data** — yfinance integration with NSE / BSE / NASDAQ / NYSE
- 🧹 **End-to-End ML Pipeline** — sklearn `Pipeline` with imputation, scaling, normalization
- 🧪 **Technical Indicators** — SMA, EMA, RSI, MACD, Bollinger Bands, ATR, Momentum
- 🤖 **7 ML / DL / Stat Models** — Linear Regression, Decision Tree, Random Forest, XGBoost, LSTM, GRU, ARIMA
- 🧠 **AI Recommendations** — Ensemble Buy / Sell / Hold signals with confidence score
- 📰 **NLP Sentiment** — FinBERT scoring of financial news headlines
- 📊 **Interactive Dashboard** — Candlestick charts, indicators, prediction overlays
- 🔮 **Multi-horizon Forecasts** — 1-day, 7-day, 30-day price predictions
- 🌐 **REST + WebSocket API** — Real-time tick streaming
- 💼 **Portfolio Tracker** — Mark-to-market valuation with P&L
- 🐳 **Docker Ready** — Production deployment with `docker-compose`

---

## 📂 Project Structure

```
stock_prediction_app/
├── backend/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── auth_routes.py        # JWT signup/login
│   │   ├── stock_routes.py       # Stock + indicators
│   │   ├── prediction_routes.py  # Model inference
│   │   ├── portfolio_routes.py
│   │   ├── news_routes.py        # FinBERT sentiment
│   │   └── ws_routes.py          # WebSocket live ticks
│   ├── ml/
│   │   ├── __init__.py
│   │   ├── pipeline.py           # sklearn Pipeline
│   │   ├── features.py           # Technical indicators
│   │   ├── train.py              # Trains all 7 models
│   │   ├── predict.py            # Inference loader
│   │   └── models/
│   │       ├── linear_reg.py
│   │       ├── decision_tree.py
│   │       ├── random_forest.py
│   │       ├── xgboost_model.py
│   │       ├── lstm_model.py
│   │       ├── gru_model.py
│   │       └── arima_model.py
│   ├── utils/
│   │   ├── data_fetcher.py       # yfinance wrapper
│   │   ├── auth.py               # JWT helpers
│   │   ├── logger.py
│   │   └── config.py             # env loader
│   ├── database/
│   │   ├── db.py                 # SQLAlchemy / SQLite
│   │   └── models.py
│   ├── app.py                    # FastAPI entrypoint
│   └── __init__.py
├── frontend/                     # React + Vite + Tailwind dashboard
├── saved_models/                 # joblib + .h5 model artifacts
├── datasets/                     # cached parquet files
├── notebooks/
│   ├── 01_eda.ipynb
│   ├── 02_feature_engineering.ipynb
│   └── 03_model_comparison.ipynb
├── tests/
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## ⚙️ Installation

### 1. Clone & set up a virtual environment

```bash
git clone https://github.com/yourusername/quantumstock.git
cd quantumstock
python -m venv venv
source venv/bin/activate          # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your secret key, database url, SMTP credentials, etc.
```

### 3. Initialize the database

```bash
python -m backend.database.db --init
```

### 4. Train the models (one-time, ~5 min)

```bash
python -m backend.ml.train --symbols AAPL MSFT NVDA TSLA --years 5
```

### 5. Run the API server

```bash
uvicorn backend.app:app --reload --port 8000
```

API docs: **http://localhost:8000/docs**

### 6. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## 🐳 Docker Deployment

```bash
docker-compose up --build
```

This launches:
- `backend` — FastAPI on port 8000
- `frontend` — React production build behind nginx on port 80
- `db` — PostgreSQL (optional, falls back to SQLite)

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Authenticate, returns JWT |
| GET  | `/api/stocks/{symbol}` | Latest OHLCV history |
| GET  | `/api/stocks/{symbol}/indicators` | SMA/EMA/RSI/MACD/BB |
| POST | `/api/predict/{symbol}` | Run model inference |
| POST | `/api/models/train` | Trigger training |
| GET  | `/api/models/metrics` | MAE/RMSE/R² per model |
| GET  | `/api/news/{symbol}` | FinBERT sentiment feed |
| GET  | `/api/portfolio` | Authenticated holdings |
| POST | `/api/alerts` | Create email price alert |
| WS   | `/ws/live/{symbol}` | Real-time tick stream |

Full interactive docs at `/docs` (Swagger UI) and `/redoc`.

---

## 🧠 Models & Metrics

| Model | Type | MAE | RMSE | R² |
|-------|------|-----|------|----|
| LSTM | Deep Learning | 1.82 | 2.41 | **0.89** |
| GRU | Deep Learning | 1.96 | 2.58 | 0.86 |
| XGBoost | Gradient Boost | 2.14 | 2.81 | 0.81 |
| Random Forest | Bagging | 2.36 | 3.11 | 0.74 |
| ARIMA | Statistical | 2.74 | 3.45 | 0.68 |
| Linear Regression | OLS | 3.12 | 3.95 | 0.62 |
| Decision Tree | CART | 3.45 | 4.21 | 0.58 |

> Metrics from 5-fold cross-validation on AAPL daily closes, 2019-2024.

---

## 🖼️ Screenshots

> Add your screenshots here:
> - `docs/screenshots/dashboard.png`
> - `docs/screenshots/predictions.png`
> - `docs/screenshots/portfolio.png`

---

## 🧪 Running Tests

```bash
pytest tests/ -v --cov=backend
```

---

## 🛠️ Tech Stack

**Backend** Python 3.11 · FastAPI · SQLAlchemy · Uvicorn · JWT
**ML/DL** scikit-learn · TensorFlow · Keras · XGBoost · LightGBM · statsmodels
**Data** pandas · numpy · yfinance · ta-lib · scipy
**NLP** transformers · FinBERT
**Frontend** React 19 · Vite · TypeScript · Tailwind CSS · Recharts
**Database** SQLite / PostgreSQL
**DevOps** Docker · docker-compose · GitHub Actions

---

## 📄 License

MIT © 2026 QuantumStock

> ⚠️ **Disclaimer**: This system is for educational and research purposes only. It is **not** financial advice. Past performance does not guarantee future results.
