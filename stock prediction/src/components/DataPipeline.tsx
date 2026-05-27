import { Database, CheckCircle2, ArrowRight, Layers, Cpu, Sparkles, GitBranch } from "lucide-react";

const STAGES = [
  { icon: Database, title: "Live Data Fetch", desc: "yfinance · NSE / BSE / NASDAQ / NYSE", count: "12 symbols · 5y window" },
  { icon: Layers,   title: "Preprocessing",   desc: "Missing-value imputation · MinMax / Standard scaling", count: "Pipeline(steps=4)" },
  { icon: Sparkles, title: "Feature Eng.",    desc: "SMA · EMA · RSI · MACD · BB · ATR · Lag features", count: "32 features" },
  { icon: GitBranch,title: "Train / Test Split", desc: "Time-series chronological split (80/20)", count: "stratified=False" },
  { icon: Cpu,      title: "Model Training",  desc: "LR · DT · RF · XGBoost · LSTM · GRU · ARIMA", count: "7 models · GridSearchCV" },
  { icon: CheckCircle2, title: "Eval & Serve", desc: "MAE · MSE · RMSE · R² · joblib persistence", count: "FastAPI → React" },
];

const PIPELINE_CODE = `# backend/ml/pipeline.py
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestRegressor

pipeline = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler",  StandardScaler()),
    ("model",   RandomForestRegressor(
        n_estimators=300, max_depth=12,
        n_jobs=-1, random_state=42,
    )),
])
pipeline.fit(X_train, y_train)`;

export default function DataPipeline() {
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-teal-400" />
          <h3 className="text-sm font-bold text-slate-200">End-to-End ML Pipeline</h3>
          <span className="pill ml-auto">scikit-learn · TensorFlow · XGBoost</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="relative">
                <div className="card p-3 h-full">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500/20 to-indigo-500/20 grid place-items-center mb-2">
                    <Icon className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">STAGE {i + 1}</div>
                  <div className="text-sm font-bold text-slate-100">{s.title}</div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-snug">{s.desc}</div>
                  <div className="text-[10px] text-teal-400 mt-2 font-mono">{s.count}</div>
                </div>
                {i < STAGES.length - 1 && (
                  <ArrowRight className="hidden xl:block w-4 h-4 text-slate-700 absolute top-1/2 -right-2.5 -translate-y-1/2" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-bold text-slate-200 mb-3">Sklearn Pipeline (excerpt)</h3>
          <pre className="text-[11px] bg-[#07090f] border border-[#1f2942] rounded-lg p-3 overflow-auto leading-relaxed">
            <code className="text-slate-300 whitespace-pre">{PIPELINE_CODE}</code>
          </pre>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-bold text-slate-200 mb-3">Feature Importance (Random Forest)</h3>
          {[
            { f: "RSI_14", v: 0.18 }, { f: "MACD_hist", v: 0.16 }, { f: "Close_lag_1", v: 0.14 },
            { f: "EMA_20", v: 0.12 }, { f: "Volume_zscore", v: 0.10 }, { f: "BB_width", v: 0.09 },
            { f: "ATR_14", v: 0.07 }, { f: "Return_5d", v: 0.06 }, { f: "EMA_50", v: 0.05 }, { f: "Other", v: 0.03 },
          ].map((r) => (
            <div key={r.f} className="flex items-center gap-2 mb-1.5">
              <div className="w-24 text-[11px] text-slate-400 font-mono">{r.f}</div>
              <div className="flex-1 h-2 rounded-full bg-[#1f2942] overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-400 to-indigo-400" style={{ width: `${r.v * 100 * 5}%` }} />
              </div>
              <div className="w-10 text-right text-[11px] tabular-nums text-slate-300">{(r.v * 100).toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
