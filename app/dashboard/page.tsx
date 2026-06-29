"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TiltCard } from "@/components/motion/TiltCard";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { motion } from "framer-motion";
import {
  FileStack,
  ShieldCheck,
  AlertTriangle,
  Share2,
  TrendingUp,
  Clock,
} from "lucide-react";

const kpis = [
  { icon: FileStack, label: "Documents indexed", value: "4,182", delta: "+126 today", glow: "teal" },
  { icon: Share2, label: "Graph relationships", value: "38,914", delta: "live", glow: "teal" },
  { icon: ShieldCheck, label: "Compliance score", value: "92%", delta: "+4% wk", glow: "gold" },
  { icon: AlertTriangle, label: "Open conflicts", value: "7", delta: "3 critical", glow: "gold" },
];

const activity = [
  { t: "P&ID drawing · Unit 4 cooling loop", tag: "ingested", time: "2m" },
  { t: "Conflict: torque spec 40 Nm vs 55 Nm (Pump P-204)", tag: "flagged", time: "11m" },
  { t: "OISD-116 §7.2 mapped to 14 procedures", tag: "linked", time: "26m" },
  { t: "RCA generated · recurring bearing failure", tag: "insight", time: "1h" },
  { t: "Audit evidence package · Factory Act", tag: "exported", time: "2h" },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen">
      <AppSidebar />
      <main className="md:ml-60">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-widest text-tealGlow">
              Operations Console
            </p>
            <h1 className="display mt-1 text-3xl font-semibold md:text-4xl">
              Plant Intelligence Overview
            </h1>
          </Reveal>

          <Stagger className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <StaggerItem key={k.label}>
                <TiltCard className="p-6" intensity={8}>
                  <div className="mb-4 flex items-center justify-between">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                        k.glow === "teal"
                          ? "border-teal/30 bg-teal/10 text-tealGlow"
                          : "border-gold/30 bg-gold/10 text-goldGlow"
                      }`}
                    >
                      <k.icon className="h-5 w-5" strokeWidth={1.6} />
                    </span>
                    <span className="font-mono text-[10px] text-muted">{k.delta}</span>
                  </div>
                  <p className="display text-3xl font-semibold">{k.value}</p>
                  <p className="mt-1 text-xs text-muted">{k.label}</p>
                </TiltCard>
              </StaggerItem>
            ))}
          </Stagger>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {/* activity feed */}
            <Reveal className="lg:col-span-2">
              <div className="glass-glow p-6">
                <div className="mb-5 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-tealGlow" />
                  <h2 className="display text-lg font-semibold">Live Intelligence Feed</h2>
                </div>
                <div className="space-y-3">
                  {activity.map((a, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-center justify-between rounded-xl border border-border bg-base/50 px-4 py-3 transition-colors hover:border-teal/30"
                    >
                      <div className="flex items-center gap-3">
                        <span className="h-1.5 w-1.5 animate-pulseGlow rounded-full bg-tealGlow" />
                        <span className="text-sm">{a.t}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="chip">{a.tag}</span>
                        <span className="flex items-center gap-1 font-mono text-[10px] text-muted">
                          <Clock className="h-3 w-3" /> {a.time}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* compliance ring */}
            <Reveal dir="left">
              <div className="glass-glow flex flex-col items-center justify-center p-6">
                <h2 className="display mb-6 text-lg font-semibold">Compliance Coverage</h2>
                <ComplianceRing value={92} />
                <div className="mt-6 w-full space-y-2 text-xs">
                  {[
                    ["Factory Act", 96],
                    ["OISD-116", 91],
                    ["DGMS", 88],
                    ["PESO", 84],
                  ].map(([n, v]) => (
                    <div key={n as string}>
                      <div className="mb-1 flex justify-between text-muted">
                        <span>{n}</span>
                        <span className="font-mono text-tealGlow">{v}%</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-border">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${v}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.3 }}
                          className="h-full rounded-full bg-gradient-to-r from-teal to-gold"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </main>
    </div>
  );
}

function ComplianceRing({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-36 w-36">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#13413c" strokeWidth="8" />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="url(#ring)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c - (c * value) / 100 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1fb8a6" />
            <stop offset="100%" stopColor="#f4d488" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="display text-3xl font-semibold text-gradient-teal">{value}%</span>
        <span className="text-[10px] text-muted">audit-ready</span>
      </div>
    </div>
  );
}
