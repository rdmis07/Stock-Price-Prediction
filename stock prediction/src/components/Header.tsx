import { Bell, Search, Sun, Moon, Download, RefreshCw } from "lucide-react";
import { STOCK_UNIVERSE, type StockMeta, getCurrency, formatCurrency, pctChange } from "../lib/stockEngine";
import { useState } from "react";

interface Props {
  selected: StockMeta;
  onSelect: (m: StockMeta) => void;
  lastClose: number;
  prevClose: number;
  liveTick: number;
  onRefresh: () => void;
  onExport: () => void;
}

export default function Header({ selected, onSelect, lastClose, prevClose, liveTick, onRefresh, onExport }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ch = pctChange(prevClose, lastClose + liveTick);
  const up = ch >= 0;
  const cur = getCurrency(selected);
  const filtered = STOCK_UNIVERSE.filter(
    (s) => s.symbol.toLowerCase().includes(q.toLowerCase()) || s.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <header className="sticky top-0 z-30 border-b border-[#1f2942] bg-[#07090f]/85 backdrop-blur-md">
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search AAPL, MSFT, RELIANCE…"
            className="w-full bg-[#0d1220] border border-[#1f2942] rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:border-teal-500/60"
          />
          {open && (
            <div className="absolute left-0 right-0 top-full mt-2 card max-h-80 overflow-auto z-50 shadow-2xl">
              {filtered.map((s) => (
                <button
                  key={s.symbol}
                  onMouseDown={() => { onSelect(s); setQ(""); setOpen(false); }}
                  className="w-full px-3 py-2 flex items-center gap-3 hover:bg-[#1a2138] text-left"
                >
                  <div className="w-8 h-8 rounded bg-[#1a2138] grid place-items-center text-[10px] font-bold text-teal-400">
                    {s.symbol.slice(0, 3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{s.symbol} <span className="text-slate-500 font-normal text-xs">· {s.exchange}</span></div>
                    <div className="text-xs text-slate-500 truncate">{s.name}</div>
                  </div>
                  <span className="pill">{s.sector}</span>
                </button>
              ))}
              {filtered.length === 0 && <div className="px-3 py-4 text-sm text-slate-500">No results</div>}
            </div>
          )}
        </div>

        {/* Current symbol summary */}
        <div className="hidden md:flex items-center gap-4 px-4 py-2 rounded-lg border border-[#1f2942] bg-[#0d1220]">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Symbol</div>
            <div className="font-bold text-sm">{selected.symbol} <span className="text-slate-500 font-normal">· {selected.exchange}</span></div>
          </div>
          <div className="w-px h-8 bg-[#1f2942]" />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Live</div>
            <div className="font-bold text-sm tabular-nums">{formatCurrency(lastClose + liveTick, cur)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Change</div>
            <div className={"font-bold text-sm tabular-nums " + (up ? "text-bull" : "text-bear")}>
              {up ? "▲" : "▼"} {ch.toFixed(2)}%
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="pulse-dot" /> LIVE
          </div>
        </div>

        <button onClick={onRefresh} className="p-2 rounded-lg border border-[#1f2942] hover:bg-[#1a2138] text-slate-400" title="Refresh data">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button onClick={onExport} className="p-2 rounded-lg border border-[#1f2942] hover:bg-[#1a2138] text-slate-400" title="Export CSV">
          <Download className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-lg border border-[#1f2942] hover:bg-[#1a2138] text-slate-400 relative" title="Notifications">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-400" />
        </button>
        <button className="p-2 rounded-lg border border-[#1f2942] hover:bg-[#1a2138] text-slate-400" title="Toggle theme">
          <Moon className="w-4 h-4" />
          <Sun className="w-4 h-4 hidden" />
        </button>
      </div>
    </header>
  );
}
