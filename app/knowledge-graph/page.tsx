"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Reveal } from "@/components/motion/Reveal";
import { motion } from "framer-motion";
import { useState } from "react";

type Node = { id: string; label: string; type: string; x: number; y: number };
const nodes: Node[] = [
  { id: "eq", label: "Pump P-204", type: "equipment", x: 50, y: 48 },
  { id: "reg1", label: "OISD-116 §7.2", type: "regulation", x: 22, y: 22 },
  { id: "reg2", label: "Factory Act §36", type: "regulation", x: 78, y: 20 },
  { id: "proc", label: "SOP-44", type: "procedure", x: 20, y: 74 },
  { id: "inc", label: "Near-miss #1187", type: "incident", x: 80, y: 72 },
  { id: "man", label: "OEM Manual", type: "document", x: 50, y: 86 },
  { id: "wo", label: "WorkOrder #5521", type: "document", x: 14, y: 48 },
];
const edges: [string, string][] = [
  ["eq", "reg1"], ["eq", "reg2"], ["eq", "proc"],
  ["eq", "inc"], ["eq", "man"], ["eq", "wo"], ["proc", "reg2"], ["inc", "man"],
];

const color: Record<string, string> = {
  equipment: "#36e9d2",
  regulation: "#f4d488",
  procedure: "#1fb8a6",
  incident: "#e08a8a",
  document: "#7fa39c",
};

export default function KnowledgeGraph() {
  const [hover, setHover] = useState<string | null>(null);
  const find = (id: string) => nodes.find((n) => n.id === id)!;

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <main className="md:ml-60">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-widest text-tealGlow">
              Knowledge Graph
            </p>
            <h1 className="display mt-1 text-3xl font-semibold md:text-4xl">
              The relationships no one team can hold
            </h1>
            <p className="mt-3 max-w-xl text-muted">
              Every entity — equipment, regulation, procedure, incident — linked into one
              traversable structure. Hover a node to trace its connections.
            </p>
          </Reveal>

          <Reveal dir="scale" delay={0.2}>
            <div className="glass-glow mt-8 overflow-hidden p-2">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-base/60">
                <div className="aurora absolute inset-0 opacity-20" />
                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                  {edges.map(([a, b], i) => {
                    const na = find(a), nb = find(b);
                    const lit = hover === a || hover === b;
                    return (
                      <motion.line
                        key={i}
                        x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                        stroke={lit ? "#36e9d2" : "#13413c"}
                        strokeWidth={lit ? 0.5 : 0.3}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}
                  {/* traveling pulse on equipment edges */}
                  {edges.map(([a, b], i) => {
                    const na = find(a), nb = find(b);
                    return (
                      <motion.circle
                        key={`p${i}`}
                        r={0.7}
                        fill="#f4d488"
                        initial={{ cx: na.x, cy: na.y, opacity: 0 }}
                        animate={{ cx: [na.x, nb.x], cy: [na.y, nb.y], opacity: [0, 1, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
                      />
                    );
                  })}
                </svg>

                {nodes.map((n, i) => (
                  <motion.div
                    key={n.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                    style={{ left: `${n.x}%`, top: `${n.y}%` }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4 + i * 0.1, type: "spring", stiffness: 180 }}
                    onMouseEnter={() => setHover(n.id)}
                    onMouseLeave={() => setHover(null)}
                    whileHover={{ scale: 1.15 }}
                  >
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 4 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-full border-2 backdrop-blur-md"
                        style={{
                          borderColor: color[n.type],
                          background: `${color[n.type]}1a`,
                          boxShadow: hover === n.id ? `0 0 24px ${color[n.type]}` : "none",
                        }}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: color[n.type] }} />
                      </span>
                      <span className="whitespace-nowrap rounded-full bg-base/80 px-2 py-0.5 font-mono text-[9px] text-text backdrop-blur">
                        {n.label}
                      </span>
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* legend */}
          <Reveal delay={0.3}>
            <div className="mt-6 flex flex-wrap gap-4">
              {Object.entries(color).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-xs text-muted">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: v }} />
                  <span className="capitalize">{k}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </main>
    </div>
  );
}
