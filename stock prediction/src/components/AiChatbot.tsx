import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X, MessageSquare } from "lucide-react";
import type { ModelForecast, Signal, StockMeta } from "../lib/stockEngine";
import { getCurrency, pctChange } from "../lib/stockEngine";

interface Msg { role: "user" | "ai"; text: string; ts: number; }

interface Props {
  meta: StockMeta;
  lastClose: number;
  forecasts: ModelForecast[];
  signal: Signal;
}

const SUGGESTIONS = [
  "Should I buy now?",
  "What's the 30-day forecast?",
  "Which model is most accurate?",
  "What's the risk?",
];

export default function AiChatbot({ meta, lastClose, forecasts, signal }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", ts: Date.now(),
      text: `Hi! I'm QuantumGPT 🤖 — your AI analyst for **${meta.symbol}**. Ask me anything about predictions, signals, or risk.` },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);
  useEffect(() => {
    setMsgs([{ role: "ai", ts: Date.now(),
      text: `Now analyzing **${meta.symbol}** — ${meta.name}. Last close ${getCurrency(meta)}${lastClose.toFixed(2)}. What would you like to know?` }]);
  }, [meta.symbol]); // eslint-disable-line

  const reply = (q: string): string => {
    const l = q.toLowerCase();
    const cur = getCurrency(meta);
    const sevenDay = forecasts.reduce((a, f) => a + f.predictions[6], 0) / forecasts.length;
    const thirtyDay = forecasts.reduce((a, f) => a + f.predictions[29], 0) / forecasts.length;
    const exp = pctChange(lastClose, sevenDay);

    if (/buy|sell|should|recommend/.test(l)) {
      return `Based on an ensemble of **${forecasts.length} models**, the 7-day expected return is **${exp > 0 ? "+" : ""}${exp.toFixed(2)}%**. ` +
        `Combined with RSI, MACD and Bollinger reads, my signal is **${signal.action}** at ` +
        `**${(signal.confidence * 100).toFixed(0)}% confidence**. Always combine with your own risk rules.`;
    }
    if (/forecast|predict|price|target/.test(l)) {
      return `Forecast for **${meta.symbol}**:\n` +
        `• 7-day target: ${cur}${sevenDay.toFixed(2)} (${exp > 0 ? "+" : ""}${exp.toFixed(2)}%)\n` +
        `• 30-day target: ${cur}${thirtyDay.toFixed(2)}\n` +
        `Current price: ${cur}${lastClose.toFixed(2)}`;
    }
    if (/accura|best|model/.test(l)) {
      const best = [...forecasts].sort((a, b) => b.metrics.R2 - a.metrics.R2)[0];
      return `The top model right now is **${best.name}** with R² = ${best.metrics.R2.toFixed(3)} and ` +
        `RMSE = ${best.metrics.RMSE.toFixed(2)}. The deep-learning ensemble (LSTM + GRU) ` +
        `consistently leads on liquid US large-caps.`;
    }
    if (/risk|volatil/.test(l)) {
      return `${meta.symbol} sits in the **${meta.sector}** sector with ~${(meta.vol * 100).toFixed(0)}% annualized volatility. ` +
        `Use position-sizing (Kelly / fixed-fractional) and a stop-loss around 1.5× ATR.`;
    }
    if (/news|sentiment/.test(l)) {
      return `Recent news sentiment for ${meta.symbol} is being scored by **FinBERT** in real time. ` +
        `Check the News & Sentiment panel for the aggregated score and headline list.`;
    }
    if (/compare|vs|versus/.test(l)) {
      return `Open the **Compare Stocks** tab to overlay ${meta.symbol} against any other symbols on a normalized % basis.`;
    }
    return `I can help with **predictions**, **buy/sell signals**, **model accuracy**, **risk** and **comparisons** for ${meta.symbol}. ` +
      `Try one of the quick-start prompts below 👇`;
  };

  const send = (q: string) => {
    if (!q.trim()) return;
    const user: Msg = { role: "user", text: q, ts: Date.now() };
    setMsgs((m) => [...m, user]);
    setInput("");
    setTimeout(() => {
      setMsgs((m) => [...m, { role: "ai", text: reply(q), ts: Date.now() }]);
    }, 450);
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-teal-400 to-indigo-500 grid place-items-center glow-accent shadow-2xl hover:scale-105 transition-transform"
        title="Ask QuantumGPT"
      >
        {open ? <X className="w-6 h-6 text-[#07090f]" /> : <MessageSquare className="w-6 h-6 text-[#07090f]" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[min(380px,calc(100vw-2rem))] card flex flex-col shadow-2xl fade-in overflow-hidden" style={{ height: "min(560px, 80vh)" }}>
          <div className="p-3 border-b border-[#1f2942] flex items-center gap-2 bg-gradient-to-r from-teal-500/10 to-indigo-500/10">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-indigo-500 grid place-items-center">
              <Bot className="w-4 h-4 text-[#07090f]" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold flex items-center gap-1">
                QuantumGPT <Sparkles className="w-3 h-3 text-teal-400" />
              </div>
              <div className="text-[10px] text-slate-400">AI analyst · {meta.symbol}</div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400"><span className="pulse-dot" /> online</div>
          </div>

          <div className="flex-1 overflow-auto p-3 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={"flex gap-2 " + (m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "ai" && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-indigo-500 grid place-items-center shrink-0">
                    <Bot className="w-3 h-3 text-[#07090f]" />
                  </div>
                )}
                <div className={
                  "max-w-[80%] px-3 py-2 rounded-lg text-xs leading-relaxed whitespace-pre-wrap " +
                  (m.role === "user"
                    ? "bg-gradient-to-r from-teal-400 to-indigo-500 text-[#07090f] font-medium"
                    : "bg-[#1a2138] text-slate-200 border border-[#1f2942]")
                } dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>") }} />
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)}
                className="text-[10px] px-2 py-1 rounded-full border border-[#1f2942] hover:border-teal-500/50 hover:text-teal-400 text-slate-400">
                {s}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); send(input); }}
                className="p-3 border-t border-[#1f2942] flex items-center gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)}
                   placeholder="Ask anything about this stock…"
                   className="flex-1 bg-[#0d1220] border border-[#1f2942] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-teal-500/60" />
            <button type="submit" className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-400 to-indigo-500 grid place-items-center">
              <Send className="w-4 h-4 text-[#07090f]" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
