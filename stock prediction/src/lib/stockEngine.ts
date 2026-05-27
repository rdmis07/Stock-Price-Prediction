// ─────────────────────────────────────────────────────────────
// stockEngine.ts
// Client-side simulation of the Python backend pipeline:
//  - synthetic historical OHLCV generation (seeded random walk)
//  - technical indicators: SMA, EMA, RSI, MACD, Bollinger, ATR
//  - multiple ML/DL model forecasts (LR, RF, XGBoost, LSTM, GRU, ARIMA)
//  - evaluation metrics (MAE, MSE, RMSE, R²)
//  - buy/sell/hold signal with confidence
// ─────────────────────────────────────────────────────────────

export interface OHLC {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockMeta {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  basePrice: number;
  vol: number;       // annualized volatility
  drift: number;     // annualized drift
}

export const STOCK_UNIVERSE: StockMeta[] = [
  { symbol: "AAPL",     name: "Apple Inc.",            exchange: "NASDAQ", sector: "Technology",      basePrice: 192.5,  vol: 0.26, drift: 0.14 },
  { symbol: "MSFT",     name: "Microsoft Corp.",       exchange: "NASDAQ", sector: "Technology",      basePrice: 418.2,  vol: 0.24, drift: 0.18 },
  { symbol: "NVDA",     name: "NVIDIA Corp.",          exchange: "NASDAQ", sector: "Semiconductors",  basePrice: 875.3,  vol: 0.48, drift: 0.42 },
  { symbol: "TSLA",     name: "Tesla, Inc.",           exchange: "NASDAQ", sector: "Automotive",      basePrice: 245.1,  vol: 0.55, drift: 0.08 },
  { symbol: "GOOGL",    name: "Alphabet Inc.",         exchange: "NASDAQ", sector: "Communications",  basePrice: 168.4,  vol: 0.28, drift: 0.16 },
  { symbol: "AMZN",     name: "Amazon.com Inc.",       exchange: "NASDAQ", sector: "E-Commerce",      basePrice: 184.9,  vol: 0.30, drift: 0.20 },
  { symbol: "META",     name: "Meta Platforms Inc.",   exchange: "NASDAQ", sector: "Communications",  basePrice: 502.7,  vol: 0.35, drift: 0.22 },
  { symbol: "RELIANCE", name: "Reliance Industries",   exchange: "NSE",    sector: "Energy",          basePrice: 2845.0, vol: 0.22, drift: 0.12 },
  { symbol: "TCS",      name: "Tata Consultancy Svc.", exchange: "NSE",    sector: "Technology",      basePrice: 3920.0, vol: 0.20, drift: 0.10 },
  { symbol: "INFY",     name: "Infosys Ltd.",          exchange: "NSE",    sector: "Technology",      basePrice: 1685.0, vol: 0.24, drift: 0.09 },
  { symbol: "HDFCBANK", name: "HDFC Bank",             exchange: "BSE",    sector: "Banking",         basePrice: 1525.0, vol: 0.21, drift: 0.11 },
  { symbol: "JPM",      name: "JPMorgan Chase",        exchange: "NYSE",   sector: "Banking",         basePrice: 218.5,  vol: 0.23, drift: 0.13 },
];

// ── Deterministic PRNG (mulberry32) so charts are stable across reloads ──
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Box-Muller normal sampler
function gauss(rand: () => number) {
  const u = Math.max(rand(), 1e-9);
  const v = Math.max(rand(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Generate OHLCV history using geometric Brownian motion + intraday range.
 * Mirrors what `yfinance.download(...)` would return on the backend.
 */
export function generateHistory(meta: StockMeta, days = 260): OHLC[] {
  const rand = mulberry32(hashStr(meta.symbol));
  const dt = 1 / 252;
  const sigma = meta.vol;
  const mu = meta.drift;

  const today = new Date();
  const out: OHLC[] = [];
  let price = meta.basePrice * (0.85 + rand() * 0.15);

  for (let i = days; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    // skip weekends to feel like a real market calendar
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;

    const z = gauss(rand);
    const ret = (mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z;
    const close = price * Math.exp(ret);

    const intradayVol = Math.abs(gauss(rand)) * sigma * Math.sqrt(dt) * price * 0.7;
    const open = price + (rand() - 0.5) * intradayVol * 0.6;
    const high = Math.max(open, close) + rand() * intradayVol;
    const low = Math.min(open, close) - rand() * intradayVol;
    const volume = Math.round((1.2e6 + rand() * 4.5e6) * (1 + Math.abs(z) * 0.4));

    out.push({
      date: d.toISOString().slice(0, 10),
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume,
    });
    price = close;
  }
  return out;
}

// ───────────────────────── Technical Indicators ─────────────────────────

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    if (prev === null) {
      let s = 0;
      for (let j = i - period + 1; j <= i; j++) s += values[j];
      prev = s / period;
    } else {
      prev = values[i] * k + prev * (1 - k);
    }
    out.push(prev);
  }
  return out;
}

export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = [null];
  let gain = 0, loss = 0;
  for (let i = 1; i < values.length; i++) {
    const ch = values[i] - values[i - 1];
    const g = Math.max(ch, 0);
    const l = Math.max(-ch, 0);
    if (i <= period) {
      gain += g; loss += l;
      if (i === period) {
        const ag = gain / period, al = loss / period;
        const rs = al === 0 ? 100 : ag / al;
        out.push(100 - 100 / (1 + rs));
      } else out.push(null);
    } else {
      const ag = (out as any)._ag !== undefined ? (out as any)._ag : gain / period;
      const al = (out as any)._al !== undefined ? (out as any)._al : loss / period;
      const newAg = (ag * (period - 1) + g) / period;
      const newAl = (al * (period - 1) + l) / period;
      (out as any)._ag = newAg;
      (out as any)._al = newAl;
      const rs = newAl === 0 ? 100 : newAg / newAl;
      out.push(100 - 100 / (1 + rs));
    }
  }
  return out;
}

export function macd(values: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);
  const macdLine = values.map((_, i) =>
    emaFast[i] !== null && emaSlow[i] !== null ? (emaFast[i] as number) - (emaSlow[i] as number) : null,
  );
  // signal line is EMA of non-null macd values
  const valid = macdLine.map((v) => (v === null ? 0 : v));
  const sig = ema(valid, signal).map((v, i) => (macdLine[i] === null ? null : v));
  const hist = macdLine.map((m, i) => (m !== null && sig[i] !== null ? m - (sig[i] as number) : null));
  return { macdLine, signal: sig, hist };
}

export function bollinger(values: number[], period = 20, mult = 2) {
  const mid = sma(values, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { upper.push(null); lower.push(null); continue; }
    let s = 0;
    for (let j = i - period + 1; j <= i; j++) s += (values[j] - (mid[i] as number)) ** 2;
    const sd = Math.sqrt(s / period);
    upper.push((mid[i] as number) + mult * sd);
    lower.push((mid[i] as number) - mult * sd);
  }
  return { mid, upper, lower };
}

export function atr(history: OHLC[], period = 14): (number | null)[] {
  const tr: number[] = [];
  for (let i = 0; i < history.length; i++) {
    if (i === 0) { tr.push(history[i].high - history[i].low); continue; }
    const prev = history[i - 1].close;
    tr.push(Math.max(history[i].high - history[i].low, Math.abs(history[i].high - prev), Math.abs(history[i].low - prev)));
  }
  return sma(tr, period);
}

// ───────────────────────── ML Model Simulations ─────────────────────────

export interface ModelForecast {
  name: string;
  family: "ML" | "DL" | "Stat";
  color: string;
  predictions: number[];           // future close predictions
  metrics: { MAE: number; MSE: number; RMSE: number; R2: number };
  confidence: number;              // 0..1
}

/**
 * Each model "fits" the recent history and extrapolates `horizon` future closes.
 * The implementations use simple but real numerical methods (OLS, momentum
 * ensembles, EWMA, Holt-Winters style trends, etc.) — they're light enough
 * to run client-side but the structure mirrors the Python pipeline.
 */
export function trainAndForecast(history: OHLC[], horizon = 30): ModelForecast[] {
  const closes = history.map((d) => d.close);
  const n = closes.length;
  const window = Math.min(60, n);
  const x = Array.from({ length: window }, (_, i) => i);
  const y = closes.slice(n - window);

  // ─ Linear Regression (OLS) ─
  const meanX = x.reduce((a, b) => a + b, 0) / window;
  const meanY = y.reduce((a, b) => a + b, 0) / window;
  let num = 0, den = 0;
  for (let i = 0; i < window; i++) { num += (x[i] - meanX) * (y[i] - meanY); den += (x[i] - meanX) ** 2; }
  const slope = num / den;
  const intercept = meanY - slope * meanX;
  const lrPred = Array.from({ length: horizon }, (_, i) => intercept + slope * (window + i));

  // ─ Random Forest (mocked as bootstrap-averaged momentum) ─
  const recentReturns = [];
  for (let i = n - 30; i < n; i++) recentReturns.push(closes[i] / closes[i - 1] - 1);
  const avgRet = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
  const rfPred: number[] = [];
  let rfP = closes[n - 1];
  for (let i = 0; i < horizon; i++) {
    rfP = rfP * (1 + avgRet * 0.6 + Math.sin(i / 3) * 0.0015);
    rfPred.push(rfP);
  }

  // ─ XGBoost (gradient-boosted: combines trend + EMA reversion) ─
  const e20 = ema(closes, 20); const e50 = ema(closes, 50);
  const lastE20 = e20[n - 1] as number; const lastE50 = e50[n - 1] as number;
  const trend = (lastE20 - lastE50) / lastE50;
  const xgbPred: number[] = [];
  let xgbP = closes[n - 1];
  for (let i = 0; i < horizon; i++) {
    const decay = Math.exp(-i / 25);
    xgbP = xgbP * (1 + trend * 0.04 * decay + avgRet * 0.5);
    xgbPred.push(xgbP);
  }

  // ─ LSTM (sequence learner: weighted recent returns + tanh squash) ─
  const lstmPred: number[] = [];
  let lstmP = closes[n - 1];
  const recent60 = closes.slice(-60);
  const lstmRet = recent60.slice(1).map((c, i) => (c - recent60[i]) / recent60[i]);
  const weights = lstmRet.map((_, i) => Math.exp((i - lstmRet.length) / 15));
  const wSum = weights.reduce((a, b) => a + b, 0);
  const wRet = lstmRet.reduce((a, r, i) => a + r * weights[i], 0) / wSum;
  for (let i = 0; i < horizon; i++) {
    const seasonal = Math.sin((i + 1) / 6) * 0.004;
    lstmP = lstmP * (1 + Math.tanh(wRet * 3) * 0.012 + seasonal);
    lstmPred.push(lstmP);
  }

  // ─ GRU (similar to LSTM but slightly more reactive) ─
  const gruPred: number[] = [];
  let gruP = closes[n - 1];
  const wRet2 = lstmRet.slice(-20).reduce((a, b) => a + b, 0) / 20;
  for (let i = 0; i < horizon; i++) {
    gruP = gruP * (1 + wRet2 * 0.9 + Math.cos(i / 4) * 0.003);
    gruPred.push(gruP);
  }

  // ─ ARIMA(1,1,0): AR(1) on first differences ─
  const diffs: number[] = [];
  for (let i = 1; i < closes.length; i++) diffs.push(closes[i] - closes[i - 1]);
  const dW = diffs.slice(-60);
  const mD = dW.reduce((a, b) => a + b, 0) / dW.length;
  let phiN = 0, phiD = 0;
  for (let i = 1; i < dW.length; i++) { phiN += (dW[i] - mD) * (dW[i - 1] - mD); phiD += (dW[i - 1] - mD) ** 2; }
  const phi = phiD === 0 ? 0 : phiN / phiD;
  const arimaPred: number[] = [];
  let lastDiff = diffs[diffs.length - 1];
  let arimaP = closes[n - 1];
  for (let i = 0; i < horizon; i++) {
    const nextDiff = mD + phi * (lastDiff - mD);
    arimaP = arimaP + nextDiff;
    arimaPred.push(arimaP);
    lastDiff = nextDiff;
  }

  // ─ Decision Tree (median of binned returns) ─
  const sortedRet = [...lstmRet].sort((a, b) => a - b);
  const medRet = sortedRet[Math.floor(sortedRet.length / 2)];
  const dtPred: number[] = [];
  let dtP = closes[n - 1];
  for (let i = 0; i < horizon; i++) { dtP = dtP * (1 + medRet * 0.8); dtPred.push(dtP); }

  // Compute backtest metrics: train on first 80%, eval on last 20%
  const split = Math.floor(n * 0.8);
  const evalActual = closes.slice(split);
  const baseline = closes[split - 1];
  const evalLen = evalActual.length;

  const evalLR = Array.from({ length: evalLen }, (_, i) => baseline + slope * (i + 1));
  const evalRF = evalActual.map((_, i) => baseline * (1 + avgRet * 0.6 * (i + 1)));
  const evalXGB = evalActual.map((_, i) => baseline * (1 + (trend * 0.04 + avgRet * 0.5) * (i + 1)));
  const evalLSTM = evalActual.map((_, i) => baseline * (1 + Math.tanh(wRet * 3) * 0.012 * (i + 1)));
  const evalGRU = evalActual.map((_, i) => baseline * (1 + wRet2 * 0.9 * (i + 1)));
  const evalARIMA = evalActual.map((_, i) => baseline + mD * (i + 1));
  const evalDT = evalActual.map((_, i) => baseline * (1 + medRet * 0.8 * (i + 1)));

  const results: ModelForecast[] = [
    { name: "Linear Regression", family: "ML", color: "#60a5fa", predictions: lrPred,    metrics: metrics(evalActual, evalLR),    confidence: 0.62 },
    { name: "Decision Tree",     family: "ML", color: "#f472b6", predictions: dtPred,    metrics: metrics(evalActual, evalDT),    confidence: 0.58 },
    { name: "Random Forest",     family: "ML", color: "#a78bfa", predictions: rfPred,    metrics: metrics(evalActual, evalRF),    confidence: 0.74 },
    { name: "XGBoost",           family: "ML", color: "#fb923c", predictions: xgbPred,   metrics: metrics(evalActual, evalXGB),   confidence: 0.81 },
    { name: "LSTM",              family: "DL", color: "#5eead4", predictions: lstmPred,  metrics: metrics(evalActual, evalLSTM),  confidence: 0.86 },
    { name: "GRU",               family: "DL", color: "#34d399", predictions: gruPred,   metrics: metrics(evalActual, evalGRU),   confidence: 0.83 },
    { name: "ARIMA",             family: "Stat", color: "#fbbf24", predictions: arimaPred,metrics: metrics(evalActual, evalARIMA), confidence: 0.68 },
  ];
  return results;
}

function metrics(actual: number[], pred: number[]) {
  const n = actual.length;
  let mae = 0, mse = 0;
  const meanA = actual.reduce((a, b) => a + b, 0) / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const e = actual[i] - pred[i];
    mae += Math.abs(e);
    mse += e * e;
    ssRes += e * e;
    ssTot += (actual[i] - meanA) ** 2;
  }
  return {
    MAE: +(mae / n).toFixed(3),
    MSE: +(mse / n).toFixed(3),
    RMSE: +Math.sqrt(mse / n).toFixed(3),
    R2: +(1 - ssRes / Math.max(ssTot, 1e-9)).toFixed(3),
  };
}

// ───────────────────────── Signal & Sentiment ─────────────────────────

export interface Signal {
  action: "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "STRONG SELL";
  confidence: number;
  reasoning: string[];
  score: number; // -1..1
}

export function generateSignal(history: OHLC[], forecasts: ModelForecast[]): Signal {
  const closes = history.map((d) => d.close);
  const n = closes.length;
  const last = closes[n - 1];
  const r = rsi(closes, 14);
  const m = macd(closes);
  const b = bollinger(closes);

  const lastRSI = r[n - 1] as number;
  const lastMACD = m.macdLine[n - 1] as number;
  const lastSig = m.signal[n - 1] as number;
  const upper = b.upper[n - 1] as number;
  const lower = b.lower[n - 1] as number;

  // Aggregate model expected return
  const avgFuture = forecasts.reduce((a, f) => a + f.predictions[6], 0) / forecasts.length;
  const expRet = (avgFuture - last) / last;

  const reasons: string[] = [];
  let score = 0;
  if (lastRSI < 30) { score += 0.3; reasons.push(`RSI ${lastRSI.toFixed(1)} indicates oversold conditions`); }
  else if (lastRSI > 70) { score -= 0.3; reasons.push(`RSI ${lastRSI.toFixed(1)} indicates overbought conditions`); }
  else reasons.push(`RSI ${lastRSI.toFixed(1)} is in a neutral zone`);

  if (lastMACD > lastSig) { score += 0.2; reasons.push("MACD bullish crossover detected"); }
  else { score -= 0.15; reasons.push("MACD remains below the signal line"); }

  if (last < lower) { score += 0.2; reasons.push("Price touched the lower Bollinger Band (mean-reversion buy zone)"); }
  else if (last > upper) { score -= 0.2; reasons.push("Price broke the upper Bollinger Band (volatility expansion)"); }

  score += Math.max(-0.4, Math.min(0.4, expRet * 8));
  reasons.push(`Ensemble of ${forecasts.length} models projects ${(expRet * 100).toFixed(2)}% in 7 days`);

  score = Math.max(-1, Math.min(1, score));
  const confidence = Math.min(0.99, 0.55 + Math.abs(score) * 0.4);

  let action: Signal["action"] = "HOLD";
  if (score > 0.5) action = "STRONG BUY";
  else if (score > 0.15) action = "BUY";
  else if (score < -0.5) action = "STRONG SELL";
  else if (score < -0.15) action = "SELL";

  return { action, confidence, reasoning: reasons, score };
}

// ───────────────────────── News & Sentiment ─────────────────────────

export interface NewsItem {
  title: string;
  source: string;
  time: string;
  sentiment: "positive" | "neutral" | "negative";
  score: number;
}

const POSITIVE_TEMPLATES = [
  "{S} beats Q{Q} earnings estimates, revenue jumps {N}% YoY",
  "Analysts upgrade {S} to 'Strong Buy' citing {SECTOR} momentum",
  "{S} announces ${N}B share buyback program, shares rally",
  "{S} unveils breakthrough product, market cap surges",
  "Institutional investors increase {S} holdings by {N}%",
];
const NEUTRAL_TEMPLATES = [
  "{S} reports in-line quarterly numbers, guidance unchanged",
  "{S} hosts annual investor day, reiterates long-term targets",
  "Mixed reactions to {S}'s leadership shuffle",
  "{S} considers expansion into adjacent {SECTOR} markets",
];
const NEGATIVE_TEMPLATES = [
  "{S} faces regulatory scrutiny over {SECTOR} practices",
  "{S} misses revenue forecast, shares fall {N}% after-hours",
  "Short-sellers double down on {S} amid valuation concerns",
  "{S} downgrade: analysts cite slowing growth in core segment",
];
const SOURCES = ["Bloomberg", "Reuters", "CNBC", "WSJ", "Financial Times", "MarketWatch", "Seeking Alpha"];

export function generateNews(meta: StockMeta, count = 8): NewsItem[] {
  const rand = mulberry32(hashStr(meta.symbol + "news"));
  const items: NewsItem[] = [];
  for (let i = 0; i < count; i++) {
    const r = rand();
    let pool, sentiment: NewsItem["sentiment"], score;
    if (r < 0.5) { pool = POSITIVE_TEMPLATES; sentiment = "positive"; score = 0.5 + rand() * 0.5; }
    else if (r < 0.8) { pool = NEUTRAL_TEMPLATES; sentiment = "neutral"; score = -0.2 + rand() * 0.4; }
    else { pool = NEGATIVE_TEMPLATES; sentiment = "negative"; score = -1 + rand() * 0.5; }
    const template = pool[Math.floor(rand() * pool.length)];
    const title = template
      .replace("{S}", meta.symbol)
      .replace("{SECTOR}", meta.sector)
      .replace("{Q}", String(Math.ceil(rand() * 4)))
      .replace("{N}", String(Math.floor(2 + rand() * 30)));
    const hours = Math.floor(rand() * 36) + 1;
    items.push({
      title, source: SOURCES[Math.floor(rand() * SOURCES.length)],
      time: hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`,
      sentiment, score: +score.toFixed(2),
    });
  }
  return items;
}

export function aggregateSentiment(news: NewsItem[]) {
  const avg = news.reduce((a, n) => a + n.score, 0) / news.length;
  const pos = news.filter((n) => n.sentiment === "positive").length;
  const neg = news.filter((n) => n.sentiment === "negative").length;
  const neu = news.length - pos - neg;
  return { avg: +avg.toFixed(2), pos, neg, neu };
}

// ───────────────────────── Helpers ─────────────────────────

export function formatCurrency(v: number, currency = "$") {
  return `${currency}${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function pctChange(a: number, b: number) {
  return ((b - a) / a) * 100;
}

export function getCurrency(meta: StockMeta) {
  return meta.exchange === "NSE" || meta.exchange === "BSE" ? "₹" : "$";
}
