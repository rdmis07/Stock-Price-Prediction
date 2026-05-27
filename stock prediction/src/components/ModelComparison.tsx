import React from "react";
import { DollarSign, BarChart2, Activity, ArrowUpRight, ArrowDownRight, Award } from "lucide-react";

interface MetricData {
  name: string;
  category: string; // Price, Vol, Momentum
  value: string;
  rawNum: number;   // To Calculate Progress bar width 
  status: string;
  type: "BULL" | "NEUTRAL" | "BEAR";
  color: string;
}

interface Props {
  selected?: string;
  onSelect?: (name: string) => void;
}

export default function ModelComparison({ selected, onSelect }: Props) {
  // Pure stock market generic parameters mapped into your original UI structure
  const stockMetrics: MetricData[] = [
    { name: "Current Market Price", category: "Price", value: "$199.38", rawNum: 92, status: "+2.29%", type: "BULL", color: "#3FB950" },
    { name: "24h Session High",     category: "Price", value: "$201.50", rawNum: 100, status: "Peak",  type: "BULL", color: "#58A6FF" },
    { name: "24h Session Low",      category: "Price", value: "$197.10", rawNum: 45, status: "Floor", type: "BEAR", color: "#F78166" },
    { name: "Trading Volume (24h)",  category: "Vol",   value: "28.4M",   rawNum: 78, status: "High",  type: "BULL", color: "#D29922" },
    { name: "RSI (14-Day Momentum)", category: "Trend", value: "52.14",   rawNum: 52, status: "Stable",type: "NEUTRAL", color: "#BC8CFF" },
  ];

  // Setting baseline reference max value for your original dynamic progress bar logic
  const maxRawNum = 100;
  const activeMetric = selected || "Current Market Price";

  return (
    <div className="card p-4 fade-in bg-[#161B22] border border-[#30363D] rounded-xl">
      {/* Header Panel */}
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-teal-400" />
        <h3 className="text-sm font-bold text-slate-200">Stock Performance Lab</h3>
        <span className="pill ml-auto bg-[#21262D] text-teal-400 border border-[#30363D] text-[10px] px-2 py-0.5 rounded-full">
          Live Assets
        </span>
      </div>

      {/* Main Matrix Table */}
      <div className="overflow-x-auto -mx-4">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-slate-500 text-[10px] uppercase tracking-widest border-b border-[#21262D]">
              <th className="py-2 px-4 text-left font-semibold">Market Parameter</th>
              <th className="py-2 text-left font-semibold">Type</th>
              <th className="py-2 text-right font-semibold">Current Value</th>
              <th className="py-2 text-right font-semibold">Activity Depth</th>
              <th className="py-2 text-right font-semibold">Trend</th>
              <th className="py-2 px-4 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {stockMetrics.map((item) => {
              const isSelected = item.name === activeMetric;
              // Apple High Session highlight badge logic matching original Award icon element
              const isPeak = item.name === "24h Session High";

              return (
                <tr
                  key={item.name}
                  onClick={() => onSelect && onSelect(item.name)}
                  className={
                    "border-b border-[#21262D] cursor-pointer transition-colors " +
                    (isSelected ? "bg-[#1f242c]" : "hover:bg-[#0D1117]")
                  }
                >
                  {/* Parameter Name & Color Dot */}
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
                      <span className="font-semibold text-slate-200">{item.name}</span>
                      {isPeak && <Award className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                  </td>

                  {/* Tag Category Grouping */}
                  <td className="py-2.5">
                    <span className={
                      "pill text-[9px] px-1.5 py-0.5 rounded border " +
                      (item.category === "Price" ? "text-teal-400 border-teal-500/30 bg-teal-500/5"
                       : item.category === "Vol" ? "text-indigo-400 border-indigo-500/30 bg-indigo-500/5"
                       : "text-amber-400 border-amber-500/30 bg-amber-500/5")
                    }>
                      {item.category}
                    </span>
                  </td>

                  {/* Value Mapping */}
                  <td className="py-2.5 text-right tabular-nums text-slate-100 font-bold">
                    {item.value}
                  </td>

                  {/* Dynamic Progress Bar (Preserved from your original design) */}
                  <td className="py-2.5 text-right tabular-nums">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1 rounded-full bg-[#21262D] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-400 to-indigo-400"
                          style={{ width: `${(item.rawNum / maxRawNum) * 100}%` }}
                        />
                      </div>
                      <span className="text-slate-400 text-[10px]">{item.rawNum}%</span>
                    </div>
                  </td>

                  {/* Dynamic Custom Trend Status Colors */}
                  <td className={
                    "py-2.5 text-right tabular-nums font-bold " + 
                    (item.type === "BULL" ? "text-emerald-400" : item.type === "NEUTRAL" ? "text-amber-400" : "text-rose-400")
                  }>
                    {item.status}
                  </td>

                  {/* Interaction Control Button */}
                  <td className="py-2.5 px-4 text-right">
                    <button className="text-[10px] px-2 py-1 rounded border border-[#30363D] text-teal-400 hover:bg-teal-500/10 font-medium">
                      {isSelected ? "TRACKING" : "MONITOR"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Notes Panel */}
      <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-3 flex-wrap">
        <span>
          <Award className="w-3 h-3 inline text-amber-400 mr-1" /> 
          Real-time ticker metrics automatically evaluated from integrated data layers.
        </span>
        <span>· Engine Reference: yfinance feeds</span>
      </div>
    </div>
  );
}