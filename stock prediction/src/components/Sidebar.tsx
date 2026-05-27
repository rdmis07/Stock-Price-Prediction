import {
  LayoutDashboard, LineChart, Brain, Newspaper, Briefcase,
  GitCompare, Settings, LogOut, Zap, BookOpen, Database,
} from "lucide-react";
import { cn } from "../utils/cn";

export type ViewKey =
  | "dashboard" | "predict" | "models" | "news"
  | "portfolio" | "compare" | "data" | "docs" | "settings";

const NAV: { key: ViewKey; label: string; icon: any; badge?: string }[] = [
  { key: "dashboard", label: "Dashboard",       icon: LayoutDashboard },
  { key: "predict",   label: "AI Predictions",  icon: Brain, badge: "AI" },
  { key: "models",    label: "Model Lab",       icon: LineChart },
  { key: "news",      label: "News & Sentiment",icon: Newspaper },
  { key: "portfolio", label: "Portfolio",       icon: Briefcase },
  { key: "compare",   label: "Compare Stocks",  icon: GitCompare },
  { key: "settings",  label: "Settings",        icon: Settings },
];

interface Props {
  active: ViewKey;
  onChange: (k: ViewKey) => void;
  user: { name: string; email: string } | null;
  onLogout: () => void;
}

export default function Sidebar({ active, onChange, user, onLogout }: Props) {
  return (
    <aside className="w-64 shrink-0 hidden lg:flex flex-col border-r border-[#1f2942] bg-[#0a0e1a]/80 backdrop-blur">
      <div className="px-5 py-5 border-b border-[#1f2942] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-indigo-500 grid place-items-center glow-accent">
          <Zap className="w-5 h-5 text-[#07090f]" strokeWidth={2.5} />
        </div>
        <div>
          <div className="font-bold text-slate-100 leading-tight">QuantumStock</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">AI Prediction System</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                "border border-transparent",
                isActive
                  ? "tab-active"
                  : "text-slate-400 hover:text-slate-100 hover:bg-[#131a2c]",
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-teal-400 to-indigo-500 text-[#07090f]">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#1f2942]">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center font-bold text-sm">
            {user?.name?.[0]?.toUpperCase() ?? "G"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{user?.name ?? "Guest"}</div>
            <div className="text-[11px] text-slate-500 truncate">{user?.email ?? "Not signed in"}</div>
          </div>
          <button onClick={onLogout} className="p-1.5 rounded-md hover:bg-[#1a2138] text-slate-400 hover:text-bear" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
