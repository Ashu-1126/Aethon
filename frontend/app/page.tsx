"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Activity, Factory, Wrench, ShieldAlert, LineChart,
  Brain, CheckCircle2, AlertTriangle, ArrowRight, Zap,
  Clock, DollarSign, FileText, ChevronRight, RefreshCw, Cpu
} from "lucide-react";
import { assets, compliance, conflicts, pdm, investigations, shiftReports } from "@/lib/api";
import type {
  Asset, ComplianceAudit, Conflict, PdmPrediction, InvestigationRecord, ShiftReportPayload
} from "@/lib/types";
import Link from "next/link";
import { ClipboardList, CheckSquare, Clock as PendingIcon, AlertCircle, Loader2 } from "lucide-react";


export default function Home() {
  const [fleet, setFleet] = useState<Asset[]>([]);
  const [audit, setAudit] = useState<ComplianceAudit | null>(null);
  const [conflictList, setConflictList] = useState<Conflict[]>([]);
  const [pdmList, setPdmList] = useState<PdmPrediction[]>([]);
  const [recentInv, setRecentInv] = useState<InvestigationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [activeShiftReport, setActiveShiftReport] = useState<ShiftReportPayload | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);


  const handleGenerateShiftReport = async () => {
    setGeneratingReport(true);
    try {
      const rep = await shiftReports.generate("Day Shift (06:00 - 18:00)", "Lead Operations Engineer");
      setActiveShiftReport(rep);
    } catch {
      // optional fallback
    } finally {
      setGeneratingReport(false);
    }
  };

  const loadData = useCallback(async () => {

    setLoading(true);
    setError(false);
    try {
      const [f, c, conf, p, inv] = await Promise.all([
        assets.list().catch(() => []),
        compliance.audit().catch(() => null),
        conflicts.list().catch(() => []),
        pdm.listAll().catch(() => []),
        investigations.list().catch(() => []),
      ]);
      setFleet(f);
      setAudit(c);
      setConflictList(conf);
      setPdmList(p);
      setRecentInv(inv);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }

  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Compute Plant Health Score
  const plantHealthScore = useMemo(() => {
    if (fleet.length === 0) return 92;
    const operationalCount = fleet.filter(a => a.status === "operational").length;
    return Math.round((operationalCount / fleet.length) * 100);
  }, [fleet]);

  // Critical Assets
  const criticalAssets = useMemo(() => {
    return fleet.filter(a => a.criticality === "critical" || a.status === "degraded" || a.status === "offline");
  }, [fleet]);

  // High Risk Predicted Failures
  const highRiskPredictions = useMemo(() => {
    return pdmList.filter(p => p.failure_probability_percentage > 35 || p.remaining_useful_life_days < 45);
  }, [pdmList]);

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <PageContainer
        size="wide"
        hero={
          <PageHero
            badgeLabel="❖ AETHON Command System"
            badgeText="Unified Plant Operations Brain"
            title1="Industrial Intelligence,"
            title2="in real time."
            description="Continuous operational dashboard synthesizing overall plant health, critical assets, maintenance forecasts, compliance risks, predicted failures, recent incident investigations, and knowledge gaps."
          />
        }
      >
        {/* Dynamic Status Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 glass-glow p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tealGlow opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-tealGlow" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-text">
              Live Operations Sync Active
            </span>
            {lastRefreshed && (
              <span className="text-[10px] text-muted/60 font-mono">Refreshed: {lastRefreshed}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 rounded-lg border border-teal/30 bg-teal/10 px-3 py-1.5 text-xs font-medium text-tealGlow hover:bg-teal/20 transition-all"
            >
              <RefreshCw className="h-3 w-3" /> Refresh Command Grid
            </button>
            <Link
              href="/digital-twin"
              className="flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-medium text-goldGlow hover:bg-gold/20 transition-all"
            >
              <Cpu className="h-3 w-3" /> Launch Digital Twin
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mt-8">
            <ErrorState message="Couldn't sync plant operations data." onRetry={loadData} />
          </div>
        ) : loading && fleet.length === 0 ? (
          <Skeleton className="mt-8 h-[650px] w-full rounded-2xl" />
        ) : (
          <div className="mt-6 space-y-6 pb-16">
            {/* Top Operational KPIs Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Overall Plant Health */}
              <div className="glass-glow p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Overall Plant Health</span>
                  <Activity className="h-4 w-4 text-tealGlow" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-bold text-tealGlow">{plantHealthScore}%</span>
                  <span className="text-xs text-muted">Efficiency</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-tealGlow" style={{ width: `${plantHealthScore}%` }} />
                </div>
              </div>

              {/* Critical Assets Count */}
              <div className="glass-glow p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Critical Assets</span>
                  <Factory className="h-4 w-4 text-goldGlow" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-bold text-goldGlow">{criticalAssets.length}</span>
                  <span className="text-xs text-muted">/ {fleet.length} Fleet</span>
                </div>
                <span className="text-[10px] text-muted/60 block">Requiring Attention</span>
              </div>

              {/* Compliance Rating */}
              <div className="glass-glow p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Compliance Index</span>
                  <ShieldAlert className="h-4 w-4 text-tealGlow" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-bold text-tealGlow">{audit?.overall_score ?? 88}%</span>
                </div>
                <span className="text-[10px] text-muted/60 block">Factory Act & OISD</span>
              </div>

              {/* Predicted Failures */}
              <div className="glass-glow p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Predicted Failures</span>
                  <LineChart className="h-4 w-4 text-danger" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-bold text-danger">{highRiskPredictions.length}</span>
                  <span className="text-xs text-muted">High Risk</span>
                </div>
                <span className="text-[10px] text-muted/60 block">RUL &lt; 45 Days</span>
              </div>

              {/* Knowledge Gaps & Conflicts */}
              <div className="glass-glow p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Knowledge Conflicts</span>
                  <Brain className="h-4 w-4 text-violet-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-bold text-violet-400">{conflictList.length}</span>
                  <span className="text-xs text-muted">Discrepancies</span>
                </div>
                <span className="text-[10px] text-muted/60 block">Cross-SOP Conflict</span>
              </div>
            </div>

            {/* Core Command Grid Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 Cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Critical Assets & Health Overview */}
                <div className="glass-glow p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted flex items-center gap-2">
                      <Factory className="h-4 w-4 text-goldGlow" /> Critical Asset Fleet Monitor
                    </h3>
                    <Link href="/assets" className="text-xs text-tealGlow/80 hover:text-tealGlow flex items-center gap-1">
                      View Full Fleet <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>

                  {criticalAssets.length === 0 ? (
                    <p className="text-xs text-muted/60 py-4 text-center">All registered assets operating within healthy limits.</p>
                  ) : (
                    <div className="space-y-3">
                      {criticalAssets.slice(0, 4).map((a) => (
                        <div key={a.id} className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/3 text-xs">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-text text-sm">{a.tag}</span>
                            <div>
                              <p className="font-medium text-text">{a.name}</p>
                              <p className="text-[10px] text-muted/60">{a.location || "Plant Floor"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`chip border text-[9px] font-bold ${a.criticality === 'critical' ? 'border-danger/30 bg-danger/10 text-danger' : 'border-gold/30 bg-gold/10 text-goldGlow'}`}>
                              {a.criticality.toUpperCase()}
                            </span>
                            <span className="chip border border-white/10 bg-white/5 text-muted text-[9px] capitalize">
                              {a.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Predicted Failure Risks & RUL */}
                <div className="glass-glow p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted flex items-center gap-2">
                      <LineChart className="h-4 w-4 text-danger" /> Predicted Failure Analytics (RUL)
                    </h3>
                    <Link href="/predictive" className="text-xs text-tealGlow/80 hover:text-tealGlow flex items-center gap-1">
                      Predictive Engine <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>

                  {pdmList.length === 0 ? (
                    <p className="text-xs text-muted/60 py-4 text-center">No failure risk predictions logged.</p>
                  ) : (
                    <div className="space-y-3">
                      {pdmList.slice(0, 3).map((p, i) => (
                        <div key={i} className="p-4 rounded-xl border border-danger/20 bg-danger/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm font-bold text-text">{p.asset_tag}</span>
                            <span className="chip border border-danger/30 bg-danger/10 text-danger text-[10px] font-mono font-bold">
                              RUL: {p.remaining_useful_life_days} Days ({p.failure_probability_percentage}% Risk)
                            </span>
                          </div>
                          <p className="text-xs text-text">{p.primary_failure_mode}</p>
                          <div className="text-[10px] text-muted/70 font-mono">
                            Inspection Schedule: {p.recommended_inspection_schedule}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column (5 Cols) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Recent Autonomous Incident Investigations */}
                <div className="glass-glow p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted flex items-center gap-2">
                      <Zap className="h-4 w-4 text-tealGlow" /> Autonomous Incidents
                    </h3>
                    <Link href="/investigation" className="text-xs text-tealGlow/80 hover:text-tealGlow flex items-center gap-1">
                      Incident Command <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>

                  {recentInv.length === 0 ? (
                    <p className="text-xs text-muted/60 py-4 text-center">No recent autonomous incident reports.</p>
                  ) : (
                    <div className="space-y-3">
                      {recentInv.slice(0, 3).map((rec) => (
                        <div key={rec.id} className="p-3.5 rounded-xl border border-white/5 bg-white/3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-text truncate max-w-[180px]">
                              {rec.incident_title}
                            </span>
                            <span className="chip border border-teal/30 bg-teal/10 text-tealGlow text-[9px]">
                              {rec.confidence}% Conf
                            </span>
                          </div>
                          <p className="text-[11px] text-muted/70 line-clamp-2">{rec.summary}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Compliance & Knowledge Gap Recommendations */}
                <div className="glass-glow p-6 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-goldGlow" /> Executive Recommendations
                  </h3>

                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl border border-teal/20 bg-teal/5 text-xs space-y-1">
                      <span className="font-bold text-tealGlow block">Fleet Vibration Audit</span>
                      <p className="text-muted/80 leading-relaxed">
                        Schedule thermographic and vibration spectral scans for high-risk pumps.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-gold/20 bg-gold/5 text-xs space-y-1">
                      <span className="font-bold text-goldGlow block">SOP Regulation Sync</span>
                      <p className="text-muted/80 leading-relaxed">
                        Reconcile {conflictList.length} SOP discrepancies against OISD-116 standard.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Automated Shift Handover Report Generator */}
                <div className="glass-glow p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-tealGlow" /> Autonomous Shift Handover Report
                    </h3>
                    <button
                      onClick={handleGenerateShiftReport}
                      disabled={generatingReport}
                      className="flex items-center gap-1.5 text-xs font-semibold text-tealGlow hover:underline disabled:opacity-50"
                    >
                      {generatingReport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                      Generate Report
                    </button>
                  </div>

                  {activeShiftReport && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 text-xs">
                      <div className="p-3 rounded-lg border border-teal/30 bg-teal/5 flex items-center justify-between">
                        <span className="font-bold text-tealGlow">{activeShiftReport.shift_name}</span>
                        <span className="text-[10px] font-mono text-muted">{activeShiftReport.author_name}</span>
                      </div>

                      {/* Completed Work */}
                      <div className="space-y-1">
                        <span className="font-semibold text-text flex items-center gap-1"><CheckSquare className="h-3 w-3 text-tealGlow" /> Completed Work</span>
                        {activeShiftReport.completed_work.map((w, i) => (
                          <div key={i} className="p-2 rounded border border-white/5 bg-white/3 flex justify-between text-[11px]">
                            <span>{w.task}</span>
                            <span className="font-mono font-bold text-tealGlow">{w.asset_tag}</span>
                          </div>
                        ))}
                      </div>

                      {/* Pending Work & Open Alarms */}
                      <div className="space-y-1">
                        <span className="font-semibold text-goldGlow flex items-center gap-1"><PendingIcon className="h-3 w-3 text-goldGlow" /> Pending Work & Alarms</span>
                        {activeShiftReport.pending_work.map((pw, i) => (
                          <div key={i} className="p-2 rounded border border-gold/20 bg-gold/5 flex justify-between text-[11px]">
                            <span>{pw.task}</span>
                            <span className="font-mono font-bold text-goldGlow">{pw.asset_tag}</span>
                          </div>
                        ))}
                      </div>

                      {/* Recommendations */}
                      <div className="p-2.5 rounded border border-teal/20 bg-teal/5 text-[11px] text-muted space-y-1">
                        <span className="font-bold text-tealGlow block">Handover Recommendations:</span>
                        {activeShiftReport.executive_recommendations.map((rec, i) => (
                          <p key={i}>• {rec}</p>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </PageContainer>

    </div>
  );
}
