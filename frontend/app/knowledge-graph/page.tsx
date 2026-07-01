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

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setData(await graph.get());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const nodes = useMemo(() => (data ? layout(data.nodes, data.edges) : []), [data]);

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <PageContainer 
        size="wide"
        hero={
          <PageHero 
            badgeLabel="✦ Graph"
            badgeText="Relationships"
            title1="The connections"
            title2="no team can hold"
            description="Every entity — equipment, regulation, procedure, incident — linked into one traversable structure. Hover a node to trace its connections."
          />
        }
      >

          {error ? (
            <div className="mt-8">
              <ErrorState
                message="Couldn't load the knowledge graph. The backend may be offline."
                onRetry={load}
              />
            </div>
          ) : loading ? (
            <Skeleton className="mt-8 aspect-[3/4] w-full rounded-2xl sm:aspect-[16/10]" />
          ) : !data || data.nodes.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                icon={Share2}
                title="No graph yet"
                message="Ingest documents first — entities and relationships will appear here automatically."
              />
            </div>
          ) : (
            <>
              <Reveal dir="scale" delay={0.2}>
                <GraphCanvas data={data} nodes={nodes} />
              </Reveal>

              {/* legend */}
              <Reveal delay={0.3}>
                <div className="mt-6 flex flex-wrap gap-4">
                  {Object.entries(GRAPH_COLORS).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-xs text-muted">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: v }} />
                      <span className="capitalize">{k}</span>
                    </div>
                  ))}
                </div>
              </Reveal>
            </>
          )}
      </PageContainer>
    </div>
  );
}
