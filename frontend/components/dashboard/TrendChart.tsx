"use client";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";

type Range = "7d" | "30d";

// deterministic pseudo-series (no Math.random at module scope) per metric
function series(range: Range, base: number, drift: number): number[] {
  const n = range === "7d" ? 7 : 30;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const wave = Math.sin(i / 2.2) * drift * 0.5;
    const ramp = (i / n) * drift;
    out.push(Math.max(0, Math.round(base + ramp + wave)));
  }
  return out;
}

const METRICS = [
  { key: "compliance", label: "Compliance score", base: 84, drift: 8, suffix: "%", color: "#36e9d2" },
  { key: "docs", label: "Documents indexed", base: 3800, drift: 400, suffix: "", color: "#1fb8a6" },
  { key: "conflicts", label: "Open conflicts", base: 14, drift: -7, suffix: "", color: "#f4d488" },
] as const;

export function TrendChart({ range, setRange }: { range: Range; setRange: (r: Range) => void }) {
  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("compliance");
  const active = METRICS.find((m) => m.key === metric)!;
  const data = useMemo(() => series(range, active.base, active.drift), [range, active]);

  const W = 600, H = 180, pad = 8;
  const max = Math.max(...data), min = Math.min(...data);
  const span = max - min || 1;
  const stepX = (W - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = H - pad - ((v - min) / span) * (H - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`;
  const last = data[data.length - 1];
  const first = data[0];
  const change = Math.round(((last - first) / (first || 1)) * 100);

  return (
    <div className="glass-glow p-6 flex flex-col h-full">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-tealGlow" />
          <h2 className="display text-lg font-semibold">Trends</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* metric switch */}
          <div className="flex rounded-full border border-border p-0.5">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                  metric === m.key ? "bg-teal/15 text-tealGlow" : "text-muted hover:text-text"
                }`}
              >
                {m.label.split(" ")[0]}
              </button>
            ))}
          </div>
          {/* range toggle */}
          <div className="flex rounded-full border border-border p-0.5">
            {(["7d", "30d"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                  range === r ? "bg-gold/15 text-goldGlow" : "text-muted hover:text-text"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-baseline gap-3">
        <span className="display text-3xl font-semibold text-gradient-teal">
          {last.toLocaleString()}
          {active.suffix}
        </span>
        <span className={`text-xs ${change >= 0 ? "text-tealGlow" : "text-danger"}`}>
          {change >= 0 ? "▲" : "▼"} {Math.abs(change)}% over {range}
        </span>
      </div>

      <div className="flex-1 w-full min-h-[176px] relative mt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={active.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={active.color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            key={`area-${metric}-${range}`}
            d={area}
            fill="url(#trendFill)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          />
          <motion.path
            key={`line-${metric}-${range}`}
            d={line}
            fill="none"
            stroke={active.color}
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill={active.color} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );
}
