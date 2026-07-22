"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { TiltCard } from "@/components/motion/TiltCard";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { Counter } from "@/components/ui/Counter";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import {
  Wrench,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp,
  Zap,
  GitBranch,
  Clock,
  Send,
} from "lucide-react";
import { rca as rcaApi, assets as assetsApi, workOrders as workOrdersApi } from "@/lib/api";
import type { Source, Asset, WorkOrderPayload } from "@/lib/types";
import { PageHero } from "@/components/layout/PageHero";
import { ShieldCheck, HardHat, Wrench as ToolIcon, CheckSquare, Clock as DurationIcon, Users as ManpowerIcon, AlertCircle, Loader2 } from "lucide-react";


// ── Types ───────────────────────────────────────────────────────────────────
type FailureEvent = {
  date: string;
  description: string;
  procedure: string;
  tag: "bearing" | "lubrication" | "vibration" | "pressure";
  woId: string;
  reporter: string;
  priority: "Critical" | "High" | "Medium";
  cost: string;
};

type RcaResult = {
  answer: string;
  sources: Source[];
  confidence: number;
} | null;

// ── Mock failure timeline (real backend will populate from work-order chunks) ──
const PUMP_FAILURES: FailureEvent[] = [
  { date: "2026-01-14", description: "Bearing seizure — 3-hour downtime", procedure: "MP-12", tag: "bearing", woId: "WO-89241", reporter: "J. Doe", priority: "Critical", cost: "$4,500" },
  { date: "2026-03-22", description: "Excessive vibration, scheduled replacement", procedure: "MP-12", tag: "vibration", woId: "WO-91024", reporter: "M. Smith", priority: "High", cost: "$1,200" },
  { date: "2026-06-08", description: "Bearing failure — same root signature", procedure: "MP-12", tag: "bearing", woId: "WO-95011", reporter: "J. Doe", priority: "Critical", cost: "$6,200" },
];

const TAG_COLORS: Record<string, string> = {
  bearing:     "border-danger/40 bg-danger/10 text-danger",
  lubrication: "border-gold/40 bg-gold/10 text-goldGlow",
  vibration:   "border-teal/40 bg-teal/10 text-tealGlow",
  pressure:    "border-purple-400/40 bg-purple-400/10 text-purple-400",
};

// ═══════════════════════════════════════════════════════════════════════════
export default function RCAPage() {
  const [selected, setSelected] = useState("Pump P-204");
  const [fleetAssets, setFleetAssets] = useState<Asset[]>([]);
  const [rca, setRca] = useState<RcaResult>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [activeWo, setActiveWo] = useState<WorkOrderPayload | null>(null);
  const [generatingWo, setGeneratingWo] = useState(false);

  const handleGenerateWorkOrder = async () => {
    if (!selected) return;
    setGeneratingWo(true);
    try {
      const wo = await workOrdersApi.generate(selected, `Overhaul & Inspection for ${selected}`, "high");
      setActiveWo(wo);
    } catch {
      // optional fallback
    } finally {
      setGeneratingWo(false);
    }
  };

  useEffect(() => {

    assetsApi.list().then((list) => {
      if (list.length > 0) {
        setFleetAssets(list);
      }
    }).catch(() => {});
  }, []);

  const runRca = useCallback(async (equipment: string) => {
    setLoading(true);
    setError(false);
    setRca(null);
    try {
      const result = await rcaApi.get(equipment);
      setRca(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runRca(selected);
  }, [selected, runRca]);

  const equipmentList = fleetAssets.length > 0 ? fleetAssets.map(a => ({
    id: a.tag,
    name: `${a.tag} (${a.name})`,
    location: a.location || "Plant Bay",
    criticality: a.criticality.toUpperCase(),
    status: a.status === "degraded" || a.status === "offline" ? "critical" : "healthy",
  })) : [
    { id: "Pump P-204", name: "Pump P-204", location: "Unit 4, Cooling", criticality: "CLASS A", status: "critical" },
    { id: "Compressor K-101", name: "Compressor K-101", location: "Unit 2, Gas Plant", criticality: "CLASS B", status: "warning" },
    { id: "Heat Exchanger E-301", name: "Heat Exchanger E-301", location: "Unit 1, Refining", criticality: "CLASS A", status: "healthy" },
    { id: "Boiler B-12", name: "Boiler B-12", location: "Power Gen", criticality: "CLASS A", status: "healthy" },
  ];

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <PageContainer 
        size="wide"
        hero={
          <PageHero 
            badgeLabel="✦ Insight"
            badgeText="Maintenance Intelligence"
            title1="Root Cause"
            title2="Analysis"
            description="Select any piece of equipment to trace failures across work orders, OEM manuals and procedures — and surface the root cause your team keeps missing."
          />
        }
      >

        {/* Equipment Selector */}
        <Reveal delay={0.1}>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4">
            {equipmentList.map((eq) => (
              <button
                key={eq.id}
                id={`rca-eq-${eq.id.replace(/\s+/g, "-").toLowerCase()}`}
                onClick={() => setSelected(eq.id)}
                className={`relative flex min-w-0 flex-col items-start rounded-xl border px-4 py-3 text-left transition-all duration-300 ${
                  selected === eq.id
                    ? "border-teal bg-teal/10 shadow-glow-teal"
                    : "border-border bg-surface/50 hover:border-teal/40"
                }`}
              >
                <div className="flex w-full items-center gap-2">
                  <span className={`h-2 w-2 flex-none rounded-full ${eq.status === 'critical' ? 'bg-danger animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]' : eq.status === 'warning' ? 'bg-gold' : 'bg-teal'}`} />
                  <span className={`truncate text-sm font-semibold font-mono ${selected === eq.id ? 'text-tealGlow' : 'text-text'}`}>{eq.name}</span>
                </div>
                <div className="mt-1 flex w-full items-center gap-2 text-[10px] text-muted">
                  <span className="truncate">{eq.location}</span>
                  <span className="flex-none">•</span>
                  <span className={`flex-none ${eq.criticality === 'Class A' ? 'text-gold/80' : ''}`}>{eq.criticality}</span>
                </div>
              </button>
            ))}
          </div>
        </Reveal>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Failure Timeline */}
          <Reveal dir="right">
            <div className="glass-glow p-6">
              <div className="mb-5 flex items-center gap-2">
                <Clock className="h-4 w-4 text-goldGlow" />
                <h2 className="display text-lg font-semibold">Failure Timeline</h2>
                {selected === "Pump P-204" && (
                  <span className="ml-auto chip border-danger/30 bg-danger/10 text-danger">
                    3 recurring failures
                  </span>
                )}
              </div>

              {selected === "Pump P-204" ? (
                <div className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-0 before:h-full before:w-px before:bg-border">
                  {PUMP_FAILURES.map((ev, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ delay: i * 0.12 }}
                      className="relative"
                    >
                      {/* Timeline dot */}
                      <span className="absolute -left-[1.35rem] top-2 h-3 w-3 rounded-full border-2 border-danger bg-abyss" />
                      <button
                        onClick={() => setExpanded(expanded === i ? null : i)}
                        className="w-full text-left"
                      >
                        <div className="glass flex items-start justify-between gap-3 p-4 hover:border-teal/30 transition-colors">
                          <div>
                            <p className="font-mono text-[11px] text-muted">{ev.date}</p>
                            <p className="mt-0.5 text-sm font-medium">{ev.description}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`chip text-[10px] ${TAG_COLORS[ev.tag]}`}>
                              {ev.tag}
                            </span>
                            {expanded === i ? (
                              <ChevronUp className="h-3.5 w-3.5 text-muted" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-muted" />
                            )}
                          </div>
                        </div>
                      </button>
                      <AnimatePresence>
                        {expanded === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-1 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-xs text-muted">
                              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gold/10 pb-3">
                                <div><span className="text-muted/60">WO:</span> <span className="font-mono text-goldGlow">{ev.woId}</span></div>
                                <div><span className="text-muted/60">Reporter:</span> <span className="text-text">{ev.reporter}</span></div>
                                <div><span className="text-muted/60">Priority:</span> <span className={ev.priority === 'Critical' ? 'text-danger font-medium' : 'text-gold'}>{ev.priority}</span></div>
                                <div><span className="text-muted/60">Cost:</span> <span className="text-tealGlow font-mono">{ev.cost}</span></div>
                              </div>
                              <span className="text-goldGlow">Procedure used:</span>{" "}
                              {ev.procedure} — interval specified as{" "}
                              <span className="text-danger font-medium">90 days</span>
                              {" "}(OEM manual mandates{" "}
                              <span className="text-tealGlow font-medium">60 days</span>)
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Wrench className="mb-3 h-10 w-10 text-border" />
                  <p className="text-sm text-muted">No failure events in corpus for this equipment.</p>
                  <p className="mt-1 text-xs text-muted">Ingest work order logs to populate the timeline.</p>
                </div>
              )}
            </div>
          </Reveal>

          {/* RCA Answer */}
          <Reveal dir="left">
            <div className="glass-glow p-6">
              <div className="mb-5 flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-tealGlow" />
                <h2 className="display text-lg font-semibold">Root Cause Analysis</h2>
              </div>

              {error ? (
                <ErrorState
                  message="Couldn't run RCA. Backend may be offline."
                  onRetry={() => runRca(selected)}
                />
              ) : loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                  <Skeleton className="mt-4 h-8 w-32" />
                </div>
              ) : rca ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <p className="text-sm leading-relaxed">{rca.answer}</p>

                  {rca.sources.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {rca.sources.map((s, i) => (
                          <span key={i} title={s.snippet} className="chip cursor-help">
                            <FileText className="h-3 w-3" />
                            {s.doc_name} · p.{s.page}
                          </span>
                        ))}
                      </div>
                      
                      {selected === "Pump P-204" && (
                        <div className="rounded-lg bg-surface/80 p-3 text-xs border border-white/5 shadow-inner">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-muted">
                            <div><span className="text-muted/60">Procedure Authored:</span> MP-12.docx</div>
                            <div>
                              <span className="text-muted/60">Last Updated:</span> Oct 12, 2021 
                              <span className="text-danger ml-1.5 font-medium bg-danger/10 px-1.5 py-0.5 rounded text-[10px]">OUTDATED</span>
                            </div>
                            <div className="sm:col-span-2"><span className="text-muted/60">Document Owner:</span> J. Doe (Reliability Engineering)</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {typeof rca.confidence === "number" && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted">confidence</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${rca.confidence}%` }}
                          transition={{ duration: 1, delay: 0.2 }}
                          className="h-full rounded-full bg-gradient-to-r from-teal to-tealGlow"
                        />
                      </div>
                      <span className="font-mono text-[10px] text-tealGlow">
                        {rca.confidence}%
                      </span>
                    </div>
                  )}
                </motion.div>
              ) : null}
            </div>
          </Reveal>
        </div>

        {/* Work Order Generator Engine */}
        <Reveal delay={0.25}>
          <div className="glass-glow mt-8 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-text flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-tealGlow" /> Automated Maintenance Work Order Generator
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Generate complete safety-compliant work orders with tools, spare parts, PPE, LOTO checklists, & shutdown requirements.
                </p>
              </div>
              <button
                onClick={handleGenerateWorkOrder}
                disabled={generatingWo}
                className="flex items-center gap-2 rounded-lg bg-teal/20 border border-teal/40 px-5 py-2 text-xs font-semibold text-tealGlow hover:bg-teal/30 disabled:opacity-40 shrink-0"
              >
                {generatingWo ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Synthesizing Work Order…
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5" /> Generate Work Order
                  </>
                )}
              </button>
            </div>

            {activeWo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* WO Header Banner */}
                <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-teal/30 bg-teal/5 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-base font-bold text-tealGlow">{activeWo.wo_id}</span>
                    <span className="chip border border-white/10 bg-white/5 text-text font-mono text-xs">
                      Asset: {activeWo.asset_tag}
                    </span>
                    <span className="chip border border-teal/30 bg-teal/10 text-tealGlow text-[10px] uppercase font-bold">
                      {activeWo.priority} Priority
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono text-muted">
                    <span className="flex items-center gap-1">
                      <DurationIcon className="h-3.5 w-3.5 text-goldGlow" /> Est. {activeWo.estimated_duration_hours} hrs
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertCircle className={`h-3.5 w-3.5 ${activeWo.shutdown_required ? 'text-danger' : 'text-tealGlow'}`} />
                      Shutdown: {activeWo.shutdown_required ? "REQUIRED" : "NOT REQUIRED"}
                    </span>
                  </div>
                </div>

                {/* Manpower & PPE Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Manpower */}
                  <div className="p-4 rounded-xl border border-white/5 bg-white/3 space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                      <ManpowerIcon className="h-3.5 w-3.5 text-tealGlow" /> Required Manpower
                    </h4>
                    <ul className="space-y-1.5 text-xs text-text">
                      {activeWo.required_manpower?.map((m, i) => (
                        <li key={i} className="flex justify-between border-b border-white/5 pb-1">
                          <span>{m.role}</span>
                          <span className="font-mono font-bold text-tealGlow">{m.count} Technician(s)</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Required PPE */}
                  <div className="p-4 rounded-xl border border-white/5 bg-white/3 space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                      <HardHat className="h-3.5 w-3.5 text-goldGlow" /> Mandatory PPE
                    </h4>
                    <ul className="space-y-1 text-xs text-muted/90">
                      {activeWo.required_ppe?.map((ppe, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-goldGlow" /> {ppe}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Tools & Parts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Required Tools */}
                  <div className="p-4 rounded-xl border border-white/5 bg-white/3 space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                      <ToolIcon className="h-3.5 w-3.5 text-tealGlow" /> Specialized Tools
                    </h4>
                    <ul className="space-y-1 text-xs text-text">
                      {activeWo.required_tools?.map((t, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="font-mono text-tealGlow font-bold">#</span> {t}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Required Spare Parts */}
                  <div className="p-4 rounded-xl border border-white/5 bg-white/3 space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5 text-violet-400" /> Spare Parts & Materials
                    </h4>
                    <ul className="space-y-1.5 text-xs text-text">
                      {activeWo.required_parts?.map((p, i) => (
                        <li key={i} className="flex justify-between border-b border-white/5 pb-1">
                          <span>{p.description} <span className="font-mono text-[10px] text-muted">({p.part_number})</span></span>
                          <span className="font-mono font-bold text-violet-400">x{p.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Safety Checklist & Dependencies */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Safety Checklist */}
                  <div className="p-4 rounded-xl border border-danger/20 bg-danger/5 space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-danger flex items-center gap-1.5">
                      <CheckSquare className="h-3.5 w-3.5 text-danger" /> Mandatory Safety Checklist (LOTO)
                    </h4>
                    <ul className="space-y-1.5 text-xs text-text">
                      {activeWo.safety_checklist?.map((chk, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="h-4 w-4 rounded border border-danger/40 bg-danger/10 text-danger flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            ✓
                          </span>
                          <span>{chk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Dependencies */}
                  <div className="p-4 rounded-xl border border-gold/20 bg-gold/5 space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-goldGlow flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-goldGlow" /> Operational Dependencies
                    </h4>
                    <ul className="space-y-1.5 text-xs text-muted/90">
                      {activeWo.dependencies?.map((dep, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-goldGlow font-mono text-xs">→</span>
                          <span>{dep}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </Reveal>

      </PageContainer>
    </div>
  );
}
