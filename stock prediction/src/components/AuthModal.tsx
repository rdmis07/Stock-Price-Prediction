import { useState } from "react";
import { Zap, Mail, Lock, User, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onAuth: (user: { name: string; email: string }) => void;
}

export default function AuthModal({ open, onClose, onAuth }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("trader@quantumstock.io");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      onAuth({ name: name || email.split("@")[0], email });
      setLoading(false);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4">
      <div className="card w-full max-w-sm p-6 relative fade-in">
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-200">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-indigo-500 grid place-items-center glow-accent">
            <Zap className="w-5 h-5 text-[#07090f]" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-bold text-slate-100">QuantumStock</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">AI Prediction System</div>
          </div>
        </div>

        <h2 className="text-xl font-bold mt-4">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
        <p className="text-xs text-slate-400 mb-4">JWT-secured · End-to-end encrypted</p>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <Field icon={User} placeholder="Full name" value={name} onChange={setName} />
          )}
          <Field icon={Mail} placeholder="Email address" type="email" value={email} onChange={setEmail} />
          <Field icon={Lock} placeholder="Password" type="password" value={password} onChange={setPassword} />

          <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-gradient-to-r from-teal-400 to-indigo-500 text-[#07090f] font-bold disabled:opacity-60">
            {loading ? "Authenticating…" : (mode === "login" ? "Sign In" : "Create Account")}
          </button>
        </form>

        <div className="text-center text-xs text-slate-400 mt-4">
          {mode === "login" ? (
            <>No account? <button onClick={() => setMode("signup")} className="text-teal-400 font-semibold">Sign up</button></>
          ) : (
            <>Already have one? <button onClick={() => setMode("login")} className="text-teal-400 font-semibold">Sign in</button></>
          )}
        </div>

        <div className="mt-4 p-2.5 rounded bg-[#0d1220] border border-[#1f2942] text-[10px] text-slate-500 text-center">
          🔑 Demo credentials are pre-filled. Click Sign In to enter.
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, ...p }: any) {
  return (
    <div className="relative">
      <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
      <input
        {...p}
        onChange={(e) => p.onChange(e.target.value)}
        className="w-full bg-[#0d1220] border border-[#1f2942] rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-teal-500/60"
      />
    </div>
  );
}
