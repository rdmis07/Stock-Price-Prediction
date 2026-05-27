import { ArrowDownRight, ArrowUpRight, Calendar } from "lucide-react";
import type { ModelForecast } from "../lib/stockEngine";
import { formatCurrency, pctChange } from "../lib/stockEngine";

interface Props {
  lastClose: number;
  forecasts: ModelForecast[];
  currency: string;
}

const HORIZONS = [
  { label: "Next Day", idx: 0 },
  { label: "7-Day Forecast", idx: 6 },
  { label: "30-Day Forecast", idx: 29 },
];

export default function ForecastCards({ lastClose, forecasts, currency }: Props) {
  // Ensemble = average across models
  const ensemble = (i: number) => forecasts.reduce((a, f) => a + f.predictions[i], 0) / forecasts.length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {HORIZONS.map((h) => {
        const val = ensemble(h.idx);
        const ch = pctChange(lastClose, val);
        const up = ch >= 0;
        return (
          <div key={h.label} className="card p-4 relative overflow-hidden fade-in">
            <div className={"absolute inset-x-0 top-0 h-0.5 " + (up ? "bg-gradient-to-r from-emerald-500 to-teal-400" : "bg-gradient-to-r from-red-500 to-orange-400")} />
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-semibold">
                <Calendar className="w-3.5 h-3.5" /> {h.label}
              </div>
              <span className={"pill " + (up ? "text-bull border-emerald-500/30" : "text-bear border-red-500/30")}>
                {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {ch.toFixed(2)}%
              </span>
            </div>
            <div className="text-3xl font-black tabular-nums tracking-tight">{formatCurrency(val, currency)}</div>
            <div className="text-xs text-slate-500 mt-1">
              Current: <span className="text-slate-300 tabular-nums">{formatCurrency(lastClose, currency)}</span>
            </div>

            {/* mini sparkline per model */}
            <div className="mt-3 grid grid-cols-7 gap-1">
              {forecasts.map((f) => {
                const fch = pctChange(lastClose, f.predictions[h.idx]);
                const isUp = fch >= 0;
                return (
                  <div key={f.name} className="flex flex-col items-center gap-0.5" title={`${f.name}: ${fch.toFixed(2)}%`}>
                    <div className="w-full h-6 rounded-sm relative overflow-hidden" style={{ background: f.color + "22" }}>
                      <div
                        className="absolute bottom-0 inset-x-0"
                        style={{
                          background: isUp ? "#22c55e" : "#ef4444",
                          height: `${Math.min(100, Math.abs(fch) * 6)}%`,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                    <div className="text-[8px] text-slate-500">{f.name.split(" ")[0].slice(0, 4)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
