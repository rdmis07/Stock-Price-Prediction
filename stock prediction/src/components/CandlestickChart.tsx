import { useMemo, useState } from "react";
import type { OHLC, ModelForecast } from "../lib/stockEngine";
import { ema, bollinger } from "../lib/stockEngine";

interface Props {
  history: OHLC[];
  forecast?: ModelForecast | null;
  currency: string;
  showBollinger?: boolean;
  showEMA?: boolean;
  height?: number;
}

const TF = [
  { id: "1M", days: 22 },
  { id: "3M", days: 66 },
  { id: "6M", days: 132 },
  { id: "1Y", days: 252 },
  { id: "ALL", days: 9999 },
];

export default function CandlestickChart({
  history, forecast, currency, showBollinger = true, showEMA = true, height = 380,
}: Props) {
  const [tf, setTf] = useState("3M");
  const [hover, setHover] = useState<number | null>(null);

  const sliced = useMemo(() => {
    const days = TF.find((t) => t.id === tf)!.days;
    return history.slice(-days);
  }, [history, tf]);

  const futurePts = forecast?.predictions.slice(0, 30) ?? [];

  // build coords
  const W = 1000;
  const H = height;
  const PAD_L = 50, PAD_R = 14, PAD_T = 16, PAD_B = 32;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const totalLen = sliced.length + futurePts.length;
  const stepX = innerW / Math.max(1, totalLen - 1);

  const allValues = [
    ...sliced.flatMap((d) => [d.high, d.low]),
    ...futurePts,
  ];
  const bb = bollinger(sliced.map((d) => d.close));
  if (showBollinger) {
    bb.upper.forEach((v) => v !== null && allValues.push(v));
    bb.lower.forEach((v) => v !== null && allValues.push(v));
  }
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const padR = range * 0.05;
  const yMin = min - padR, yMax = max + padR;
  const yScale = (v: number) => PAD_T + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
  const xScale = (i: number) => PAD_L + i * stepX;

  const ema20 = showEMA ? ema(sliced.map((d) => d.close), 20) : [];
  const ema50 = showEMA ? ema(sliced.map((d) => d.close), 50) : [];

  // y axis ticks
  const yTicks = 5;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / yTicks);
  // x axis labels (5 ticks)
  const xTicks = 5;
  const xLabelIdx = Array.from({ length: xTicks }, (_, i) =>
    Math.round((i / (xTicks - 1)) * (sliced.length - 1)),
  );

  const candleW = Math.max(1.4, stepX * 0.65);

  // forecast line
  const futurePath = futurePts.length
    ? `M ${xScale(sliced.length - 1)} ${yScale(sliced[sliced.length - 1].close)} ` +
      futurePts.map((p, i) => `L ${xScale(sliced.length + i)} ${yScale(p)}`).join(" ")
    : "";

  const polyPath = (arr: (number | null)[]) =>
    arr
      .map((v, i) => (v === null ? null : `${xScale(i)},${yScale(v)}`))
      .filter(Boolean)
      .join(" ");

  return (
    <div className="card p-4 fade-in">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-200">Price Action & Forecast</h3>
          <span className="pill text-teal-400 border-teal-500/30">CANDLESTICK</span>
          {forecast && (
            <span className="pill" style={{ color: forecast.color, borderColor: forecast.color + "55" }}>
              + {forecast.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {TF.map((t) => (
            <button
              key={t.id}
              onClick={() => setTf(t.id)}
              className={
                "px-2.5 py-1 text-[11px] font-semibold rounded border transition-all " +
                (tf === t.id
                  ? "border-teal-500/50 text-teal-400 bg-teal-500/10"
                  : "border-[#1f2942] text-slate-500 hover:text-slate-200")
              }
            >
              {t.id}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none"
             onMouseLeave={() => setHover(null)}>
          {/* gridlines */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={PAD_L} x2={W - PAD_R} y1={yScale(t)} y2={yScale(t)}
                    stroke="#1f2942" strokeDasharray="3 4" />
              <text x={PAD_L - 6} y={yScale(t) + 3} textAnchor="end"
                    fontSize="9" fill="#64748b">
                {currency}{t.toFixed(t < 100 ? 2 : 0)}
              </text>
            </g>
          ))}
          {xLabelIdx.map((i) => (
            <text key={i} x={xScale(i)} y={H - 10} textAnchor="middle" fontSize="9" fill="#64748b">
              {sliced[i]?.date.slice(5)}
            </text>
          ))}

          {/* Bollinger band fill */}
          {showBollinger && (
            <polygon
              points={
                bb.upper.map((v, i) => v === null ? null : `${xScale(i)},${yScale(v)}`).filter(Boolean).join(" ")
                + " "
                + [...bb.lower].reverse().map((v, idx) => {
                    const i = bb.lower.length - 1 - idx;
                    return v === null ? null : `${xScale(i)},${yScale(v)}`;
                  }).filter(Boolean).join(" ")
              }
              fill="rgba(94, 234, 212, 0.06)"
              stroke="none"
            />
          )}
          {showBollinger && (
            <>
              <polyline points={polyPath(bb.upper)} fill="none" stroke="#5eead4" strokeWidth="0.8" strokeDasharray="2 3" opacity={0.6} />
              <polyline points={polyPath(bb.lower)} fill="none" stroke="#5eead4" strokeWidth="0.8" strokeDasharray="2 3" opacity={0.6} />
            </>
          )}

          {/* Candles */}
          {sliced.map((c, i) => {
            const up = c.close >= c.open;
            const color = up ? "#22c55e" : "#ef4444";
            const x = xScale(i);
            return (
              <g key={i} onMouseEnter={() => setHover(i)}>
                <line x1={x} x2={x} y1={yScale(c.high)} y2={yScale(c.low)} stroke={color} strokeWidth="0.8" />
                <rect
                  x={x - candleW / 2}
                  y={yScale(Math.max(c.open, c.close))}
                  width={candleW}
                  height={Math.max(1, Math.abs(yScale(c.open) - yScale(c.close)))}
                  fill={color}
                  opacity={up ? 0.9 : 0.95}
                />
              </g>
            );
          })}

          {/* EMA lines */}
          {showEMA && <polyline points={polyPath(ema20)} fill="none" stroke="#818cf8" strokeWidth="1.4" />}
          {showEMA && <polyline points={polyPath(ema50)} fill="none" stroke="#fbbf24" strokeWidth="1.4" opacity={0.8} />}

          {/* Forecast */}
          {futurePath && (
            <>
              <rect x={xScale(sliced.length - 1)} y={PAD_T} width={W - PAD_R - xScale(sliced.length - 1)} height={innerH} fill="url(#forecastGrad)" />
              <defs>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={forecast?.color || "#5eead4"} stopOpacity="0.06" />
                  <stop offset="100%" stopColor={forecast?.color || "#5eead4"} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={futurePath} fill="none" stroke={forecast?.color || "#5eead4"}
                    strokeWidth="2" strokeDasharray="4 4" />
              <line x1={xScale(sliced.length - 1)} x2={xScale(sliced.length - 1)} y1={PAD_T} y2={H - PAD_B}
                    stroke="#5eead4" strokeWidth="0.6" strokeDasharray="2 3" opacity={0.5} />
              <text x={xScale(sliced.length - 1) + 4} y={PAD_T + 10} fontSize="9" fill="#5eead4">
                FORECAST →
              </text>
            </>
          )}

          {/* hover overlay */}
          {hover !== null && sliced[hover] && (
            <g pointerEvents="none">
              <line x1={xScale(hover)} x2={xScale(hover)} y1={PAD_T} y2={H - PAD_B}
                    stroke="#5eead4" strokeWidth="0.5" opacity={0.6} />
              <circle cx={xScale(hover)} cy={yScale(sliced[hover].close)} r="3" fill="#5eead4" />
            </g>
          )}

          {/* invisible hover targets */}
          {sliced.map((_, i) => (
            <rect key={i} x={xScale(i) - stepX / 2} y={PAD_T} width={stepX} height={innerH}
                  fill="transparent" onMouseEnter={() => setHover(i)} />
          ))}
        </svg>

        {/* tooltip */}
        {hover !== null && sliced[hover] && (
          <div className="absolute top-2 right-2 card px-3 py-2 text-[11px] shadow-xl">
            <div className="text-slate-400 mb-1">{sliced[hover].date}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 tabular-nums">
              <span className="text-slate-500">Open</span><span>{currency}{sliced[hover].open.toFixed(2)}</span>
              <span className="text-slate-500">High</span><span className="text-bull">{currency}{sliced[hover].high.toFixed(2)}</span>
              <span className="text-slate-500">Low</span> <span className="text-bear">{currency}{sliced[hover].low.toFixed(2)}</span>
              <span className="text-slate-500">Close</span><span>{currency}{sliced[hover].close.toFixed(2)}</span>
              <span className="text-slate-500">Vol</span><span>{(sliced[hover].volume / 1e6).toFixed(2)}M</span>
            </div>
          </div>
        )}
      </div>

      {/* legend */}
      <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-500 flex-wrap">
        <div className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-sm bg-bull" /> Up</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-sm bg-bear" /> Down</div>
        {showEMA && <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-indigo-400" /> EMA 20</div>}
        {showEMA && <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-400" /> EMA 50</div>}
        {showBollinger && <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-teal-400 border-dashed" /> Bollinger 20,2</div>}
        {forecast && <div className="flex items-center gap-1.5"><span className="w-3 h-0.5" style={{ background: forecast.color }} /> Forecast</div>}
      </div>
    </div>
  );
}
