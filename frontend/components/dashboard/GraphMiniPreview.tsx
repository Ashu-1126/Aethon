"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Share2, ArrowRight } from "lucide-react";

const nodes = [
  { id: "eq", x: 50, y: 50, c: "#36e9d2", label: "Pump P-204" },
  { id: "r1", x: 22, y: 24, c: "#f4d488", label: "OISD-116" },
  { id: "r2", x: 80, y: 26, c: "#f4d488", label: "Factory Act" },
  { id: "p", x: 24, y: 76, c: "#1fb8a6", label: "SOP-44" },
  { id: "i", x: 78, y: 74, c: "#e08a8a", label: "Near-miss" },
];
const edges: [string, string][] = [
  ["eq", "r1"], ["eq", "r2"], ["eq", "p"], ["eq", "i"],
];
const find = (id: string) => nodes.find((n) => n.id === id)!;

export function GraphMiniPreview() {
  return (
    <div className="glass-glow p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-tealGlow" />
          <h2 className="display text-lg font-semibold">Knowledge Graph</h2>
        </div>
        <Link href="/knowledge-graph" className="inline-flex items-center gap-1 text-xs text-tealGlow hover:underline">
          Explore <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-base/60">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          {edges.map(([a, b], i) => {
            const na = find(a), nb = find(b);
            return (
              <motion.line
                key={i}
                x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke="#13413c" strokeWidth="0.4"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {edges.map(([a, b], i) => {
            const na = find(a), nb = find(b);
            return (
              <motion.circle
                key={`p${i}`}
                r="0.9" fill="#f4d488"
                initial={{ cx: na.x, cy: na.y, opacity: 0 }}
                animate={{ cx: [na.x, nb.x], cy: [na.y, nb.y], opacity: [0, 1, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
              />
            );
          })}
        </svg>
        {nodes.map((n, i) => (
          <motion.div
            key={n.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.08, type: "spring", stiffness: 180 }}
          >
            <motion.span
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 backdrop-blur"
              style={{ borderColor: n.c, background: `${n.c}1a` }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: n.c }} />
            </motion.span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
