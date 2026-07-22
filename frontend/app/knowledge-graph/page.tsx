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
                  ))}
                </div>
              </Reveal>
            </>
          )}
      </PageContainer>
    </div>
  );
}
