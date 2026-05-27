import { useMemo, useState } from "react";
import { GitCompare, X } from "lucide-react";
import { STOCK_UNIVERSE, generateHistory } from "../lib/stockEngine";

const PALETTE = ["#5eead4", "#818cf8", "#f472b6", "#fbbf24", "#34d399", "#fb923c"];

export default function CompareStocks() {
  const [symbols, setSymbols] = useState<string[]>(["AAPL", "MSFT", "NVDA", "TSLA"]);
  const [add, setAdd] = useState("GOOGL");

  const series = useMemo(() => symbols.map((sym, i) => {
    const meta = STOCK_UNIVERSE.find((s) => s.symbol === sym)!;
    const hist = generateHistory(meta).slice(-132);
    const base = hist[0].close;
    return {
      symbol: sym,
      color: PALETTE[i % PALETTE.length],
      points: hist.map((d) => ({ date: d.date, val: ((d.close - base) / base) * 100 })),
      latest: ((hist[hist.length - 1].close - base) / base) * 100,
    };
  }), [symbols]);

  const W = 1000, H = 360, PAD_L = 50, PAD_R = 14, PAD_T = 16, PAD_B = 26;
  const innerW = W - PAD_L - PAD_R, innerH = H - PAD_T - PAD_B;
  const n = series[0]?.points.length || 0;
  const step = innerW / Math.max(1, n - 1);
  const allVals = series.flatMap((s) => s.points.map((p) => p.val));
  const min = Math.min(...allVals, 0);
  const max = Math.max(...allVals, 0);
  const range = max - min || 1;
  const y = (v: number) => PAD_T + innerH - ((v - min) / range) * innerH;

  return (
    <div className="card p-4 fade-in">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <GitCompare className="w-4 h-4 text-teal-400" />
        <h3 className="text-sm font-bold text-slate-200">Multi-Stock Comparison · Normalized %</h3>
        <span className="pill ml-auto">6 month window</span>
      </div>

      {/* selected chips */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {series.map((s) => (
          <div key={s.symbol} className="pill flex items-center gap-2 border-[#2a3556]"
               style={{ color: s.color, borderColor: s.color + "55" }}>
            <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            {s.symbol}
            <span className={s.latest >= 0 ? "text-bull" : "text-bear"}>{s.latest >= 0 ? "+" : ""}{s.latest.toFixed(2)}%</span>
            <button onClick={() => setSymbols((p) => p.filter((x) => x !== s.symbol))}>
              <X className="w-3 h-3 text-slate-500 hover:text-slate-200" />
            </button>
          </div>
        ))}
        <select value={add} onChange={(e) => setAdd(e.target.value)}
                className="bg-[#0d1220] border border-[#1f2942] rounded px-2 py-1 text-xs">
          {STOCK_UNIVERSE.filter((s) => !symbols.includes(s.symbol)).map((s) =>
            <option key={s.symbol}>{s.symbol}</option>
          )}
        </select>
        <button onClick={() => {
          if (!symbols.includes(add)) setSymbols((p) => [...p, add]);
        }} className="text-[11px] px-2 py-1 rounded border border-teal-500/40 text-teal-400 hover:bg-teal-500/10 font-semibold">
          + Add
        </button>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const v = min + range * t;
          return (
            <g key={i}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)} stroke="#1f2942" strokeDasharray="3 4" />
              <text x={PAD_L - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#64748b">{v.toFixed(0)}%</text>
            </g>
          );
        })}
        <line x1={PAD_L} x2={W - PAD_R} y1={y(0)} y2={y(0)} stroke="#475569" strokeWidth="0.6" />
        {series.map((s) => (
          <polyline key={s.symbol} fill="none" stroke={s.color} strokeWidth="1.6"
                    points={s.points.map((p, i) => `${PAD_L + i * step},${y(p.val)}`).join(" ")} />
        ))}
      </svg>
    </div>
  );
}
