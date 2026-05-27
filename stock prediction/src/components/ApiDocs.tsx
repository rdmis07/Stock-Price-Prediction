import { Code2, Lock } from "lucide-react";

const ENDPOINTS = [
  { method: "POST", path: "/api/auth/signup", desc: "Register a new user (JWT issued)", auth: false },
  { method: "POST", path: "/api/auth/login",  desc: "Authenticate and receive JWT access token", auth: false },
  { method: "GET",  path: "/api/stocks/:symbol", desc: "Fetch latest OHLCV history via yfinance", auth: true },
  { method: "GET",  path: "/api/stocks/:symbol/indicators", desc: "Compute SMA / EMA / RSI / MACD / BB", auth: true },
  { method: "POST", path: "/api/predict/:symbol", desc: "Run inference across all trained models", auth: true },
  { method: "POST", path: "/api/models/train",  desc: "Trigger model training pipeline", auth: true },
  { method: "GET",  path: "/api/models/metrics", desc: "Retrieve MAE / RMSE / R² for each model", auth: true },
  { method: "GET",  path: "/api/news/:symbol",  desc: "FinBERT-scored news sentiment feed", auth: true },
  { method: "GET",  path: "/api/portfolio",     desc: "List authenticated user's holdings", auth: true },
  { method: "POST", path: "/api/alerts",        desc: "Create email price alert", auth: true },
  { method: "WS",   path: "/ws/live/:symbol",   desc: "WebSocket: real-time tick stream", auth: true },
];

const SAMPLE = `curl -X POST https://api.quantumstock.io/api/predict/AAPL \\
  -H "Authorization: Bearer <JWT>" \\
  -H "Content-Type: application/json" \\
  -d '{"horizon": 30, "model": "lstm"}'

# Response
{
  "symbol": "AAPL",
  "model": "lstm",
  "horizon": 30,
  "predictions": [193.42, 194.10, 194.87, ...],
  "confidence": 0.86,
  "signal": "BUY",
  "generated_at": "2026-04-12T14:23:11Z"
}`;

export default function ApiDocs() {
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Code2 className="w-4 h-4 text-teal-400" />
          <h3 className="text-sm font-bold text-slate-200">REST & WebSocket API</h3>
          <span className="pill ml-auto">FastAPI · JWT · OpenAPI 3.1</span>
        </div>
        <div className="space-y-1.5">
          {ENDPOINTS.map((e) => (
            <div key={e.path} className="flex items-center gap-3 p-2.5 rounded-lg border border-[#1f2942] hover:bg-[#131a2c] transition-colors">
              <span className={
                "w-12 text-center text-[10px] font-bold px-2 py-1 rounded " +
                (e.method === "GET"  ? "bg-emerald-500/10 text-bull" :
                 e.method === "POST" ? "bg-indigo-500/10 text-indigo-300" :
                 "bg-amber-500/10 text-amber-400")
              }>{e.method}</span>
              <code className="text-xs font-mono text-slate-200">{e.path}</code>
              <span className="text-xs text-slate-500 flex-1 truncate">{e.desc}</span>
              {e.auth && <Lock className="w-3.5 h-3.5 text-slate-500" />}
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-bold text-slate-200 mb-3">Try it</h3>
        <pre className="text-[11px] bg-[#07090f] border border-[#1f2942] rounded-lg p-3 overflow-auto leading-relaxed">
          <code className="text-slate-300 whitespace-pre">{SAMPLE}</code>
        </pre>
      </div>
    </div>
  );
}
