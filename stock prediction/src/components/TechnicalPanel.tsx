import { useMemo } from "react";
import type { OHLC } from "../lib/stockEngine";
import { rsi, macd } from "../lib/stockEngine";

export default function TechnicalPanel({ history }: { history: OHLC[] }) {
  const data = useMemo(() => {
    const closes = history.slice(-120).map((d) => d.close);
    const dates = history.slice(-120).map((d) => d.date);
    return { closes, dates, rsi: rsi(closes), macd: macd(closes) };
  }, [history]);

  const W = 1000, H = 90, PAD_L = 36, PAD_R = 10, PAD_T = 8, PAD_B = 14;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const n = data.closes.length;
  const step = innerW / Math.max(1, n - 1);

  // RSI
  const rsiPts = data.rsi.map((v, i) => v === null ? null : `${PAD_L + i * step},${PAD_T + innerH - (v / 100) * innerH}`).filter(Boolean).join(" ");

  // MACD scaling
  const macdVals = data.macd.macdLine.filter((v): v is number => v !== null);
  const sigVals = data.macd.signal.filter((v): v is number => v !== null);
  const histVals = data.macd.hist.filter((v): v is number => v !== null);
  const macdMin = Math.min(...macdVals, ...sigVals, ...histVals);
  const macdMax = Math.max(...macdVals, ...sigVals, ...histVals);
  const macdRange = (macdMax - macdMin) || 1;
  const yMacd = (v: number) => PAD_T + innerH - ((v - macdMin) / macdRange) * innerH;

  const macdPts = data.macd.macdLine.map((v, i) => v === null ? null : `${PAD_L + i * step},${yMacd(v)}`).filter(Boolean).join(" ");
  const sigPts  = data.macd.signal.map((v, i)   => v === null ? null : `${PAD_L + i * step},${yMacd(v)}`).filter(Boolean).join(" ");

  const lastRSI = data.rsi[n - 1] as number;
  const lastMACD = data.macd.macdLine[n - 1] as number;
  const lastSig  = data.macd.signal[n - 1] as number;

  return (
    <div className="card p-4 fade-in">
      <h3 className="text-sm font-bold text-slate-200 mb-3">Technical Indicators</h3>

      {/* RSI */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-slate-400 font-semibold tracking-wider">RSI (14)</span>
          <span className={"text-[11px] tabular-nums font-bold " + (lastRSI > 70 ? "text-bear" : lastRSI < 30 ? "text-bull" : "text-slate-300")}>
            {lastRSI?.toFixed(2)}
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20">
          <rect x={PAD_L} y={PAD_T + innerH - (70 / 100) * innerH} width={innerW}
                height={innerH * (40 / 100)} fill="#1f2942" opacity="0.3" />
          <line x1={PAD_L} x2={W - PAD_R} y1={PAD_T + innerH - 0.7 * innerH} y2={PAD_T + innerH - 0.7 * innerH}
                stroke="#ef4444" strokeDasharray="2 3" strokeWidth="0.6" />
          <line x1={PAD_L} x2={W - PAD_R} y1={PAD_T + innerH - 0.3 * innerH} y2={PAD_T + innerH - 0.3 * innerH}
                stroke="#22c55e" strokeDasharray="2 3" strokeWidth="0.6" />
          <text x={PAD_L - 4} y={PAD_T + innerH - 0.7 * innerH + 3} textAnchor="end" fontSize="8" fill="#ef4444">70</text>
          <text x={PAD_L - 4} y={PAD_T + innerH - 0.3 * innerH + 3} textAnchor="end" fontSize="8" fill="#22c55e">30</text>
          <polyline points={rsiPts} fill="none" stroke="#5eead4" strokeWidth="1.4" />
        </svg>
      </div>

      {/* MACD */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-slate-400 font-semibold tracking-wider">MACD (12,26,9)</span>
          <span className={"text-[11px] tabular-nums font-bold " + (lastMACD > lastSig ? "text-bull" : "text-bear")}>
            {lastMACD?.toFixed(3)} / {lastSig?.toFixed(3)}
          </span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20">
          <line x1={PAD_L} x2={W - PAD_R} y1={yMacd(0)} y2={yMacd(0)} stroke="#1f2942" strokeWidth="0.6" />
          {data.macd.hist.map((v, i) => {
            if (v === null) return null;
            const x = PAD_L + i * step;
            const y = yMacd(v);
            const zero = yMacd(0);
            return (
              <rect key={i} x={x - step / 3} y={Math.min(y, zero)} width={Math.max(0.8, step * 0.65)}
                    height={Math.max(0.5, Math.abs(y - zero))}
                    fill={v >= 0 ? "#22c55e" : "#ef4444"} opacity="0.55" />
            );
          })}
          <polyline points={macdPts} fill="none" stroke="#5eead4" strokeWidth="1.2" />
          <polyline points={sigPts}  fill="none" stroke="#fbbf24" strokeWidth="1.2" />
        </svg>
      </div>
    </div>
  );
}
