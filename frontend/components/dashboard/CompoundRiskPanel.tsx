"use client";
import { motion } from "framer-motion";
import { ShieldAlert, ChevronRight } from "lucide-react";
import { ExpandOnClick } from "@/components/ui/expand-on-click";
import { PanelExpand } from "@/components/ui/panel-expand";

type Risk = {
  title: string;
  zone: string;
  signals: string[];
  probability: number;
  severity: "critical" | "high" | "medium";
  eta: string;
  action: string;
};

// compound risks = combinations no single sensor flags (PS#8 core)
const RISKS: Risk[] = [
  {
    title: "Hot-work permit + elevated methane",
    zone: "Zone A · Refinery Unit-4",
    signals: ["Hot-work PTW-5521 active", "Methane 62% LEL", "Shift-change window"],
    probability: 82,
    severity: "critical",
    eta: "~40 min to critical threshold",
    action: "Suspend hot-work permit PTW-5521; purge zone; verify LEL < 10% before resuming.",
  },
  {
    title: "Confined-space entry + low O₂",
    zone: "Zone F · Storage & Dispatch",
    signals: ["Confined-space permit", "Oxygen 18.9%", "H₂S trending up"],
    probability: 67,
    severity: "high",
    eta: "~2 h to entry window",
    action: "Force-ventilate before entry; post standby rescue; continuous O₂/H₂S monitoring.",
  },
  {
    title: "Pressure spike during maintenance",
    zone: "Zone B · Processing Plant",
    signals: ["Maintenance order open", "Pressure 8.4 bar", "Vibration warning"],
    probability: 44,
    severity: "medium",
    eta: "monitoring",
    action: "Isolate line per LOTO before maintenance; recheck relief-valve setpoint.",
  },
];

const sev = {
  critical: { chip: "badge-critical", bar: "from-danger to-danger", dot: "bg-danger" },
  high: { chip: "badge-warning", bar: "from-warning to-gold", dot: "bg-warning" },
  medium: { chip: "badge-medium", bar: "from-teal to-gold", dot: "bg-teal" },
} as const;

export function CompoundRiskPanel() {
  return (
    <PanelExpand render={() => (
    <div className="glass-glow p-6">
      <div className="mb-1 flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-danger" />
        <h2 className="display text-lg font-semibold">Compound Risk Engine</h2>
      </div>
      <p className="mb-5 text-xs text-muted">
        Dangerous combinations no single sensor would flag — caught early.
      </p>

      <div className="space-y-3">
        {RISKS.map((r, i) => {
          const s = sev[r.severity];
          const collapsed = (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group rounded-xl border border-border bg-base/50 p-4 transition-colors hover:border-danger/30"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted">{r.zone}</p>
                </div>
                <span className={s.chip}>{r.severity}</span>
              </div>

              {/* contributing signals */}
              <div className="mb-3 flex flex-wrap gap-1.5">
                {r.signals.map((sig) => (
                  <span key={sig} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">
                    {sig}
                  </span>
                ))}
              </div>

              {/* probability bar */}
              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${r.probability}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className={`h-full rounded-full bg-gradient-to-r ${s.bar}`}
                  />
                </div>
                <span className="font-mono text-xs text-text">{r.probability}%</span>
                <ChevronRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5" />
              </div>
            </motion.div>
          );

          const expanded = (
            <div>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="display text-xl font-semibold">{r.title}</h3>
                  <p className="mt-1 font-mono text-xs text-muted">{r.zone}</p>
                </div>
                <span className={s.chip}>{r.severity}</span>
              </div>

              <div className="mb-5 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                  <div className={`h-full rounded-full bg-gradient-to-r ${s.bar}`} style={{ width: `${r.probability}%` }} />
                </div>
                <span className="font-mono text-sm text-text">{r.probability}% risk</span>
              </div>

              <p className="mb-2 text-xs uppercase tracking-wider text-muted">Contributing signals</p>
              <div className="mb-5 flex flex-wrap gap-2">
                {r.signals.map((sig) => (
                  <span key={sig} className="rounded-full border border-border bg-base/50 px-3 py-1 text-xs text-text">
                    {sig}
                  </span>
                ))}
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-base/50 p-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted">Prediction lead time</p>
                  <p className="mt-0.5 text-tealGlow">{r.eta}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted">Recommended intervention</p>
                  <p className="mt-0.5 leading-relaxed text-text">{r.action}</p>
                </div>
              </div>
            </div>
          );

          return (
            <ExpandOnClick
              key={i}
              collapsed={collapsed}
              expanded={expanded}
              accent={r.severity === "critical" ? "danger" : r.severity === "high" ? "gold" : "teal"}
            />
          );
        })}
      </div>
    </div>
    )} />
  );
}
