"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Flame, ShieldAlert, Activity, AlertTriangle, CheckCircle2,
  RefreshCw, Filter, ArrowUpRight, Zap, Info
} from "lucide-react";
import { assets } from "@/lib/api";
import type { RiskHeatmapItem } from "@/lib/types";
import Link from "next/link";

const TIER_CONFIG: Record<string, { label: string; border: string; bg: string; badge: string; text: string }> = {
  RED:    { label: "CRITICAL RISK", border: "border-danger/60", bg: "bg-danger/10", badge: "bg-danger text-white", text: "text-danger" },
  ORANGE: { label: "ELEVATED RISK", border: "border-orange-500/60", bg: "bg-orange-500/10", badge: "bg-orange-500 text-white", text: "text-orange-400" },
  YELLOW: { label: "MODERATE RISK", border: "border-gold/60", bg: "bg-gold/10", badge: "bg-gold text-black font-bold", text: "text-goldGlow" },
  GREEN:  { label: "SAFE / OPTIMAL", border: "border-teal/60", bg: "bg-teal/10", badge: "bg-tealGlow text-black font-bold", text: "text-tealGlow" },
};

export default function RiskHeatmapPage() {
  const [heatmap, setHeatmap] = useState<RiskHeatmapItem[] | null>(null);
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadHeatmap = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await assets.heatmap();
      setHeatmap(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHeatmap();
  }, [loadHeatmap]);

  const filtered = useMemo(() => {
    if (!heatmap) return [];
    if (tierFilter === "ALL") return heatmap;
    return heatmap.filter((item) => item.color_tier === tierFilter);
  }, [heatmap, tierFilter]);

  const counts = useMemo(() => {
    if (!heatmap) return { RED: 0, ORANGE: 0, YELLOW: 0, GREEN: 0 };
    return heatmap.reduce(
      (acc, item) => {
        acc[item.color_tier] = (acc[item.color_tier] || 0) + 1;
        return acc;
      },
      { RED: 0, ORANGE: 0, YELLOW: 0, GREEN: 0 } as Record<string, number>
    );
  }, [heatmap]);

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <PageContainer
        size="wide"
        hero={
          <PageHero
            badgeLabel="❖ Dynamic Risk Heatmap"
            badgeText="Plant-Wide Operational Vulnerability Grid"
            title1="Visualize risk,"
            title2="prevent failure."
            description="Dynamic multi-factor risk calculation combining Equipment Criticality, Operational Status Penalties, AI Failure Probabilities, Health Scores, and Recent Sensor/Anomaly Events into Green, Yellow, Orange, and Red vulnerability tiers."
          />
        }
      >
        {/* Risk Summary Filter Bar */}
        <div className="mt-6 glass-glow p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setTierFilter("ALL")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                tierFilter === "ALL" ? "bg-white/15 border border-white/20 text-text" : "text-muted hover:text-text"
              }`}
            >
              All Assets ({heatmap?.length ?? 0})
            </button>
            <button
              onClick={() => setTierFilter("RED")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                tierFilter === "RED" ? "bg-danger text-white" : "text-danger hover:bg-danger/10"
              }`}
            >
              Red Tiers ({counts.RED})
            </button>
            <button
              onClick={() => setTierFilter("ORANGE")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                tierFilter === "ORANGE" ? "bg-orange-500 text-white" : "text-orange-400 hover:bg-orange-500/10"
              }`}
            >
              Orange Tiers ({counts.ORANGE})
            </button>
            <button
              onClick={() => setTierFilter("YELLOW")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                tierFilter === "YELLOW" ? "bg-gold text-black font-bold" : "text-goldGlow hover:bg-gold/10"
              }`}
            >
              Yellow Tiers ({counts.YELLOW})
            </button>
            <button
              onClick={() => setTierFilter("GREEN")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                tierFilter === "GREEN" ? "bg-tealGlow text-black font-bold" : "text-tealGlow hover:bg-teal/10"
              }`}
            >
              Green Tiers ({counts.GREEN})
            </button>
          </div>

          <button
            onClick={loadHeatmap}
            className="flex items-center gap-1.5 text-xs font-medium text-tealGlow hover:underline shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Re-calculate Risk Scores
          </button>
        </div>

        {error ? (
          <div className="mt-8">
            <ErrorState message="Couldn't load Risk Heatmap." onRetry={loadHeatmap} />
          </div>
        ) : loading || !heatmap ? (
          <Skeleton className="mt-8 h-[550px] w-full rounded-2xl" />
        ) : (
          <div className="mt-6 space-y-6 pb-16">
            {/* Visual Heatmap Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((item) => {
                const tier = TIER_CONFIG[item.color_tier] ?? TIER_CONFIG.GREEN;
                return (
                  <motion.div
                    key={item.asset_tag}
                    whileHover={{ scale: 1.02 }}
                    className={`glass-glow p-5 border ${tier.border} ${tier.bg} flex flex-col justify-between space-y-4`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-bold text-text">{item.asset_tag}</span>
                        <span className={`chip text-[9px] font-bold px-2 py-0.5 rounded ${tier.badge}`}>
                          {item.color_tier} • {item.risk_score} SCORE
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-text mt-1">{item.asset_name}</h4>
                      <p className="text-[10px] text-muted/70 mt-0.5">{item.location} • {item.category}</p>
                    </div>

                    {/* Breakdown Matrix */}
                    <div className="border-t border-white/5 pt-3 space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted">Criticality Weight:</span>
                        <span className="font-mono font-bold text-text">{item.factors.criticality_weight}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Operational Penalty:</span>
                        <span className="font-mono font-bold text-text">+{item.factors.status_penalty}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Failure Probability:</span>
                        <span className="font-mono font-bold text-text">{item.factors.failure_probability}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Health Score:</span>
                        <span className="font-mono font-bold text-tealGlow">{item.factors.health_score}/100</span>
                      </div>
                    </div>

                    <Link
                      href={`/assets/${encodeURIComponent(item.asset_tag)}`}
                      className="mt-2 flex items-center justify-between text-xs font-semibold text-tealGlow hover:underline pt-2 border-t border-white/5"
                    >
                      <span>Investigate Asset</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </PageContainer>
    </div>
  );
}
