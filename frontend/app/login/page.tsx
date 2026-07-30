"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hexagon, Lock, Loader2 } from "lucide-react";
import { auth, ApiError } from "@/lib/api";
import { saveSession } from "@/lib/session";
import { Reveal } from "@/components/motion/Reveal";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password123");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const enterDemoSession = () => {
    saveSession("demo-token", "admin", rememberMe);
    router.replace("/");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await auth.login(username, password);
      saveSession(res.token, res.role, rememberMe);
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError && err.offline) {
        enterDemoSession();
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to connect to the server.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Reveal className="w-full max-w-sm">
        <div className="glass-glow flex flex-col items-center p-8 text-center sm:p-10">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-teal/30 bg-teal/10 text-tealGlow shadow-glow-teal">
            <Hexagon className="h-7 w-7" strokeWidth={1.5} />
          </div>
          
          <h1 className="display text-2xl font-semibold">AETHON</h1>
          <p className="mt-2 text-sm text-muted">Authenticate to access operations intelligence.</p>

          <form onSubmit={handleLogin} className="mt-8 w-full space-y-4">
            {error && (
              <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}
            
            <div className="space-y-3 text-left">
              <div>
                <label htmlFor="username" className="mb-1 block text-xs font-medium text-muted">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-border bg-base/50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-teal/50 focus:bg-teal/5"
                  placeholder="admin"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1 block text-xs font-medium text-muted">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-border bg-base/50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-teal/50 focus:bg-teal/5"
                    placeholder="••••••••"
                  />
                  <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                </div>
              </div>

              <label htmlFor="remember-me" className="flex select-none items-center gap-2 text-xs text-muted">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border bg-base/50 accent-teal"
                />
                Remember me on this device
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-base transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </button>
          </form>

          <div className="mt-8 text-[11px] text-muted">
            Hint: admin / password123
          </div>
        </div>
      </Reveal>
    </div>
  );
}
