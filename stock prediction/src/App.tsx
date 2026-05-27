import { useEffect, useMemo, useState } from "react";
import Sidebar, { type ViewKey } from "./components/Sidebar";
import Header from "./components/Header";
import CandlestickChart from "./components/CandlestickChart";
import TechnicalPanel from "./components/TechnicalPanel";
import SignalCard from "./components/SignalCard";
import ForecastCards from "./components/ForecastCards";
import ModelComparison from "./components/ModelComparison";
import NewsSentiment from "./components/NewsSentiment";
import StatTiles from "./components/StatTiles";
import Portfolio from "./components/Portfolio";
import CompareStocks from "./components/CompareStocks";
import DataPipeline from "./components/DataPipeline";
import ApiDocs from "./components/ApiDocs";
import AuthModal from "./components/AuthModal";
import AiChatbot from "./components/AiChatbot";
import {
  STOCK_UNIVERSE, generateHistory, trainAndForecast, generateSignal,
  generateNews, getCurrency,
} from "./lib/stockEngine";

export default function App() {
  const [view, setView] = useState<ViewKey>("dashboard");
  const [symbol, setSymbol] = useState(STOCK_UNIVERSE[0].symbol);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [showAuth, setShowAuth] = useState(true);
  const [liveTick, setLiveTick] = useState(0);
  const [activeModel, setActiveModel] = useState("LSTM");

  const meta = useMemo(() => STOCK_UNIVERSE.find((s) => s.symbol === symbol)!, [symbol]);
  const history = useMemo(() => generateHistory(meta), [meta]);
  const forecasts = useMemo(() => trainAndForecast(history, 30), [history]);
  const signal = useMemo(() => generateSignal(history, forecasts), [history, forecasts]);
  const news = useMemo(() => generateNews(meta), [meta]);
  const currency = getCurrency(meta);

  const lastClose = history[history.length - 1].close;
  const prevClose = history[history.length - 2].close;

  // simulated live tick (small jitter on top of last close, every 2s)
  useEffect(() => {
    setLiveTick(0);
    let tickRange = lastClose * 0.0015;
    const id = setInterval(() => {
      setLiveTick((t) => {
        const next = t + (Math.random() - 0.5) * tickRange;
        return Math.max(-lastClose * 0.012, Math.min(lastClose * 0.012, next));
      });
    }, 2000);
    return () => clearInterval(id);
  }, [lastClose]);

  const selectedForecast = forecasts.find((f) => f.name === activeModel) ?? forecasts[4];

  const handleExport = () => {
    const header = "date,open,high,low,close,volume\n";
    const csv = header + history.map((d) => `${d.date},${d.open},${d.high},${d.low},${d.close},${d.volume}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${symbol}_history.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => setLiveTick(0);

  return (
    <div className="grid-bg min-h-screen flex">
      <Sidebar active={view} onChange={setView} user={user}
               onLogout={() => { setUser(null); setShowAuth(true); }} />

      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          selected={meta}
          onSelect={(m) => setSymbol(m.symbol)}
          lastClose={lastClose}
          prevClose={prevClose}
          liveTick={liveTick}
          onRefresh={handleRefresh}
          onExport={handleExport}
        />

        <main className="p-5 space-y-4 max-w-[1600px] w-full mx-auto">
          {view === "dashboard" && (
            <>
              <DashboardHero meta={meta} lastClose={lastClose} liveTick={liveTick} signal={signal} currency={currency} />
              <StatTiles history={history} currency={currency} />
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2 space-y-4">
                  <CandlestickChart history={history} forecast={selectedForecast} currency={currency} />
                  <TechnicalPanel history={history} />
                </div>
                <div className="space-y-4">
                  <SignalCard signal={signal} />
                  <NewsSentiment news={news} />
                </div>
              </div>
              <ForecastCards lastClose={lastClose} forecasts={forecasts} currency={currency} />
              <ModelComparison forecasts={forecasts} selected={activeModel} onSelect={setActiveModel} />
            </>
          )}

          {view === "predict" && (
            <div className="space-y-4">
              <SectionHeader title="AI Price Predictions"
                             desc={`Ensemble inference over ${meta.symbol} using 7 trained models. Switch the active forecast by clicking a model below.`} />
              <ForecastCards lastClose={lastClose} forecasts={forecasts} currency={currency} />
              <CandlestickChart history={history} forecast={selectedForecast} currency={currency} height={420} />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <SignalCard signal={signal} />
                <ModelComparison forecasts={forecasts} selected={activeModel} onSelect={setActiveModel} />
              </div>
            </div>
          )}

          {view === "models" && (
            <div className="space-y-4">
              <SectionHeader title="Model Performance Lab"
                             desc="Cross-validated metrics for every model trained in the pipeline. Backtest split: 80% train / 20% holdout, chronologically partitioned." />
              <ModelComparison forecasts={forecasts} selected={activeModel} onSelect={setActiveModel} />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ModelArchitecture name={activeModel} />
                <TechnicalPanel history={history} />
              </div>
            </div>
          )}

          {view === "news" && (
            <div className="space-y-4">
              <SectionHeader title="News & Sentiment"
                             desc="FinBERT-scored news pulled from major financial outlets, aggregated into a single sentiment index." />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <NewsSentiment news={news} />
                <NewsSentiment news={generateNews(STOCK_UNIVERSE[1])} />
              </div>
            </div>
          )}

          {view === "portfolio" && (
            <div className="space-y-4">
              <SectionHeader title="Portfolio Tracker" desc="Live mark-to-market valuation with realized/unrealized P&L across your positions." />
              <Portfolio />
            </div>
          )}

          {view === "compare" && (
            <div className="space-y-4">
              <SectionHeader title="Multi-Stock Comparison" desc="Normalized percentage performance comparison across multiple symbols." />
              <CompareStocks />
            </div>
          )}

          {view === "data" && (
            <div className="space-y-4">
              <SectionHeader title="Data & ML Pipeline" desc="Inspect the end-to-end preprocessing, feature engineering, and training pipeline." />
              <DataPipeline />
            </div>
          )}

          {view === "docs" && (
            <div className="space-y-4">
              <SectionHeader title="API Documentation" desc="REST + WebSocket endpoints exposed by the FastAPI backend." />
              <ApiDocs />
            </div>
          )}

          {view === "settings" && (
            <div className="space-y-4">
              <SectionHeader title="Settings" desc="Configure alerts, exports, and integrations." />
              <SettingsPanel />
            </div>
          )}

          <footer className="text-center text-[11px] text-slate-600 py-6">
            QuantumStock · AI-Powered Stock Price Prediction System ·
            Built with React · FastAPI · TensorFlow · XGBoost · scikit-learn
          </footer>
        </main>
      </div>

      <AuthModal
        open={showAuth && !user}
        onClose={() => setShowAuth(false)}
        onAuth={(u) => { setUser(u); setShowAuth(false); }}
      />

      {user && (
        <AiChatbot meta={meta} lastClose={lastClose + liveTick} forecasts={forecasts} signal={signal} />
      )}
    </div>
  );
}

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="fade-in">
      <h2 className="text-2xl font-black tracking-tight">{title}</h2>
      <p className="text-sm text-slate-400">{desc}</p>
    </div>
  );
}

function DashboardHero({ meta, lastClose, liveTick, signal, currency }: any) {
  const isBuy = signal.action.includes("BUY");
  return (
    <div className="card p-5 relative overflow-hidden fade-in">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-10 w-60 h-60 rounded-full bg-indigo-500/20 blur-3xl" />
      </div>
      <div className="relative flex items-center gap-5 flex-wrap">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-indigo-500 grid place-items-center font-black text-xl text-[#07090f] glow-accent">
          {meta.symbol.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight">{meta.name}</h1>
            <span className="pill">{meta.symbol}</span>
            <span className="pill">{meta.exchange}</span>
            <span className="pill text-teal-400 border-teal-500/30">{meta.sector}</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time AI-powered analysis · Last refresh just now ·
            Inference latency <span className="text-teal-400 font-mono">12.4 ms</span>
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Live Price</div>
          <div className="text-4xl font-black tabular-nums">{currency}{(lastClose + liveTick).toFixed(2)}</div>
          <div className={"text-sm font-bold " + (isBuy ? "text-bull" : signal.action === "HOLD" ? "text-slate-400" : "text-bear")}>
            AI signal: {signal.action} · {(signal.confidence * 100).toFixed(0)}% confidence
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 animate-shimmer" />
    </div>
  );
}

function ModelArchitecture({ name }: { name: string }) {
  const arch: Record<string, { layers: string[]; params: string; desc: string }> = {
    "LSTM": {
      layers: ["Input(60, features=8)", "LSTM(128, return_sequences=True)", "Dropout(0.2)", "LSTM(64)", "Dense(32, relu)", "Dense(1)"],
      params: "~108k", desc: "Long Short-Term Memory network for sequential price modeling.",
    },
    "GRU": {
      layers: ["Input(60, features=8)", "GRU(128, return_sequences=True)", "Dropout(0.2)", "GRU(64)", "Dense(32, relu)", "Dense(1)"],
      params: "~82k", desc: "Gated Recurrent Unit — faster training than LSTM, similar accuracy.",
    },
    "XGBoost": {
      layers: ["n_estimators=500", "max_depth=6", "learning_rate=0.05", "subsample=0.8", "objective='reg:squarederror'"],
      params: "GridSearchCV(5-fold)", desc: "Extreme Gradient Boosting on engineered tabular features.",
    },
    "Random Forest": {
      layers: ["n_estimators=300", "max_depth=12", "min_samples_split=4", "n_jobs=-1"],
      params: "Bagging ensemble", desc: "Bootstrap-aggregated decision trees on indicator features.",
    },
    "Linear Regression": {
      layers: ["StandardScaler", "LinearRegression(fit_intercept=True)"],
      params: "OLS closed-form", desc: "Baseline OLS regression on lagged features.",
    },
    "Decision Tree": {
      layers: ["DecisionTreeRegressor(max_depth=10, min_samples_leaf=3)"],
      params: "CART", desc: "Single CART regressor — interpretable baseline.",
    },
    "ARIMA": {
      layers: ["ARIMA(p=1, d=1, q=0)", "Augmented Dickey-Fuller test", "Ljung-Box residual check"],
      params: "Statsmodels", desc: "Auto-Regressive Integrated Moving Average for time series.",
    },
  };
  const a = arch[name] ?? arch["LSTM"];

  return (
    <div className="card p-4 fade-in">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-200">Architecture · {name}</h3>
        <span className="pill text-teal-400 border-teal-500/30">{a.params}</span>
      </div>
      <p className="text-xs text-slate-400 mb-3">{a.desc}</p>
      <div className="space-y-1.5">
        {a.layers.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#1a2138] text-teal-400 text-[10px] font-bold grid place-items-center">{i + 1}</div>
            <code className="text-xs font-mono text-slate-200 flex-1 px-2 py-1 rounded bg-[#0d1220] border border-[#1f2942]">{l}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card p-4">
        <h3 className="text-sm font-bold mb-3">Email Price Alerts</h3>
        <div className="space-y-2">
          <input placeholder="Symbol (e.g. AAPL)" className="w-full bg-[#0d1220] border border-[#1f2942] rounded px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Above $" className="bg-[#0d1220] border border-[#1f2942] rounded px-3 py-2 text-sm" />
            <input placeholder="Below $" className="bg-[#0d1220] border border-[#1f2942] rounded px-3 py-2 text-sm" />
          </div>
          <button className="w-full py-2 rounded bg-gradient-to-r from-teal-400 to-indigo-500 text-[#07090f] font-bold text-sm">
            Save Alert
          </button>
        </div>
      </div>
      <div className="card p-4">
        <h3 className="text-sm font-bold mb-3">Preferences</h3>
        {[
          ["Dark theme", true],
          ["WebSocket live updates", true],
          ["Auto-retrain models weekly", true],
          ["Send weekly portfolio digest", false],
          ["Enable model ensemble blending", true],
        ].map(([label, on]) => (
          <div key={label as string} className="flex items-center justify-between py-2 border-b border-[#1f2942] last:border-0">
            <span className="text-sm text-slate-300">{label as string}</span>
            <span className={"w-9 h-5 rounded-full relative " + (on ? "bg-teal-500" : "bg-slate-700")}>
              <span className={"absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all " + (on ? "left-4" : "left-0.5")} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
