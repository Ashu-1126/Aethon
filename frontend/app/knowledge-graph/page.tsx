"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { Reveal } from "@/components/motion/Reveal";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useEffect, useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Share2 } from "lucide-react";
import { graph } from "@/lib/api";
import type { GraphData, GraphNode, GraphEdge } from "@/lib/types";
import { GRAPH_COLORS } from "@/components/graph/GraphCanvas";
import { PageHero } from "@/components/layout/PageHero";

// Lazy-load the animation-heavy canvas (client-only) to keep this route light.
const GraphCanvas = dynamic(() => import("@/components/graph/GraphCanvas"), {
  ssr: false,
  loading: () => <Skeleton className="mt-8 aspect-[3/4] w-full rounded-2xl sm:aspect-[16/10]" />,
});

/**
 * Layout: honor API x/y if present, else compute a circular layout
 * (most-connected node centered).
 */
function layout(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  if (nodes.length && nodes.every((n) => n.x != null && n.y != null)) return nodes;
  if (!nodes.length) return [];
  const degree: Record<string, number> = {};
  edges.forEach((e) => {
    degree[e.from] = (degree[e.from] || 0) + 1;
    degree[e.to] = (degree[e.to] || 0) + 1;
  });
  const center = [...nodes].sort((a, b) => (degree[b.id] || 0) - (degree[a.id] || 0))[0];
  const ring = nodes.filter((n) => n.id !== center.id);
  return nodes.map((n) => {
    if (n.id === center.id) return { ...n, x: 50, y: 50 };
    const i = ring.findIndex((r) => r.id === n.id);
    const angle = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
    return { ...n, x: 50 + Math.cos(angle) * 34, y: 50 + Math.sin(angle) * 34 };
  });
}

export default function KnowledgeGraph() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [traversalLabel, setTraversalLabel] = useState("");
  const [depth, setDepth] = useState(2);
  const [traverserActive, setTraverserActive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    setTraverserActive(false);
    try {
      setData(await graph.get());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTraverse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!traversalLabel.trim()) return;
    setLoading(true);
    setError(false);
    try {
      const sub = await graph.traverse(traversalLabel, depth);
      setData(sub);
      setTraverserActive(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const positioned = useMemo(() => layout(data?.nodes ?? [], data?.edges ?? []), [data]);

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <PageContainer
        size="wide"
        hero={
          <PageHero
            badgeLabel="❖ Unified Memory Graph"
            badgeText="Enterprise Asset Context"
            title1="Assets,"
            title2="at the center."
            description="The Unified Asset Memory Graph interconnects Assets, Manuals, Maintenance Logs, Inspections, Sensors, Incidents, Work Orders, Spare Parts, Operators, Vendors, Regulations, RCA, and Compliance."
          />
        }
      >
        <Reveal>
          <>
            {/* Traversal controls */}
            <form onSubmit={handleTraverse} className="mb-6 flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={traversalLabel}
                onChange={(e) => setTraversalLabel(e.target.value)}
                placeholder="Search node (e.g. Pump P-204)…"
                className="flex-1 min-w-[200px] rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <select
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {[1, 2, 3, 4].map((d) => (
                  <option key={d} value={d} className="bg-[#0d1117]">
                    Depth {d}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-2 text-sm font-semibold text-black hover:bg-teal-400 transition-colors"
              >
                <Share2 size={14} /> Traverse
              </button>
              {traverserActive && (
                <button
                  type="button"
                  onClick={load}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  Reset
                </button>
              )}
            </form>

            {/* Stats bar */}
            {data && !loading && (
              <div className="mb-4 flex flex-wrap gap-4 text-xs text-white/40">
                <span>{data.nodes.length} nodes</span>
                <span>{data.edges.length} relationships</span>
                {traverserActive && (
                  <span className="text-teal-400">Showing subgraph for &ldquo;{traversalLabel}&rdquo;</span>
                )}
              </div>
            )}

            {/* Main content area */}
            {loading ? (
              <Skeleton className="aspect-[3/4] w-full rounded-2xl sm:aspect-[16/10]" />
            ) : error ? (
              <ErrorState
                title="Graph unavailable"
                message="Could not load the knowledge graph. Make sure the backend is running."
                onRetry={load}
              />
            ) : !data || data.nodes.length === 0 ? (
              <EmptyState
                icon={<Share2 size={32} className="text-white/30" />}
                title="Graph is empty"
                description="Upload documents to start building your knowledge graph."
              />
            ) : (
              <div className="rounded-2xl overflow-hidden border border-white/10">
                <GraphCanvas nodes={positioned} edges={data.edges} />
              </div>
            )}

            {/* Legend */}
            {data && data.nodes.length > 0 && !loading && (
              <div className="mt-4 flex flex-wrap gap-3">
                {Object.entries(GRAPH_COLORS).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-1.5 text-xs text-white/50">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: color as string }}
                    />
                    {type}
                  </div>
                ))}
              </div>
            )}
          </>
        </Reveal>
      </PageContainer>
    </div>
  );
}
