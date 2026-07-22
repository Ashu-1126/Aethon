"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Factory, AlertTriangle, CheckCircle2, Wrench, WifiOff,
  Loader2, Zap, Shield, Activity, Clock, FileText,
  TrendingUp, Brain, ChevronLeft, RefreshCw, Plus, X,
} from "lucide-react";
import { assets, rca } from "@/lib/api";
import type {
  Asset, AssetEvent, AssetHealth, AssetForecast,
  AssetComplianceResult,
} from "@/lib/types";
import type { RcaResult } from "@/lib/api";
import Link from "next/link";

// ── Status / criticality helpers ──────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  operational: { label: "Operational", color: "text-tealGlow border-teal/30 bg-teal/10", dot: "bg-tealGlow" },
  degraded:    { label: "Degraded",    color: "text-goldGlow border-gold/30 bg-gold/10", dot: "bg-gold animate-pulse" },
  offline:     { label: "Offline",     color: "text-danger border-danger/30 bg-danger/10", dot: "bg-danger" },
  maintenance: { label: "Maintenance", color: "text-violet-400 border-violet-500/30 bg-violet-500/10", dot: "bg-violet-400" },
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "text-danger border-danger/30 bg-danger/10",
  high:     "text-orange-400 border-orange-500/30 bg-orange-500/10",
  medium:   "text-goldGlow border-gold/30 bg-gold/10",
  low:      "text-tealGlow border-teal/30 bg-teal/10",
  info:     "text-muted border-white/10 bg-white/5",
};

const EVENT_TYPE_ICON: Record<string, React.ElementType> = {
  alert: AlertTriangle, maintenance: Wrench, inspection: Shield, incident: Zap,
};

// ── Health Score Ring ─────────────────────────────────────────────────────────
function HealthRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 80 ? "#00d2b4" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        className="transition-all duration-1000"
      />
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fill={color} fontSize="16" fontWeight="700" fontFamily="monospace">
        {score}
      </text>
    </svg>
  );
}

// ── Risk Score Bar ────────────────────────────────────────────────────────────
function RiskBar({ score }: { score: number }) {
  const color = score >= 75 ? "bg-danger" : score >= 50 ? "bg-gold" : "bg-tealGlow";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted">Risk Score</span>
        <span className="font-mono font-bold text-text">{score}/100</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

// ── Tab Panel components ──────────────────────────────────────────────────────

function OverviewTab({ asset }: { asset: Asset }) {
  const fields: [string, string][] = [
    ["Plant Tag",    asset.tag],
    ["Category",     asset.category.replace(/_/g, " ")],
    ["Location",     asset.location || "—"],
    ["Criticality",  asset.criticality],
    ["Status",       asset.status],
    ["Manufacturer", asset.manufacturer || "—"],
    ["Model Number", asset.model_number || "—"],
    ["Install Date", asset.install_date || "—"],
    ["Created",      asset.created_at?.slice(0, 10) || "—"],
  ];

  const status = STATUS_CONFIG[asset.status] ?? STATUS_CONFIG.operational;

  return (
    <div className="space-y-6">
      {/* Status card */}
      <div className="glass-glow p-5 flex items-center gap-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
          <Factory className="h-7 w-7 text-tealGlow/70" />
        </div>
        <div>
          <h3 className="font-semibold text-text text-base">{asset.name}</h3>
          <div className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </div>
        </div>
      </div>

      {/* Spec table */}
      <div className="glass-glow p-5">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">Asset Specifications</h4>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {fields.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[10px] text-muted/60 uppercase tracking-wider">{k}</dt>
              <dd className="mt-0.5 text-sm text-text font-medium capitalize">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function EventsTab({ tag }: { tag: string }) {
  const [events, setEvents] = useState<AssetEvent[] | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [form, setForm] = useState({ event_type: "maintenance", severity: "medium", title: "", detail: "" });
  const [logging, setLogging] = useState(false);

  const loadEvents = useCallback(async () => {
    try { setEvents(await assets.getEvents(tag)); } catch { setEvents([]); }
  }, [tag]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLogging(true);
    try {
      await assets.logEvent(tag, form);
      await loadEvents();
      setShowLog(false);
      setForm({ event_type: "maintenance", severity: "medium", title: "", detail: "" });
    } finally {
      setLogging(false);
    }
  }

  if (events === null) return <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowLog((s) => !s)}
          className="flex items-center gap-1.5 rounded-lg border border-teal/30 bg-teal/10 px-3 py-1.5 text-xs font-medium text-tealGlow hover:bg-teal/20"
        >
          <Plus className="h-3 w-3" /> Log Event
        </button>
      </div>

      <AnimatePresence>
        {showLog && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleLog}
            className="glass-glow p-4 space-y-3 overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-muted uppercase tracking-wider">Type</label>
                <select value={form.event_type} onChange={e => setForm(f => ({...f, event_type: e.target.value}))}
                  className="rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-text">
                  {["alert","maintenance","inspection","incident"].map(t => <option key={t} value={t} className="bg-[#0d0d14]">{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-muted uppercase tracking-wider">Severity</label>
                <select value={form.severity} onChange={e => setForm(f => ({...f, severity: e.target.value}))}
                  className="rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-text">
                  {["critical","high","medium","low","info"].map(s => <option key={s} value={s} className="bg-[#0d0d14]">{s}</option>)}
                </select>
              </div>
            </div>
            <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
              placeholder="Event title *" required
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-text placeholder-muted/40 focus:border-teal/40 focus:outline-none" />
            <textarea value={form.detail} onChange={e => setForm(f => ({...f, detail: e.target.value}))}
              placeholder="Detail (optional)" rows={2}
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-text placeholder-muted/40 focus:border-teal/40 focus:outline-none resize-none" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowLog(false)} className="text-xs text-muted hover:text-text px-3 py-1.5">Cancel</button>
              <button type="submit" disabled={logging} className="flex items-center gap-1 rounded bg-teal/20 border border-teal/30 px-3 py-1.5 text-xs text-tealGlow hover:bg-teal/30 disabled:opacity-40">
                {logging ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Log
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {events.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted/60">No events recorded. Log the first one.</p>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => {
            const EvIcon = EVENT_TYPE_ICON[ev.event_type] ?? AlertTriangle;
            return (
              <motion.div key={ev.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass-glow p-4 flex gap-4">
                <div className="shrink-0 mt-0.5">
                  <EvIcon className={`h-4 w-4 ${SEVERITY_COLOR[ev.severity]?.split(" ")[0] ?? "text-muted"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-text">{ev.title}</span>
                    <span className={`chip text-[9px] border font-bold ${SEVERITY_COLOR[ev.severity] ?? "text-muted"}`}>
                      {ev.severity.toUpperCase()}
                    </span>
                    <span className="chip text-[9px] border border-white/10 bg-white/5 text-muted capitalize">
                      {ev.event_type}
                    </span>
                  </div>
                  {ev.detail && <p className="mt-1 text-xs text-muted/70">{ev.detail}</p>}
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted/50">
                    <Clock className="h-3 w-3" />
                    {ev.timestamp?.replace("T", " ").slice(0, 19)} UTC
                    {ev.source && <span>• {ev.source}</span>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HealthTab({ tag, name }: { tag: string; name: string }) {
  const [health, setHealth] = useState<AssetHealth | null | "error">(null);
  const [loading, setLoading] = useState(false);

  const loadHealth = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const h = await assets.health(tag, force);
      setHealth(h);
    } catch {
      setHealth("error");
    } finally {
      setLoading(false);
    }
  }, [tag]);

  useEffect(() => { loadHealth(); }, [loadHealth]);

  if (health === null || loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-tealGlow/60" />
        <p className="text-sm text-muted">Running AI health assessment…</p>
      </div>
    </div>
  );

  if (health === "error") return (
    <div className="py-8 text-center">
      <p className="text-sm text-danger">Health assessment failed — AI may be offline or no documents indexed.</p>
      <button onClick={() => loadHealth(true)} className="mt-3 text-xs text-tealGlow hover:underline">Retry</button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Score header */}
      <div className="glass-glow p-5 flex items-center gap-6">
        <HealthRing score={health.health_score} size={88} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-text">Health Assessment</h3>
            <span className="text-[10px] text-muted/60">Confidence: {health.confidence}%</span>
          </div>
          <p className="mt-1 text-sm text-muted leading-relaxed">{health.status_assessment}</p>
          <button onClick={() => loadHealth(true)} className="mt-3 flex items-center gap-1.5 text-xs text-tealGlow/70 hover:text-tealGlow">
            <RefreshCw className="h-3 w-3" /> Refresh Analysis
          </button>
        </div>
      </div>

      {/* Risk factors */}
      {health.risk_factors.length > 0 && (
        <div className="glass-glow p-5">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">Risk Factors</h4>
          <ul className="space-y-3">
            {health.risk_factors.map((r, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={`chip text-[9px] border font-bold shrink-0 mt-0.5 ${SEVERITY_COLOR[r.severity] ?? SEVERITY_COLOR.medium}`}>
                  {r.severity.toUpperCase()}
                </span>
                <div>
                  <p className="text-sm text-text">{r.factor}</p>
                  {r.citation && <p className="mt-0.5 text-[11px] text-muted/60 font-mono">{r.citation}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended actions */}
      {health.recommended_actions.length > 0 && (
        <div className="glass-glow p-5">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">Recommended Actions</h4>
          <ul className="space-y-3">
            {health.recommended_actions.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={`chip text-[9px] border font-bold shrink-0 mt-0.5 ${SEVERITY_COLOR[a.priority] ?? SEVERITY_COLOR.medium}`}>
                  {a.priority.toUpperCase()}
                </span>
                <div>
                  <p className="text-sm text-text">{a.action}</p>
                  <p className="mt-0.5 text-[11px] text-muted/60">{a.timeframe}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sources */}
      {health.sources.length > 0 && (
        <div className="glass-glow p-5">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">Source Documents</h4>
          <ul className="space-y-2">
            {health.sources.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <FileText className="h-3.5 w-3.5 text-muted/50 shrink-0 mt-0.5" />
                <span className="font-mono text-muted/70">{s.doc_name} — p.{s.page}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ForecastTab({ tag }: { tag: string }) {
  const [forecast, setForecast] = useState<AssetForecast | null | "error">(null);
  const [loading, setLoading] = useState(false);

  const loadForecast = useCallback(async (force = false) => {
    setLoading(true);
    try { setForecast(await assets.forecast(tag, force)); }
    catch { setForecast("error"); }
    finally { setLoading(false); }
  }, [tag]);

  useEffect(() => { loadForecast(); }, [loadForecast]);

  if (forecast === null || loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-tealGlow/60" />
        <p className="text-sm text-muted">Running predictive maintenance analysis…</p>
      </div>
    </div>
  );

  if (forecast === "error") return (
    <div className="py-8 text-center">
      <p className="text-sm text-danger">Forecast failed — AI may be offline or no documents indexed.</p>
      <button onClick={() => loadForecast(true)} className="mt-3 text-xs text-tealGlow hover:underline">Retry</button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Risk summary */}
      <div className="glass-glow p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-text">Predictive Maintenance Forecast</h3>
            <p className="mt-0.5 text-xs text-muted">Confidence: {forecast.confidence}%</p>
          </div>
          <button onClick={() => loadForecast(true)} className="flex items-center gap-1.5 text-xs text-tealGlow/70 hover:text-tealGlow">
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>
        <RiskBar score={forecast.risk_score} />
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[10px] text-muted/60 uppercase tracking-wider">Predicted Failure Window</span>
            <p className="mt-0.5 font-mono font-bold text-text">
              {forecast.predicted_failure_window_days != null ? `${forecast.predicted_failure_window_days} days` : "—"}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-muted/60 uppercase tracking-wider">Next Maintenance</span>
            <p className="mt-0.5 font-mono font-bold text-text">{forecast.next_recommended_maintenance || "—"}</p>
          </div>
        </div>
        <div>
          <span className="text-[10px] text-muted/60 uppercase tracking-wider">Failure Mode</span>
          <p className="mt-0.5 text-sm text-text">{forecast.failure_mode}</p>
        </div>
      </div>

      {/* Contributing factors */}
      {forecast.contributing_factors.length > 0 && (
        <div className="glass-glow p-5">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">Contributing Factors</h4>
          <ul className="space-y-3">
            {forecast.contributing_factors.map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={`chip text-[9px] border font-bold shrink-0 mt-0.5 ${SEVERITY_COLOR[f.weight] ?? SEVERITY_COLOR.medium}`}>
                  {(f.weight || "").toUpperCase()}
                </span>
                <div>
                  <p className="text-sm text-text">{f.factor}</p>
                  {f.citation && <p className="mt-0.5 text-[11px] text-muted/60 font-mono">{f.citation}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Maintenance actions */}
      {forecast.maintenance_actions.length > 0 && (
        <div className="glass-glow p-5">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">Required Maintenance Actions</h4>
          <ul className="space-y-3">
            {forecast.maintenance_actions.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <Wrench className="h-4 w-4 text-muted/50 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text">{a.action}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted/60">
                    <span className="capitalize">{a.criticality} priority</span>
                    {a.estimated_downtime_hours > 0 && <span>• Est. {a.estimated_downtime_hours}h downtime</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ComplianceTab({ tag }: { tag: string }) {
  const [result, setResult] = useState<AssetComplianceResult | null | "error">(null);
  const [loading, setLoading] = useState(false);

  const loadCompliance = useCallback(async (force = false) => {
    setLoading(true);
    try { setResult(await assets.compliance(tag, force)); }
    catch { setResult("error"); }
    finally { setLoading(false); }
  }, [tag]);

  useEffect(() => { loadCompliance(); }, [loadCompliance]);

  if (result === null || loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-tealGlow/60" />
        <p className="text-sm text-muted">Running compliance analysis…</p>
      </div>
    </div>
  );

  if (result === "error") return (
    <div className="py-8 text-center">
      <p className="text-sm text-danger">Compliance analysis failed — AI may be offline or no documents indexed.</p>
      <button onClick={() => loadCompliance(true)} className="mt-3 text-xs text-tealGlow hover:underline">Retry</button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="glass-glow p-5 flex items-center gap-5">
        <HealthRing score={result.compliance_score} size={80} />
        <div>
          <h3 className="font-semibold text-text">Compliance Score</h3>
          <p className="mt-0.5 text-xs text-muted">
            {result.gaps.length} gap{result.gaps.length !== 1 ? "s" : ""} identified • Confidence: {result.confidence}%
          </p>
          <button onClick={() => loadCompliance(true)} className="mt-2 flex items-center gap-1 text-xs text-tealGlow/70 hover:text-tealGlow">
            <RefreshCw className="h-3 w-3" /> Re-analyze
          </button>
        </div>
      </div>

      {result.gaps.length === 0 ? (
        <div className="py-6 text-center glass-glow">
          <CheckCircle2 className="mx-auto h-8 w-8 text-tealGlow mb-2" />
          <p className="text-sm text-tealGlow">No compliance gaps detected for this asset.</p>
        </div>
      ) : (
        <div className="glass-glow p-5">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">Compliance Gaps</h4>
          <ul className="space-y-4">
            {result.gaps.map((g, i) => (
              <li key={i} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`chip text-[9px] border font-bold ${SEVERITY_COLOR[g.severity] ?? SEVERITY_COLOR.medium}`}>
                    {(g.severity || "").toUpperCase()}
                  </span>
                  <span className="chip border-white/10 bg-white/5 text-muted text-[10px]">{g.standard} {g.clause}</span>
                </div>
                <p className="mt-2 text-sm text-text">{g.issue}</p>
                {g.citation && <p className="mt-1 text-[11px] text-muted/60 font-mono">{g.citation}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RcaTab({ tag }: { tag: string }) {
  const [result, setResult] = useState<RcaResult | null | "error">(null);
  const [loading, setLoading] = useState(false);

  const loadRca = useCallback(async () => {
    setLoading(true);
    try { setResult(await rca.get(tag)); }
    catch { setResult("error"); }
    finally { setLoading(false); }
  }, [tag]);

  useEffect(() => { loadRca(); }, [loadRca]);

  if (result === null || loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-tealGlow/60" />
        <p className="text-sm text-muted">Running root cause analysis…</p>
      </div>
    </div>
  );

  if (result === "error") return (
    <div className="py-8 text-center">
      <p className="text-sm text-danger">RCA failed — AI may be offline or no documents indexed.</p>
      <button onClick={loadRca} className="mt-3 text-xs text-tealGlow hover:underline">Retry</button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="glass-glow p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-text">Root Cause Analysis</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted">Confidence</span>
            <span className="font-mono text-sm font-bold text-tealGlow">{result.confidence}%</span>
          </div>
        </div>
        <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">{result.answer}</p>
        <button onClick={loadRca} className="mt-4 flex items-center gap-1.5 text-xs text-tealGlow/70 hover:text-tealGlow">
          <RefreshCw className="h-3 w-3" /> Re-run Analysis
        </button>
      </div>
      {result.sources.length > 0 && (
        <div className="glass-glow p-5">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">Evidence Sources</h4>
          <ul className="space-y-2">
            {result.sources.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <FileText className="h-3.5 w-3.5 text-muted/50 shrink-0 mt-0.5" />
                <div>
                  <span className="font-mono text-muted/70">{s.doc_name} — p.{s.page}</span>
                  {s.snippet && <p className="mt-0.5 text-muted/50 leading-relaxed">{s.snippet}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const TABS = [
  { key: "overview",    label: "Overview",   icon: Factory },
  { key: "events",      label: "Events",     icon: Clock },
  { key: "health",      label: "AI Health",  icon: Activity },
  { key: "forecast",    label: "Forecast",   icon: TrendingUp },
  { key: "compliance",  label: "Compliance", icon: Shield },
  { key: "rca",         label: "RCA",        icon: Brain },
];

export default function AssetDetailPage() {
  const params = useParams<{ tag: string }>();
  const router = useRouter();
  const tag = decodeURIComponent(params.tag);

  const [asset, setAsset] = useState<Asset | null | "error">(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  useEffect(() => {
    assets.get(tag)
      .then(setAsset)
      .catch(() => setAsset("error"));
  }, [tag]);

  async function handleScan() {
    setScanning(true);
    setScanMsg(null);
    try {
      const res = await assets.scan(tag);
      setScanMsg(res.message);
    } catch {
      setScanMsg("Alert scan failed.");
    } finally {
      setScanning(false);
    }
  }

  if (asset === null) return (
    <div className="min-h-screen"><AppSidebar />
      <PageContainer size="wide">
        <div className="mt-12 space-y-4"><Skeleton className="h-8 w-64 rounded-xl" /><Skeleton className="h-40 w-full rounded-2xl" /></div>
      </PageContainer>
    </div>
  );

  if (asset === "error") return (
    <div className="min-h-screen"><AppSidebar />
      <PageContainer size="wide">
        <div className="mt-12"><ErrorState message={`Asset '${tag}' not found or backend offline.`} onRetry={() => router.push("/assets")} /></div>
      </PageContainer>
    </div>
  );

  const status = STATUS_CONFIG[asset.status] ?? STATUS_CONFIG.operational;

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <PageContainer size="wide">
        {/* Back */}
        <Link href="/assets" className="mt-6 flex items-center gap-1.5 text-xs text-muted hover:text-tealGlow transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" /> Back to Asset Fleet
        </Link>

        {/* Asset header */}
        <div className="mt-4 glass-glow p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                <Factory className="h-7 w-7 text-tealGlow/70" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-mono text-2xl font-bold text-text">{asset.tag}</h1>
                  <span className={`chip text-[10px] border font-bold ${SEVERITY_COLOR[asset.criticality] ?? "text-muted border-white/10 bg-white/5"}`}>
                    {(asset.criticality || "").toUpperCase()}
                  </span>
                  <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{asset.name}</p>
                {asset.location && <p className="text-xs text-muted/60 mt-0.5">{asset.location}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <button
                onClick={handleScan}
                disabled={scanning}
                className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs font-medium text-goldGlow hover:bg-gold/20 disabled:opacity-40"
              >
                {scanning ? <><Loader2 className="h-3 w-3 animate-spin" />Scanning…</> : <><Zap className="h-3 w-3" />AI Alert Scan</>}
              </button>
              {scanMsg && <p className="text-[11px] text-tealGlow/70 text-right">{scanMsg}</p>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 overflow-x-auto scrollbar-none rounded-xl bg-white/3 border border-white/5 p-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={[
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all",
                activeTab === key
                  ? "bg-teal/15 border border-teal/30 text-tealGlow"
                  : "text-muted hover:text-text hover:bg-white/5",
              ].join(" ")}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-6 pb-16">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {activeTab === "overview"   && <OverviewTab asset={asset} />}
              {activeTab === "events"     && <EventsTab tag={tag} />}
              {activeTab === "health"     && <HealthTab tag={tag} name={asset.name} />}
              {activeTab === "forecast"   && <ForecastTab tag={tag} />}
              {activeTab === "compliance" && <ComplianceTab tag={tag} />}
              {activeTab === "rca"        && <RcaTab tag={tag} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </PageContainer>
    </div>
  );
}
