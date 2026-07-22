"use client";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { GraphData, GraphNode } from "@/lib/types";

const color: Record<string, string> = {
  asset: "#00d2b4",
  equipment: "#00d2b4",
  document: "#7fa39c",
  maintenance: "#a78bfa",
  inspection: "#60a5fa",
  sensor: "#f43f5e",
  incident: "#ef4444",
  work_order: "#f59e0b",
  spare_part: "#fbbf24",
  operator: "#38bdf8",
  vendor: "#c084fc",
  regulation: "#fbbf24",
  rca: "#f472b6",
  compliance: "#34d399",
  manual: "#818cf8",
  procedure: "#1fb8a6",
};

export const GRAPH_COLORS = color;


/** Animation-heavy SVG graph — lazy-loaded client-side. */
export default function GraphCanvas({
  data,
  nodes,
}: {
  data: GraphData;
  nodes: GraphNode[];
}) {
  const [hover, setHover] = useState<string | null>(null);
  const find = (id: string) => nodes.find((n) => n.id === id);

  // adjacency + degree — used for neighbor-highlighting and to find the "hub"
  const { neighbors, hubId } = useMemo(() => {
    const neighbors: Record<string, Set<string>> = {};
    const degree: Record<string, number> = {};
    nodes.forEach((n) => {
      neighbors[n.id] = new Set();
      degree[n.id] = 0;
    });
    data.edges.forEach((e) => {
      neighbors[e.from]?.add(e.to);
      neighbors[e.to]?.add(e.from);
      if (degree[e.from] != null) degree[e.from]++;
      if (degree[e.to] != null) degree[e.to]++;
    });
    let hubId = nodes[0]?.id ?? null;
    nodes.forEach((n) => {
      if ((degree[n.id] ?? 0) > (degree[hubId ?? ""] ?? 0)) hubId = n.id;
    });
    return { neighbors, hubId };
  }, [nodes, data.edges]);

  // is this node in focus given the current hover? (self or direct neighbor)
  const isActive = (id: string) =>
    !hover || hover === id || neighbors[hover]?.has(id);

  return (
    <div className="glass-glow mt-8 overflow-hidden p-2">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-base/60 sm:aspect-[16/10]">
        <div className="aurora absolute inset-0 opacity-20" />
        {/* Coordinates are container-relative percentages — the SAME space the
            nodes use for left/top — so lines connect exactly to node centers
            regardless of the container's aspect ratio. */}
        <svg className="absolute inset-0 h-full w-full">
          {data.edges.map((e, i) => {
            const na = find(e.from);
            const nb = find(e.to);
            if (!na || !nb) return null;
            const lit = hover === e.from || hover === e.to;
            const dim = hover && !lit; // an unrelated edge while hovering
            return (
              <motion.line
                key={i}
                x1={`${na.x}%`} y1={`${na.y}%`} x2={`${nb.x}%`} y2={`${nb.y}%`}
                stroke={lit ? "#36e9d2" : "#1a534c"}
                strokeWidth={lit ? 1.6 : 1}
                strokeLinecap="round"
                initial={{ opacity: 0 }}
                animate={{ opacity: dim ? 0.12 : lit ? 0.9 : 0.5 }}
                transition={{ duration: 0.8, delay: 0.3 + i * 0.08 }}
              />
            );
          })}

          {/* data pulses flowing along edges — brighter/faster on the focused ones */}
          {data.edges.map((e, i) => {
            const na = find(e.from);
            const nb = find(e.to);
            if (!na || !nb) return null;
            const lit = hover === e.from || hover === e.to;
            const dim = hover && !lit;
            return (
              <motion.circle
                key={`p${i}`}
                r={lit ? 4 : 2.6}
                fill={lit ? "#36e9d2" : "#f4d488"}
                initial={{ cx: `${na.x}%`, cy: `${na.y}%`, opacity: 0 }}
                animate={{
                  cx: [`${na.x}%`, `${nb.x}%`],
                  cy: [`${na.y}%`, `${nb.y}%`],
                  opacity: dim ? [0, 0.25, 0] : [0, 1, 0],
                }}
                transition={{
                  duration: lit ? 1.2 : 2.5,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "easeInOut",
                }}
                style={lit ? { filter: "drop-shadow(0 0 3px #36e9d2)" } : undefined}
              />
            );
          })}
        </svg>

        {nodes.map((n, i) => {
          const c = color[n.type] ?? "#7fa39c";
          const active = isActive(n.id);
          const isHub = n.id === hubId;
          const ping = isHub || hover === n.id; // radar ping on hub + hovered node
          return (
            <div
              key={n.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer h-10 w-10"
              style={{ left: `${n.x}%`, top: `${n.y}%`, zIndex: hover === n.id ? 20 : 10 }}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
            >
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: active ? 1 : 0.85, opacity: active ? 1 : 0.25 }}
                transition={{ delay: 0.4 + i * 0.1, type: "spring", stiffness: 180 }}
                whileHover={{ scale: 1.15 }}
                className="h-full w-full"
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
                  className="relative h-full w-full"
                >
                  <span className="absolute inset-0 flex items-center justify-center">
                    {/* radar ping rings */}
                    {ping &&
                      [0, 1].map((k) => (
                        <motion.span
                          key={k}
                          className="absolute inset-0 rounded-full border"
                          style={{ borderColor: c }}
                          initial={{ scale: 1, opacity: 0.6 }}
                          animate={{ scale: 2.4, opacity: 0 }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: k * 1,
                            ease: "easeOut",
                          }}
                        />
                      ))}

                    {/* node core */}
                    <span
                      className="flex h-full w-full items-center justify-center rounded-full border-2 backdrop-blur-md"
                      style={{
                        borderColor: c,
                        background: `${c}1a`,
                        boxShadow: hover === n.id ? `0 0 24px ${c}` : isHub ? `0 0 16px ${c}66` : "none",
                      }}
                    >
                      <motion.span
                        className="rounded-full"
                        style={{ background: c }}
                        animate={
                          isHub
                            ? { scale: [1, 1.5, 1], opacity: [1, 0.7, 1] }
                            : { scale: 1 }
                        }
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        initial={{ width: 8, height: 8 }}
                      />
                    </span>
                  </span>

                  {/* Label positioned absolutely below the circle */}
                  <div className="absolute top-[125%] left-1/2 -translate-x-1/2">
                    <span
                      className="whitespace-nowrap rounded-full bg-base/80 px-2 py-0.5 font-mono text-[9px] backdrop-blur"
                      style={{ color: hover === n.id ? c : "#eafaf6" }}
                    >
                      {n.label}
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
