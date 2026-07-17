"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { TiltCard } from "@/components/motion/TiltCard";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { Counter } from "@/components/ui/Counter";
import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  FileStack,
  ShieldCheck,
  AlertTriangle,
  Share2,
  TrendingUp,
  Clock,
} from "lucide-react";
import { dashboard, compliance } from "@/lib/api";
import type { DashboardStats, ComplianceAudit } from "@/lib/types";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { CompoundRiskPanel } from "@/components/dashboard/CompoundRiskPanel";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ZoneStatusGrid } from "@/components/dashboard/ZoneStatusGrid";
import { ConflictsPanel } from "@/components/dashboard/ConflictsPanel";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { PipelineStatus } from "@/components/dashboard/PipelineStatus";
import { ExpandOnClick } from "@/components/ui/expand-on-click";
import { PanelExpand } from "@/components/ui/panel-expand";
import { GraphMiniPreview } from "@/components/dashboard/GraphMiniPreview";
import Link from "next/link";
import { PageHero } from "@/components/layout/PageHero";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [audit, setAudit] = useState<ComplianceAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [range, setRange] = useState<"7d" | "30d">("7d");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    
    // Load stats first, don't block on compliance
    try {
      const s = await dashboard.stats();
      setStats(s);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }

    // Load compliance separately (takes longer due to LLM)
    try {
      const a = await compliance.audit();
      setAudit(a);
    } catch {
      // If compliance fails, we don't break the whole dashboard
      console.error("Failed to load compliance audit");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(
    () =>
      stats
        ? [
            { icon: FileStack, label: "Documents indexed", value: stats.docs_indexed, delta: "live", glow: "teal" as const, href: "/upload" },
            { icon: Share2, label: "Graph relationships", value: stats.relationships, delta: "live", glow: "teal" as const, href: "/knowledge-graph" },
            { icon: ShieldCheck, label: "Compliance score", value: stats.compliance_score, suffix: "%", delta: "audit-ready", glow: "gold" as const, href: "/compliance" },
            { icon: AlertTriangle, label: "Open conflicts", value: stats.open_conflicts, delta: "needs review", glow: "gold" as const, href: "#conflicts" },
          ]
        : [],
    [stats]
  );

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <PageContainer 
        size="wide"
        hero={
          <PageHero 
            badgeLabel="✦ Live" 
            badgeText="Operations Console"
            title1="Plant Intelligence"
            title2="Overview"
            description="Monitor real-time insights, compliance, and conflicts across your entire plant."
          />
        }
      >
          <Reveal>
            {/* quick actions */}
            <QuickActions />
          </Reveal>

          {error ? (
            <div className="mt-8">
              <ErrorState
                message="Couldn't load the dashboard. The backend may be offline."
                onRetry={load}
              />
            </div>
          ) : (
            <>
              {/* KPI cards */}
              {loading ? (
                <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <CardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
                  {kpis.map((k) => (
                    <StaggerItem key={k.label}>
                      <Link href={k.href} className="block h-full">
                        <TiltCard className="group p-6" intensity={8}>
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
                            <span className="font-mono text-[10px] text-muted transition-colors group-hover:text-tealGlow">
                              {k.delta} →
                            </span>
                          </div>
                          <p className="display text-3xl font-semibold">
                            <Counter to={k.value} suffix={k.suffix ?? ""} />
                          </p>
                          <p className="mt-1 text-xs text-muted">{k.label}</p>
                        </TiltCard>
                      </Link>
                    </StaggerItem>
                  ))}
                </Stagger>
              )}

              <div className="mt-6 grid gap-5 lg:grid-cols-3">
                {/* activity feed */}
                <Reveal className="lg:col-span-2">
                  <PanelExpand render={() => (
                  <div className="glass-glow p-6">
                    <div className="mb-5 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-tealGlow" />
                      <h2 className="display text-lg font-semibold">Live Intelligence Feed</h2>
                    </div>
                    {loading ? (
                      <div className="space-y-3">
                        {[0, 1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : stats && stats.feed.length > 0 ? (
                      <div className="space-y-3">
                        {stats.feed.map((a, i) => (
                          <ExpandOnClick
                            key={i}
                            accent="teal"
                            collapsed={
                              <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="flex flex-col gap-2 rounded-xl border border-border bg-base/50 px-4 py-3 transition-colors hover:border-teal/30 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="h-1.5 w-1.5 flex-none animate-pulseGlow rounded-full bg-tealGlow" />
                                  <span className="text-sm">{a.text}</span>
                                </div>
                                <div className="flex flex-none items-center gap-3 pl-5 sm:pl-0">
                                  <span className="chip">{a.tag}</span>
                                  <span className="flex items-center gap-1 font-mono text-[10px] text-muted">
                                    <Clock className="h-3 w-3" /> {a.time}
                                  </span>
                                </div>
                              </motion.div>
                            }
                            expanded={
                              <div>
                                <span className="chip mb-3">{a.tag}</span>
                                <h3 className="display text-xl font-semibold">{a.text}</h3>
                                <p className="mt-2 flex items-center gap-1 font-mono text-xs text-muted">
                                  <Clock className="h-3.5 w-3.5" /> {a.time} ago
                                </p>
                                <p className="mt-4 text-sm leading-relaxed text-muted">
                                  This event was produced by AETHON&apos;s intelligence pipeline and is
                                  fully traceable to its source documents. Every action — ingested,
                                  flagged, linked, or exported — carries an audit trail for
                                  regulatory review.
                                </p>
                              </div>
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={TrendingUp}
                        title="No activity yet"
                        message="Ingest documents to start building intelligence."
                      />
                    )}
                  </div>
                  )} />
                </Reveal>

                {/* compliance ring */}
                <Reveal dir="left">
                  <PanelExpand render={() => (
                  <div className="glass-glow flex flex-col items-center justify-center p-6">
                    <h2 className="display mb-6 text-lg font-semibold">Compliance Coverage</h2>
                    {loading || !audit ? (
                      <Skeleton className="h-36 w-36 rounded-full" />
                    ) : (
                      <>
                        <ComplianceRing value={audit.overall_score} />
                        <div className="mt-6 w-full space-y-2 text-xs">
                          {audit.standards.map((s) => (
                            <div key={s.standard}>
                              <div className="mb-1 flex justify-between text-muted">
                                <span>{s.standard}</span>
                                <span className="font-mono text-tealGlow">{s.score}%</span>
                              </div>
                              <div className="h-1 overflow-hidden rounded-full bg-border">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${s.score}%` }}
                                  transition={{ duration: 1, delay: 0.3 }}
                                  className="h-full rounded-full bg-gradient-to-r from-teal to-gold"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  )} />
                </Reveal>
              </div>

              {/* trends + compound-risk engine */}
              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <Reveal>
                  <TrendChart range={range} setRange={setRange} />
                </Reveal>
                <Reveal dir="left">
                  <CompoundRiskPanel />
                </Reveal>
              </div>

              {/* zone status + open conflicts */}
              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <Reveal>
                  <ZoneStatusGrid />
                </Reveal>
                <Reveal dir="left">
                  <ConflictsPanel />
                </Reveal>
              </div>

              {/* depth: RCA insight + pipeline + graph preview */}
              <div className="mt-6 grid gap-5 lg:grid-cols-3">
                <Reveal className="lg:col-span-1">
                  <InsightCard />
                </Reveal>
                <Reveal delay={0.1}>
                  <PipelineStatus />
                </Reveal>
                <Reveal dir="left" delay={0.15}>
                  <GraphMiniPreview />
                </Reveal>
              </div>
            </>
          )}
      </PageContainer>
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
          animate={{ strokeDashoffset: c - (c * value) / 100 }}
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
        <span className="display text-3xl font-semibold text-gradient-teal">
          <Counter to={value} suffix="%" />
        </span>
        <span className="text-[10px] text-muted">audit-ready</span>
      </div>
    </div>
  );
}
