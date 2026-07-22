"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Cpu, Activity, Zap, Shield, FileText, Wrench, AlertTriangle,
  CheckCircle2, Wifi, RefreshCw, X, Radio, Gauge, Thermometer,
  Brain, TrendingUp, Layers, ChevronRight, Share2, Sparkles
} from "lucide-react";
import { assets, graph } from "@/lib/api";
import type {
  Asset, AssetHealth, AssetForecast, AssetComplianceResult,
  AssetEvent, GraphData
} from "@/lib/types";
import type { RcaResult } from "@/lib/api";

const STATUS_STYLES: Record<string, { label: string; border: string; bg: string; dot: string; glow: string }> = {
  operational: { label: "Operational", border: "border-teal/50", bg: "bg-teal/10", dot: "bg-tealGlow", glow: "shadow-[0_0_15px_rgba(0,210,180,0.2)]" },
  degraded:    { label: "Degraded",    border: "border-gold/50", bg: "bg-gold/10", dot: "bg-gold animate-ping", glow: "shadow-[0_0_15px_rgba(245,158,11,0.25)]" },
  offline:     { label: "Offline",     border: "border-danger/50", bg: "bg-danger/10", dot: "bg-danger", glow: "shadow-[0_0_15px_rgba(239,68,68,0.25)]" },
  maintenance: { label: "Maintenance", border: "border-violet-500/50", bg: "bg-violet-500/10", dot: "bg-violet-400", glow: "shadow-[0_0_15px_rgba(139,92,246,0.25)]" },
};

export default function DigitalTwinPage() {
  const [fleet, setFleet] = useState<Asset[] | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [telemetryTick, setTelemetryTick] = useState(0);

  // Asset intelligence side-panel states
  const [healthData, setHealthData] = useState<AssetHealth | null>(null);
  const [forecastData, setForecastData] = useState<AssetForecast | null>(null);
  const [complianceData, setComplianceData] = useState<AssetComplianceResult | null>(null);
  const [eventsData, setEventsData] = useState<AssetEvent[]>([]);
  const [docsData, setDocsData] = useState<string[]>([]);
  const [rcaData, setRcaData] = useState<RcaResult | null>(null);
  const [subgraph, setSubgraph] = useState<GraphData | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);

  const loadFleet = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await assets.list();
      setFleet(data);
      if (data.length > 0 && !selectedTag) {
        setSelectedTag(data[0].tag);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedTag]);

  useEffect(() => {
    loadFleet();
  }, [loadFleet]);

  // Live telemetry pulse simulator
  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetryTick((t) => t + 1);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // Fetch full intelligence payload when an asset node is selected
  useEffect(() => {
    if (!selectedTag) return;
    setPanelLoading(true);
    Promise.all([
      assets.health(selectedTag).catch(() => null),
      assets.forecast(selectedTag).catch(() => null),
      assets.compliance(selectedTag).catch(() => null),
      assets.getEvents(selectedTag).catch(() => []),
      assets.getDocuments(selectedTag).catch(() => []),
      assets.rca(selectedTag).catch(() => null),
      graph.traverse(selectedTag, 1).catch(() => null),
    ]).then(([h, f, c, ev, d, r, g]) => {
      setHealthData(h);
      setForecastData(f);
      setComplianceData(c);
      setEventsData(ev);
      setDocsData(d);
      setRcaData(r);
      setSubgraph(g);
      setPanelLoading(false);
    });
  }, [selectedTag]);

  const selectedAsset = useMemo(() => fleet?.find((a) => a.tag === selectedTag), [fleet, selectedTag]);

  // Dynamic simulated sensor values based on telemetry ticks
  const liveSensorData = useMemo(() => {
    if (!selectedTag) return { temp: 68, vib: 1.2, press: 4.2 };
    const hash = selectedTag.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const temp = 65 + ((hash + telemetryTick * 3) % 25);
    const vib = 0.8 + (((hash * 2 + telemetryTick) % 20) / 10);
    const press = 3.5 + (((hash + telemetryTick) % 15) / 10);
    return { temp: temp.toFixed(1), vib: vib.toFixed(2), press: press.toFixed(2) };
  }, [selectedTag, telemetryTick]);

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <PageContainer
        size="wide"
        hero={
          <PageHero
            badgeLabel="❖ Digital Twin"
            badgeText="Live Visual Twin & Intelligence Matrix"
            title1="Real-time Plant,"
            title2="unified brain."
            description="Visual spatial topology of your facility's assets. Select any asset node to stream live telemetry, health diagnostics, failure forecasts, compliance gaps, linked documents, and knowledge graph subgraphs."
          />
        }
      >
        {error ? (
          <div className="mt-8">
            <ErrorState message="Couldn't load Digital Twin fleet data." onRetry={loadFleet} />
          </div>
        ) : loading || !fleet ? (
          <Skeleton className="mt-8 h-[600px] w-full rounded-2xl" />
        ) : (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-16">
            {/* Visual Factory Twin Map (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="glass-glow p-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-tealGlow animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-text">
                    Shop Floor Spatial Matrix
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-tealGlow" /> Operational
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-gold" /> Degraded
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-danger" /> Offline
                  </span>
                </div>
              </div>

              {/* Spatial Floorplan Canvas */}
              <div className="relative min-h-[520px] rounded-2xl border border-white/10 bg-[#07090e] p-6 overflow-hidden flex flex-wrap content-start gap-4">
                {/* Visual grid lines overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

                {fleet.map((asset) => {
                  const isSel = asset.tag === selectedTag;
                  const st = STATUS_STYLES[asset.status] ?? STATUS_STYLES.operational;
                  return (
                    <motion.div
                      key={asset.id}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSelectedTag(asset.tag)}
                      className={`relative cursor-pointer rounded-xl border p-4 transition-all duration-200 w-full sm:w-[calc(50%-8px)] xl:w-[calc(33.33%-11px)] ${st.bg} ${st.border} ${
                        isSel ? `ring-2 ring-tealGlow ${st.glow}` : "hover:border-teal/40"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-xs font-bold text-text block">{asset.tag}</span>
                          <span className="text-[11px] text-muted truncate block max-w-[120px]">{asset.name}</span>
                        </div>
                        <span className={`h-2.5 w-2.5 rounded-full ${st.dot}`} />
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[10px] text-muted/70 border-t border-white/5 pt-2">
                        <span className="capitalize">{asset.category}</span>
                        <span className="font-mono text-tealGlow">{liveSensorData.temp}°C</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Asset Complete Intelligence Panel (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              {!selectedAsset ? (
                <div className="glass-glow p-8 text-center text-xs text-muted">
                  Select an asset node on the spatial matrix to view complete digital twin intelligence.
                </div>
              ) : (
                <div className="glass-glow p-6 space-y-5">
                  {/* Asset Header */}
                  <div className="flex items-start justify-between border-b border-white/5 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xl font-bold text-text">{selectedAsset.tag}</span>
                        <span className="chip border border-teal/30 bg-teal/10 text-tealGlow text-[10px] uppercase font-bold">
                          {selectedAsset.criticality}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5">{selectedAsset.name}</p>
                    </div>
                    {panelLoading && <RefreshCw className="h-4 w-4 animate-spin text-tealGlow/70" />}
                  </div>

                  {/* Sensor Telemetry Matrix */}
                  <div>
                    <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-2 flex items-center gap-1.5">
                      <Radio className="h-3 w-3 text-tealGlow" /> Live Sensor Telemetry
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg border border-white/5 bg-white/3 p-2">
                        <span className="text-[9px] text-muted block">Temperature</span>
                        <span className="font-mono text-xs font-bold text-text">{liveSensorData.temp} °C</span>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-white/3 p-2">
                        <span className="text-[9px] text-muted block">Vibration</span>
                        <span className="font-mono text-xs font-bold text-text">{liveSensorData.vib} mm/s</span>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-white/3 p-2">
                        <span className="text-[9px] text-muted block">Pressure</span>
                        <span className="font-mono text-xs font-bold text-text">{liveSensorData.press} Bar</span>
                      </div>
                    </div>
                  </div>

                  {/* Health & Forecast Diagnostics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-teal/20 bg-teal/5 p-3">
                      <span className="text-[10px] text-muted block">AI Health Score</span>
                      <span className="font-mono text-lg font-bold text-tealGlow">
                        {healthData?.health_score ?? "—"}/100
                      </span>
                      <p className="text-[10px] text-muted/70 mt-1 line-clamp-2">
                        {healthData?.status_assessment || "Analyzing health..."}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gold/20 bg-gold/5 p-3">
                      <span className="text-[10px] text-muted block">Failure Forecast</span>
                      <span className="font-mono text-lg font-bold text-goldGlow">
                        {forecastData?.predicted_failure_window_days != null
                          ? `${forecastData.predicted_failure_window_days}d`
                          : "—"}
                      </span>
                      <p className="text-[10px] text-muted/70 mt-1 line-clamp-2">
                        {forecastData?.failure_mode || "No failure risk detected."}
                      </p>
                    </div>
                  </div>

                  {/* Compliance & RCA Findings */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted flex items-center gap-1.5">
                      <Shield className="h-3 w-3 text-tealGlow" /> Compliance & Root Cause
                    </h4>
                    <div className="rounded-lg border border-white/5 bg-white/3 p-3 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted">Compliance Score:</span>
                        <span className="font-mono text-tealGlow font-bold">{complianceData?.compliance_score ?? 100}%</span>
                      </div>
                      {rcaData?.answer && (
                        <p className="text-[11px] text-muted/80 leading-relaxed mt-2 pt-2 border-t border-white/5">
                          <span className="text-text font-semibold">RCA Summary: </span>
                          {rcaData.answer}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Knowledge Graph Subgraph Preview */}
                  {subgraph && subgraph.nodes.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-2 flex items-center gap-1.5">
                        <Share2 className="h-3 w-3 text-tealGlow" /> Subgraph Context ({subgraph.nodes.length} Nodes)
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {subgraph.nodes.slice(0, 6).map((n) => (
                          <span key={n.id} className="chip border border-white/10 bg-white/5 text-[9px] font-mono text-muted">
                            {n.label} ({n.type})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Linked Documents */}
                  {docsData.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-2 flex items-center gap-1.5">
                        <FileText className="h-3 w-3 text-tealGlow" /> Linked Manuals & SOPs
                      </h4>
                      <div className="space-y-1">
                        {docsData.map((d, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-muted/70 font-mono">
                            <FileText className="h-3 w-3 text-muted/40" /> {d}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </PageContainer>
    </div>
  );
}
