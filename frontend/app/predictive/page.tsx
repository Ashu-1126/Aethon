"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Activity, Clock, AlertTriangle, ShieldCheck,
  RefreshCw, Wrench, Calendar, DollarSign, Loader2, Award, Zap
} from "lucide-react";
import { pdm, assets } from "@/lib/api";
import type { PdmPrediction, Asset } from "@/lib/types";
import Link from "next/link";

export default function PredictivePage() {
  const [fleet, setFleet] = useState<Asset[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [prediction, setPrediction] = useState<PdmPrediction | null>(null);
  const [allPredictions, setAllPredictions] = useState<PdmPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [list, preds] = await Promise.all([
        assets.list().catch(() => []),
        pdm.listAll().catch(() => []),
      ]);
      setFleet(list);
      setAllPredictions(preds);

      const activeTag = selectedTag || (list.length > 0 ? list[0].tag : "");
      if (activeTag) {
        setSelectedTag(activeTag);
        const p = await pdm.getAssetPdm(activeTag);
        setPrediction(p);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedTag]);

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectAsset = async (tag: string) => {
    setSelectedTag(tag);
    setLoading(true);
    try {
      const p = await pdm.getAssetPdm(tag);
      setPrediction(p);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRecompute = async () => {
    if (!selectedTag) return;
    setRecomputing(true);
    try {
      const p = await pdm.getAssetPdm(selectedTag, true);
      setPrediction(p);
    } catch {
      // optional fallback
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <PageContainer
        size="wide"
        hero={
          <PageHero
            badgeLabel="❖ Predictive Engine"
            badgeText="AI Predictive Maintenance & RUL Forecast"
            title1="Anticipate failures,"
            title2="maximize uptime."
            description="Synthesizes maintenance history, inspection reports, telemetry, operating hours, and failure records to compute Health Scores, Remaining Useful Life (RUL), Failure Probabilities %, and automated Inspection Schedules."
          />
        }
      >
        {/* Fleet Selector Toolbar */}
        <div className="mt-6 glass-glow p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted shrink-0">
              Select Industrial Asset:
            </span>
            <select
              value={selectedTag}
              onChange={(e) => handleSelectAsset(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text focus:border-teal/40 focus:outline-none"
            >
              {fleet.map((a) => (
                <option key={a.id} value={a.tag} className="bg-[#0d0d14]">
                  {a.tag} — {a.name} ({a.criticality.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRecompute}
            disabled={recomputing || !selectedTag}
            className="flex items-center gap-2 rounded-lg bg-teal/20 border border-teal/40 px-4 py-2 text-xs font-medium text-tealGlow hover:bg-teal/30 disabled:opacity-40 shrink-0"
          >
            {recomputing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Re-calculating AI PdM…
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" /> Re-run AI Forecast
              </>
            )}
          </button>
        </div>

        {error ? (
          <div className="mt-8">
            <ErrorState message="Couldn't load predictive maintenance data." onRetry={loadData} />
          </div>
        ) : loading || !prediction ? (
          <Skeleton className="mt-8 h-[500px] w-full rounded-2xl" />
        ) : (
          <div className="mt-6 space-y-6 pb-16">
            {/* Top KPI Metrics Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Health Score */}
              <div className="glass-glow p-5 flex flex-col justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Health Score</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-mono text-3xl font-bold text-tealGlow">{prediction.health_score}</span>
                  <span className="text-xs text-muted">/100</span>
                </div>
                <div className="mt-3 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-tealGlow" style={{ width: `${prediction.health_score}%` }} />
                </div>
              </div>

              {/* RUL Days */}
              <div className="glass-glow p-5 flex flex-col justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Remaining Useful Life (RUL)</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-bold text-text">{prediction.remaining_useful_life_days}</span>
                  <span className="text-xs font-semibold text-muted">Days</span>
                </div>
                <span className="text-[10px] font-mono text-muted/60 mt-1">
                  ~{prediction.remaining_useful_life_hours} Operating Hours
                </span>
              </div>

              {/* Failure Probability */}
              <div className="glass-glow p-5 flex flex-col justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Failure Probability</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`font-mono text-3xl font-bold ${prediction.failure_probability_percentage > 40 ? 'text-danger' : 'text-goldGlow'}`}>
                    {prediction.failure_probability_percentage}%
                  </span>
                </div>
                <div className="mt-3 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${prediction.failure_probability_percentage > 40 ? 'bg-danger' : 'bg-gold'}`}
                    style={{ width: `${prediction.failure_probability_percentage}%` }}
                  />
                </div>
              </div>

              {/* Criticality Score */}
              <div className="glass-glow p-5 flex flex-col justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Criticality Score</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-mono text-3xl font-bold text-violet-400">{prediction.criticality_score}</span>
                  <span className="text-xs text-muted">/100</span>
                </div>
                <span className="text-[10px] text-muted/60 mt-1">Impact Index</span>
              </div>

              {/* Next Inspection */}
              <div className="glass-glow p-5 flex flex-col justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Next Recommended Inspection</span>
                <div className="mt-2">
                  <span className="font-mono text-sm font-bold text-tealGlow block">{prediction.next_inspection_date}</span>
                  <span className="text-[10px] text-muted/70 block mt-0.5">{prediction.recommended_inspection_schedule}</span>
                </div>
              </div>
            </div>

            {/* Failure Mode & Action Details */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Failure Modes & Factors (6 Cols) */}
              <div className="lg:col-span-6 space-y-6">
                <div className="glass-glow p-6">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-goldGlow" /> Primary Failure Mode
                  </h3>
                  <p className="text-sm font-semibold text-text leading-relaxed">{prediction.primary_failure_mode}</p>
                </div>

                <div className="glass-glow p-6">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-tealGlow" /> Contributing Factors
                  </h3>
                  <div className="space-y-3">
                    {prediction.contributing_factors?.map((f, i) => (
                      <div key={i} className="rounded-lg border border-white/5 bg-white/3 p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-text">{f.factor}</span>
                          <span className="chip border border-teal/30 bg-teal/10 text-tealGlow text-[9px] uppercase font-bold">
                            {f.weight}
                          </span>
                        </div>
                        {f.citation && <p className="text-[10px] text-muted/60 font-mono">{f.citation}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Maintenance Recommendations & Financial Impact (6 Cols) */}
              <div className="lg:col-span-6 space-y-6">
                <div className="glass-glow p-6 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-tealGlow" /> Actionable Recommendations & Economic Impact
                  </h3>
                  <div className="space-y-4">
                    {prediction.maintenance_recommendations?.map((rec, i) => {
                      const downtime = rec.estimated_downtime_hours ?? 4.0;
                      const prodLoss = rec.estimated_production_loss_usd ?? (rec.estimated_cost_usd ? rec.estimated_cost_usd * 8 : 12500);
                      const maintCost = rec.estimated_maintenance_cost_usd ?? (rec.estimated_cost_usd || 1200);
                      const repairCost = rec.estimated_repair_cost_usd ?? 45000;
                      const riskRed = rec.risk_reduction_percentage ?? 85;
                      const roi = rec.roi_multiplier ?? Number(((prodLoss + repairCost) / maintCost).toFixed(1));
                      const opImpact = rec.operational_impact || "Prevents catastrophic failure and production stoppage.";

                      return (
                        <div key={i} className="rounded-xl border border-teal/30 bg-teal/5 p-4 space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="chip border border-teal/40 bg-teal/20 text-tealGlow text-[10px] font-bold uppercase">
                              {rec.priority} Priority
                            </span>
                            <span className="chip border border-gold/40 bg-gold/20 text-goldGlow text-[10px] font-bold font-mono">
                              ROI: {roi}x
                            </span>
                          </div>

                          <p className="text-xs font-bold text-text">{rec.action}</p>

                          {/* Operational Impact Summary */}
                          <p className="text-[11px] text-muted/90 leading-relaxed border-t border-white/5 pt-2">
                            <span className="text-tealGlow font-semibold">Operational Impact: </span>{opImpact}
                          </p>

                          {/* 6 Financial & Impact Metrics Grid */}
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[10px] font-mono">
                            <div className="p-2 rounded bg-white/3 border border-white/5 space-y-0.5">
                              <span className="text-muted/60 block">Downtime</span>
                              <span className="font-bold text-text">{downtime} hrs</span>
                            </div>

                            <div className="p-2 rounded bg-white/3 border border-white/5 space-y-0.5">
                              <span className="text-muted/60 block">Production Loss</span>
                              <span className="font-bold text-danger">${prodLoss.toLocaleString()}</span>
                            </div>

                            <div className="p-2 rounded bg-white/3 border border-white/5 space-y-0.5">
                              <span className="text-muted/60 block">Maintenance Cost</span>
                              <span className="font-bold text-goldGlow">${maintCost.toLocaleString()}</span>
                            </div>

                            <div className="p-2 rounded bg-white/3 border border-white/5 space-y-0.5">
                              <span className="text-muted/60 block">Avoided Repair</span>
                              <span className="font-bold text-tealGlow">${repairCost.toLocaleString()}</span>
                            </div>

                            <div className="p-2 rounded bg-white/3 border border-white/5 space-y-0.5">
                              <span className="text-muted/60 block">Risk Reduction</span>
                              <span className="font-bold text-tealGlow">-{riskRed}%</span>
                            </div>

                            <div className="p-2 rounded bg-teal/10 border border-teal/30 space-y-0.5">
                              <span className="text-tealGlow font-bold block">ROI Multiplier</span>
                              <span className="font-bold text-tealGlow">{roi}x Return</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </PageContainer>
    </div>
  );
}
