import { useMemo, useState } from "react";
import { Plus, Trash2, Briefcase, TrendingUp, TrendingDown } from "lucide-react";
import { STOCK_UNIVERSE, generateHistory, formatCurrency, getCurrency, pctChange } from "../lib/stockEngine";

interface Holding { symbol: string; qty: number; avgPrice: number; }

const INITIAL: Holding[] = [
  { symbol: "AAPL", qty: 25, avgPrice: 175.5 },
  { symbol: "NVDA", qty: 12, avgPrice: 620.0 },
  { symbol: "MSFT", qty: 15, avgPrice: 390.0 },
  { symbol: "TSLA", qty: 18, avgPrice: 220.0 },
];

export default function Portfolio() {
  const [holdings, setHoldings] = useState<Holding[]>(INITIAL);
  const [symbol, setSymbol] = useState("GOOGL");
  const [qty, setQty] = useState(10);
  const [price, setPrice] = useState(160);

  const enriched = useMemo(() => holdings.map((h) => {
    const meta = STOCK_UNIVERSE.find((s) => s.symbol === h.symbol)!;
    const hist = generateHistory(meta);
    const last = hist[hist.length - 1].close;
    const value = last * h.qty;
    const cost = h.avgPrice * h.qty;
    const pnl = value - cost;
    const pct = pctChange(h.avgPrice, last);
    return { ...h, meta, last, value, cost, pnl, pct };
  }), [holdings]);

  const totalValue = enriched.reduce((a, h) => a + h.value, 0);
  const totalCost = enriched.reduce((a, h) => a + h.cost, 0);
  const totalPnl = totalValue - totalCost;
  const totalPct = (totalPnl / totalCost) * 100;

  const removeRow = (i: number) => setHoldings((h) => h.filter((_, idx) => idx !== i));
  const addRow = () => {
    if (!STOCK_UNIVERSE.find((s) => s.symbol === symbol)) return;
    setHoldings((h) => [...h, { symbol, qty, avgPrice: price }]);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-2"><Briefcase className="w-3.5 h-3.5" /> TOTAL VALUE</div>
          <div className="text-3xl font-black tabular-nums">{formatCurrency(totalValue)}</div>
          <div className="text-[11px] text-slate-500 mt-1">{enriched.length} holdings</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] text-slate-400 mb-2">UNREALIZED P&L</div>
          <div className={"text-3xl font-black tabular-nums " + (totalPnl >= 0 ? "text-bull" : "text-bear")}>
            {totalPnl >= 0 ? "+" : ""}{formatCurrency(totalPnl)}
          </div>
          <div className={"text-[11px] mt-1 " + (totalPnl >= 0 ? "text-bull" : "text-bear")}>
            {totalPnl >= 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />} {totalPct.toFixed(2)}% all-time
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] text-slate-400 mb-2">COST BASIS</div>
          <div className="text-3xl font-black tabular-nums text-slate-200">{formatCurrency(totalCost)}</div>
          <div className="text-[11px] text-slate-500 mt-1">Avg holding {formatCurrency(totalCost / Math.max(1, enriched.length))}</div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-200">Holdings</h3>
          <span className="pill">Real-time pricing</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 text-[10px] uppercase tracking-widest border-b border-[#1f2942]">
                <th className="py-2 text-left font-semibold">Symbol</th>
                <th className="py-2 text-right font-semibold">Qty</th>
                <th className="py-2 text-right font-semibold">Avg Cost</th>
                <th className="py-2 text-right font-semibold">Last</th>
                <th className="py-2 text-right font-semibold">Market Value</th>
                <th className="py-2 text-right font-semibold">P&L</th>
                <th className="py-2 text-right font-semibold">%</th>
                <th className="py-2 text-right font-semibold w-10"></th>
              </tr>
            </thead>
            <tbody>
              {enriched.map((h, i) => {
                const cur = getCurrency(h.meta);
                return (
                  <tr key={i} className="border-b border-[#1f2942] hover:bg-[#131a2c]">
                    <td className="py-2.5">
                      <div className="font-semibold">{h.symbol}</div>
                      <div className="text-[10px] text-slate-500">{h.meta.name}</div>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{h.qty}</td>
                    <td className="py-2.5 text-right tabular-nums">{cur}{h.avgPrice.toFixed(2)}</td>
                    <td className="py-2.5 text-right tabular-nums">{cur}{h.last.toFixed(2)}</td>
                    <td className="py-2.5 text-right tabular-nums font-semibold">{cur}{h.value.toFixed(2)}</td>
                    <td className={"py-2.5 text-right tabular-nums font-bold " + (h.pnl >= 0 ? "text-bull" : "text-bear")}>
                      {h.pnl >= 0 ? "+" : ""}{cur}{h.pnl.toFixed(2)}
                    </td>
                    <td className={"py-2.5 text-right tabular-nums " + (h.pct >= 0 ? "text-bull" : "text-bear")}>
                      {h.pct >= 0 ? "+" : ""}{h.pct.toFixed(2)}%
                    </td>
                    <td className="py-2.5 text-right">
                      <button onClick={() => removeRow(i)} className="p-1 hover:bg-bear/10 text-slate-500 hover:text-bear rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-4 border-t border-[#1f2942] flex items-end gap-2 flex-wrap">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest">Symbol</label>
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)}
                    className="block bg-[#0d1220] border border-[#1f2942] rounded px-2 py-1.5 text-sm">
              {STOCK_UNIVERSE.map((s) => <option key={s.symbol}>{s.symbol}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest">Quantity</label>
            <input type="number" value={qty} onChange={(e) => setQty(+e.target.value)}
                   className="block bg-[#0d1220] border border-[#1f2942] rounded px-2 py-1.5 text-sm w-24" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-widest">Avg Price</label>
            <input type="number" value={price} step="0.01" onChange={(e) => setPrice(+e.target.value)}
                   className="block bg-[#0d1220] border border-[#1f2942] rounded px-2 py-1.5 text-sm w-28" />
          </div>
          <button onClick={addRow}
                  className="px-3 py-1.5 rounded bg-gradient-to-r from-teal-500 to-indigo-500 text-[#07090f] font-bold text-sm flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add Holding
          </button>
        </div>
      </div>
    </div>
  );
}
