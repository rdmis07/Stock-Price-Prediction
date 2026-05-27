import type { NewsItem } from "../lib/stockEngine";
import { aggregateSentiment } from "../lib/stockEngine";
import { Newspaper, TrendingUp, TrendingDown, Activity } from "lucide-react";

export default function NewsSentiment({ news }: { news: NewsItem[] }) {
  const agg = aggregateSentiment(news);
  const score = ((agg.avg + 1) / 2) * 100; // 0..100

  return (
    <div className="card p-4 fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Newspaper className="w-4 h-4 text-teal-400" />
        <h3 className="text-sm font-bold text-slate-200">News & Sentiment Analysis</h3>
        <span className="pill ml-auto">NLP · FinBERT</span>
      </div>

      {/* gauge */}
      <div className="mb-4 p-3 rounded-lg bg-[#0d1220] border border-[#1f2942]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-slate-400 font-semibold tracking-wider">AGGREGATE SENTIMENT</span>
          <span className={
            "text-xs font-bold " +
            (agg.avg > 0.2 ? "text-bull" : agg.avg < -0.2 ? "text-bear" : "text-slate-300")
          }>
            {agg.avg > 0.2 ? "Bullish" : agg.avg < -0.2 ? "Bearish" : "Neutral"} · {agg.avg.toFixed(2)}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gradient-to-r from-red-500 via-slate-600 to-emerald-500 relative">
          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-[#07090f]"
               style={{ left: `calc(${score}% - 6px)` }} />
        </div>
        <div className="mt-3 flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-bull"><TrendingUp className="w-3 h-3" /> {agg.pos} positive</span>
          <span className="flex items-center gap-1 text-slate-400"><Activity className="w-3 h-3" /> {agg.neu} neutral</span>
          <span className="flex items-center gap-1 text-bear"><TrendingDown className="w-3 h-3" /> {agg.neg} negative</span>
        </div>
      </div>

      <div className="space-y-2 max-h-80 overflow-auto pr-1">
        {news.map((n, i) => (
          <div key={i} className="p-2.5 rounded-lg border border-[#1f2942] hover:bg-[#131a2c] transition-colors">
            <div className="flex items-start gap-2">
              <div className={
                "shrink-0 w-1 self-stretch rounded-full " +
                (n.sentiment === "positive" ? "bg-bull" : n.sentiment === "negative" ? "bg-bear" : "bg-slate-500")
              } />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-200 leading-snug">{n.title}</div>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                  <span className="font-semibold">{n.source}</span>
                  <span>·</span>
                  <span>{n.time}</span>
                  <span className="ml-auto tabular-nums">
                    <span className={
                      n.sentiment === "positive" ? "text-bull"
                      : n.sentiment === "negative" ? "text-bear"
                      : "text-slate-400"
                    }>
                      {n.score > 0 ? "+" : ""}{n.score.toFixed(2)}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
