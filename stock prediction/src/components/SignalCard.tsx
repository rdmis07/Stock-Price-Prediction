import { TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import type { Signal } from "../lib/stockEngine";

const COLOR: Record<Signal["action"], string> = {
  "STRONG BUY":  "from-emerald-500 to-teal-400",
  "BUY":         "from-green-500 to-emerald-400",
  "HOLD":        "from-slate-500 to-slate-400",
  "SELL":        "from-orange-500 to-red-400",
  "STRONG SELL": "from-red-600 to-red-500",
};

export default function SignalCard({ signal }: { signal: Signal }) {
  const isBuy = signal.action.includes("BUY");
  const isSell = signal.action.includes("SELL");
  const Icon = isBuy ? TrendingUp : isSell ? TrendingDown : Minus;

  return (
    <div className={"card p-5 fade-in relative overflow-hidden " + (isBuy ? "glow-bull" : isSell ? "glow-bear" : "")}>
      <div className={"absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-20 blur-3xl bg-gradient-to-br " + COLOR[signal.action]} />

      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-teal-400" />
        <h3 className="text-sm font-bold text-slate-200">AI Recommendation</h3>
        <span className="pill ml-auto">Ensemble of 7 Models</span>
      </div>

      <div className="flex items-center gap-4">
        <div className={"w-16 h-16 rounded-2xl grid place-items-center bg-gradient-to-br " + COLOR[signal.action]}>
          <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <div className="text-2xl font-black tracking-tight">{signal.action}</div>
          <div className="text-xs text-slate-400">
            Signal score: <span className="tabular-nums font-bold text-slate-200">{(signal.score * 100).toFixed(1)}</span>
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Confidence</div>
          <div className="text-2xl font-bold text-teal-400 tabular-nums">{(signal.confidence * 100).toFixed(0)}%</div>
          <div className="w-24 h-1.5 rounded-full bg-[#1f2942] mt-1 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-teal-400 to-indigo-400" style={{ width: `${signal.confidence * 100}%` }} />
          </div>
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {signal.reasoning.map((r, i) => (
          <li key={i} className="text-xs text-slate-400 flex gap-2">
            <span className="text-teal-400 mt-1">▸</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
