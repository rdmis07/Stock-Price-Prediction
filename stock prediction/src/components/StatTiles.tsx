import type { OHLC } from "../lib/stockEngine";
import { ArrowUpRight, ArrowDownRight, Activity, BarChart3, Layers, Volume2 } from "lucide-react";

interface Props { history: OHLC[]; currency: string; }

export default function StatTiles({ history, currency }: Props) {
  const n = history.length;
  const last = history[n - 1];
  const prev = history[n - 2];

  // 52-week
  const yearSlice = history.slice(-252);
  const yearHigh = Math.max(...yearSlice.map((d) => d.high));
  const yearLow = Math.min(...yearSlice.map((d) => d.low));

  // average volume (20d)
  const avgVol = history.slice(-20).reduce((a, d) => a + d.volume, 0) / 20;

  // volatility (annualized stdev of returns over 30d)
  const rets: number[] = [];
  for (let i = n - 30; i < n; i++) rets.push(Math.log(history[i].close / history[i - 1].close));
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  const annualVol = Math.sqrt(variance * 252) * 100;

  // 30d return
  const ret30 = ((last.close - history[n - 30].close) / history[n - 30].close) * 100;

  const tiles = [
    {
      label: "Day Range",
      value: `${currency}${last.low.toFixed(2)} – ${currency}${last.high.toFixed(2)}`,
      sub: `Open ${currency}${last.open.toFixed(2)}`,
      icon: BarChart3, color: "text-indigo-400",
    },
    {
      label: "52-Week Range",
      value: `${currency}${yearLow.toFixed(2)} – ${currency}${yearHigh.toFixed(2)}`,
      sub: `${(((last.close - yearLow) / (yearHigh - yearLow)) * 100).toFixed(0)}% of range`,
      icon: Layers, color: "text-teal-400",
    },
    {
      label: "Avg. Volume (20d)",
      value: `${(avgVol / 1e6).toFixed(2)}M`,
      sub: `Today ${(last.volume / 1e6).toFixed(2)}M (${(((last.volume - avgVol) / avgVol) * 100).toFixed(1)}%)`,
      icon: Volume2, color: "text-amber-400",
    },
    {
      label: "Volatility (30d)",
      value: `${annualVol.toFixed(2)}%`,
      sub: `Daily σ ${(annualVol / Math.sqrt(252)).toFixed(2)}%`,
      icon: Activity, color: "text-purple-400",
    },
    {
      label: "30-Day Return",
      value: `${ret30 >= 0 ? "+" : ""}${ret30.toFixed(2)}%`,
      sub: ret30 >= 0 ? "Outperforming baseline" : "Underperforming baseline",
      icon: ret30 >= 0 ? ArrowUpRight : ArrowDownRight,
      color: ret30 >= 0 ? "text-bull" : "text-bear",
    },
    {
      label: "Yesterday Close",
      value: `${currency}${prev.close.toFixed(2)}`,
      sub: `Δ ${(((last.close - prev.close) / prev.close) * 100).toFixed(2)}%`,
      icon: BarChart3, color: "text-slate-300",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <div key={t.label} className="card p-3 fade-in">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{t.label}</span>
              <Icon className={"w-3.5 h-3.5 " + t.color} />
            </div>
            <div className="text-sm font-bold tabular-nums text-slate-100">{t.value}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate">{t.sub}</div>
          </div>
        );
      })}
    </div>
  );
}
