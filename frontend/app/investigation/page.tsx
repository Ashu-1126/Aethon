"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import {
  SearchCheck, AlertTriangle, ShieldCheck, Activity, Clock,
  FileText, CheckCircle2, ChevronRight, Loader2, Sparkles,
  Layers, ExternalLink, Zap, ArrowRight, ShieldAlert, Award
} from "lucide-react";
import { investigations, assets } from "@/lib/api";
import type { InvestigationReport, InvestigationRecord, Asset } from "@/lib/types";
import Link from "next/link";

export default function InvestigationPage() {
  const [incidentTitle, setIncidentTitle] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [fleet, setFleet] = useState<Asset[]>([]);
  const [running, setRunning] = useState(false);
  const [activeReport, setActiveReport] = useState<InvestigationReport | null>(null);
  const [history, setHistory] = useState<InvestigationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const records = await investigations.list();
      setHistory(records);
      if (records.length > 0 && !activeReport) {
        setActiveReport(records[0].report);
      }
    } catch {
      // optional fallback
    }
  }, [activeReport]);

  useEffect(() => {
    loadHistory();
    assets.list().then(setFleet).catch(() => {});
  }, [loadHistory]);

  async function handleRun(e: React.FormEvent) {
    e.preventDefault();
    if (!incidentTitle.trim()) return;
    setRunning(true);
    setError(null);
    try {
      const report = await investigations.run(incidentTitle, assetTag);
      setActiveReport(report);
      await loadHistory();
    } catch (err: any) {
      setError(err.message || "Autonomous investigation failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <PageContainer
        size="wide"
        hero={
          <PageHero
            badgeLabel="❖ Incident Command"
            badgeText="Autonomous AI Investigation Engine"
            title1="Investigate failures,"
            title2="autonomously."
            description="Unlike search engines or chat systems, AETHON's Autonomous Investigation Engine synthesizes maintenance history, SOPs, regulatory standards, sensor telemetry, and knowledge graph subgraphs to determine root causes, rank evidence, and generate structured incident reports."
          />
        }
      >
        {/* Trigger form */}
        <div className="mt-6 glass-glow p-6">
          <h2 className="text-sm font-semibold text-text uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-tealGlow" /> Trigger Autonomous Investigation
          </h2>
          <form onSubmit={handleRun} className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-[11px] font-medium text-muted uppercase tracking-wider">Incident Description / Failure Symptom *</label>
              <input
                value={incidentTitle}
                onChange={(e) => setIncidentTitle(e.target.value)}
                placeholder="e.g. Pump P-204 bearing failure and abnormal vibration..."
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-text placeholder-muted/40 focus:border-teal/40 focus:outline-none focus:ring-1 focus:ring-teal/20"
                required
              />
            </div>

            <div className="w-full md:w-64 space-y-1">
              <label className="text-[11px] font-medium text-muted uppercase tracking-wider">Scope to Asset (Optional)</label>
              <select
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-text focus:border-teal/40 focus:outline-none"
              >
                <option value="" className="bg-[#0d0d14]">All Fleet / General</option>
                {fleet.map((a) => (
                  <option key={a.id} value={a.tag} className="bg-[#0d0d14]">
                    {a.tag} — {a.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={running || !incidentTitle.trim()}
              className="flex items-center justify-center gap-2 rounded-lg bg-teal/20 border border-teal/40 px-6 py-2.5 text-sm font-medium text-tealGlow hover:bg-teal/30 disabled:opacity-40 shrink-0"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Investigating…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" /> Run Autonomous Investigation
                </>
              )}
            </button>
          </form>
          {error && <p className="mt-3 text-xs text-danger">{error}</p>}
        </div>

        {/* Workspace Layout */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-16">
          {/* History Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center justify-between">
              <span>Recent Investigations</span>
              <span className="chip border-white/10 bg-white/5 text-muted text-[10px]">{history.length}</span>
            </h3>

            {history.length === 0 ? (
              <div className="glass-glow p-6 text-center text-xs text-muted/60">
                No past investigation records found. Run your first investigation above.
              </div>
            ) : (
              <div className="space-y-2.5">
                {history.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => setActiveReport(record.report)}
                    className={`glass-glow p-4 cursor-pointer transition-all duration-200 hover:border-teal/30 ${
                      activeReport?.investigation_id === record.report?.investigation_id
                        ? "border-teal/50 bg-teal/5 shadow-[0_0_15px_rgba(0,210,180,0.08)]"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-text truncate">
                        {record.incident_title}
                      </span>
                      <span className="chip border border-teal/30 bg-teal/10 text-tealGlow text-[9px] font-mono shrink-0">
                        {record.confidence}% CONF
                      </span>
                    </div>
                    {record.asset_tag && (
                      <span className="mt-1 inline-block chip border border-white/10 bg-white/5 text-muted text-[9px]">
                        Tag: {record.asset_tag}
                      </span>
                    )}
                    <p className="mt-2 text-[11px] text-muted/70 line-clamp-2">{record.summary}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted/50">
                      <span>{record.created_at?.slice(0, 10)}</span>
                      <span className="flex items-center gap-1 text-tealGlow/70">
                        View Report <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detailed Investigation Report Display */}
          <div className="lg:col-span-8 space-y-6">
            {!activeReport ? (
              <div className="glass-glow p-12 text-center">
                <SearchCheck className="mx-auto h-12 w-12 text-tealGlow/30 mb-3" />
                <h3 className="text-base font-semibold text-text">No Report Selected</h3>
                <p className="text-xs text-muted max-w-md mx-auto mt-1">
                  Trigger a new autonomous investigation or select a past report from the left panel to review full multi-source evidence and root cause analysis.
                </p>
              </div>
            ) : (
              <motion.div
                key={activeReport.investigation_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Executive Header */}
                <div className="glass-glow p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="chip border border-teal/40 bg-teal/15 text-tealGlow text-[10px] font-bold tracking-wider uppercase">
                          Investigation Report
                        </span>
                        {activeReport.asset_tag && (
                          <span className="chip border border-white/10 bg-white/5 text-text font-mono text-xs">
                            {activeReport.asset_tag}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-text mt-2">{activeReport.incident_title}</h2>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-muted/60 uppercase tracking-wider block">AI Confidence</span>
                        <span className="font-mono text-lg font-bold text-tealGlow">{activeReport.overall_confidence}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3 text-xs text-muted leading-relaxed">
                    <p className="font-semibold text-text mb-1">Executive Summary:</p>
                    <p>{activeReport.executive_summary}</p>
                  </div>
                </div>

                {/* Probable Root Causes */}
                <div className="glass-glow p-6">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted mb-4 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-danger" /> Probable Root Causes
                  </h3>
                  <div className="space-y-4">
                    {activeReport.probable_root_causes?.map((rc, i) => (
                      <div key={i} className="rounded-xl border border-danger/20 bg-danger/5 p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-text">{rc.cause}</h4>
                          <span className="chip border border-danger/30 bg-danger/10 text-danger text-[10px] font-mono font-bold">
                            {rc.probability}% Probability
                          </span>
                        </div>
                        <p className="text-xs text-muted leading-relaxed">{rc.mechanism}</p>
                        {rc.evidence_citations?.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            <span className="text-[10px] text-muted/60">Citations:</span>
                            {rc.evidence_citations.map((cite, idx) => (
                              <span key={idx} className="chip border border-white/10 bg-white/5 font-mono text-[9px] text-tealGlow">
                                {cite}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline & Factors Split */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Chronological Multi-Source Event Timeline */}
                  <div className="glass-glow p-6">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted mb-4 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-goldGlow" /> Chronological Event Reconstruction
                      </span>
                      <span className="text-[10px] text-muted/60 font-mono">Multi-Source</span>
                    </h3>
                    <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-teal/20">
                      {activeReport.timeline?.map((item, i) => (
                        <div key={i} className="pl-6 relative">
                          <span className="absolute left-0 top-1 h-4 w-4 rounded-full bg-[#0d0d14] border border-tealGlow text-[9px] font-bold text-tealGlow flex items-center justify-center">
                            {i + 1}
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono text-tealGlow font-bold">
                              {item.timestamp || item.timestamp_or_phase || `Phase ${i + 1}`}
                            </span>
                            {item.source_type && (
                              <span className="chip border border-white/10 bg-white/5 text-[9px] uppercase text-muted font-mono">
                                {item.source_type.replace(/_/g, " ")}
                              </span>
                            )}
                            {item.severity && (
                              <span className={`chip text-[8px] font-bold border ${item.severity === 'critical' ? 'border-danger/40 bg-danger/10 text-danger' : 'border-gold/40 bg-gold/10 text-goldGlow'}`}>
                                {item.severity.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text font-semibold mt-1">
                            {item.event_title || item.event}
                          </p>
                          {item.description && (
                            <p className="text-[11px] text-muted/80 mt-0.5 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                          {(item.evidence_ref || item.evidence_snippet) && (
                            <div className="mt-1.5 p-2 rounded bg-white/3 border border-white/5 text-[10px] font-mono text-muted/70">
                              {item.evidence_ref && <span className="text-tealGlow block font-bold">Source: {item.evidence_ref}</span>}
                              {item.evidence_snippet && <span className="block mt-0.5 text-muted/80">{item.evidence_snippet}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>


                  {/* Contributing Factors */}
                  <div className="glass-glow p-6">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted mb-4 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-violet-400" /> Contributing Factors
                    </h3>
                    <ul className="space-y-3">
                      {activeReport.contributing_factors?.map((f, i) => (
                        <li key={i} className="rounded-lg border border-white/5 bg-white/3 p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-text">{f.factor}</span>
                            <span className="chip border border-violet-500/30 bg-violet-500/10 text-violet-400 text-[9px] uppercase font-bold">
                              {f.weight}
                            </span>
                          </div>
                          {f.citation && <p className="text-[10px] text-muted/60 font-mono">{f.citation}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Evidence Ranking */}
                <div className="glass-glow p-6">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted mb-4 flex items-center gap-2">
                    <Award className="h-4 w-4 text-tealGlow" /> Evidence Ranking & Relevance
                  </h3>
                  <div className="space-y-2.5">
                    {activeReport.evidence_ranking?.map((ev) => (
                      <div key={ev.rank} className="flex items-center justify-between gap-4 p-3 rounded-lg border border-white/5 bg-white/3 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-tealGlow flex h-6 w-6 items-center justify-center rounded bg-teal/10 border border-teal/20 shrink-0">
                            #{ev.rank}
                          </span>
                          <div>
                            <p className="font-semibold text-text">{ev.source}</p>
                            <p className="text-muted text-[11px] mt-0.5">{ev.key_finding}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-muted/60 block">Relevance</span>
                          <span className="font-mono font-bold text-tealGlow">{ev.relevance_score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Corrective Actions */}
                <div className="glass-glow p-6">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-tealGlow" /> Recommended Corrective Actions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeReport.corrective_actions?.map((act, i) => (
                      <div key={i} className="p-3.5 rounded-xl border border-teal/20 bg-teal/5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="chip border border-teal/30 bg-teal/10 text-tealGlow text-[9px] uppercase font-bold">
                            {act.priority}
                          </span>
                          <span className="font-mono text-[10px] text-muted/60">{act.target_component}</span>
                        </div>
                        <p className="text-xs font-medium text-text">{act.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
