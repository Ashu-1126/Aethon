"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import {
  ShieldAlert, Flame, Wind, AlertOctagon, Droplets, Zap,
  PhoneCall, Navigation, HardHat, AlertCircle, CheckSquare,
  Loader2, RefreshCw, ChevronRight, FileText
} from "lucide-react";
import { emergencyPlans, assets } from "@/lib/api";
import type { EmergencyPlanPayload, Asset } from "@/lib/types";

const HAZARD_TYPES = [
  { type: "Fire", label: "Fire & Explosion", icon: Flame, color: "text-danger bg-danger/10 border-danger/30" },
  { type: "Gas leak", label: "Toxic Gas Leak (H2S)", icon: Wind, color: "text-goldGlow bg-gold/10 border-gold/30" },
  { type: "Equipment failure", label: "Catastrophic Failure", icon: AlertOctagon, color: "text-violet-400 bg-violet-400/10 border-violet-400/30" },
  { type: "Chemical spill", label: "Hazardous Chemical Spill", icon: Droplets, color: "text-tealGlow bg-teal/10 border-teal/30" },
  { type: "Power failure", label: "Total Power Blackout", icon: Zap, color: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
];

export default function EmergencyPage() {
  const [selectedHazard, setSelectedHazard] = useState("Fire");
  const [selectedAsset, setSelectedAsset] = useState("PLANT-WIDE");
  const [fleet, setFleet] = useState<Asset[]>([]);
  const [activePlan, setActivePlan] = useState<EmergencyPlanPayload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    assets.list().then((list) => setFleet(list)).catch(() => {});
  }, []);

  const handleGeneratePlan = useCallback(async (hazard: string, assetTag: string) => {
    setLoading(true);
    try {
      const plan = await emergencyPlans.generate(hazard, assetTag);
      setActivePlan(plan);
    } catch {
      // optional fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    handleGeneratePlan(selectedHazard, selectedAsset);
  }, [selectedHazard, selectedAsset, handleGeneratePlan]);

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <PageContainer
        size="wide"
        hero={
          <PageHero
            badgeLabel="✦ Safety"
            badgeText="Emergency Command"
            title1="Autonomous Industrial"
            title2="Emergency Response Plans"
            description="Instant AI synthesis of emergency SOPs, ESD shutdown sequences, isolation steps, PPE requirements, evacuation protocols, & incident contacts."
          />
        }
      >
        {/* Hazard Selector Matrix */}
        <Reveal delay={0.05}>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
            {HAZARD_TYPES.map((h) => {
              const Icon = h.icon;
              const isSelected = selectedHazard === h.type;
              return (
                <button
                  key={h.type}
                  onClick={() => setSelectedHazard(h.type)}
                  className={`p-4 rounded-xl border transition-all text-left flex flex-col justify-between space-y-3 ${
                    isSelected ? `${h.color} shadow-lg ring-1 ring-white/20` : "glass opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5" />
                    {isSelected && <span className="h-2 w-2 rounded-full bg-white animate-ping" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold block">{h.label}</span>
                    <span className="text-[10px] opacity-70">Generate Protocol</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* Asset Scope Filter */}
        <Reveal delay={0.1}>
          <div className="glass mt-6 p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-mono text-muted">
              <span>Target Scope:</span>
              <select
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
                className="bg-surface/80 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-tealGlow outline-none"
              >
                <option value="PLANT-WIDE">PLANT-WIDE (Central Facility)</option>
                {fleet.map((a) => (
                  <option key={a.tag} value={a.tag}>
                    {a.tag} — {a.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => handleGeneratePlan(selectedHazard, selectedAsset)}
              disabled={loading}
              className="btn-gold sheen flex items-center gap-2 text-xs font-semibold px-4 py-2"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Re-synthesize ERP
            </button>
          </div>
        </Reveal>

        {/* Active Emergency Plan Workspace */}
        {loading ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : activePlan && (
          <div className="mt-8 space-y-6">
            {/* Header Banner */}
            <Reveal delay={0.15}>
              <div className="p-6 rounded-2xl border border-danger/40 bg-danger/10 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="chip border border-danger/40 bg-danger/20 text-white font-mono text-xs font-bold uppercase">
                    EMERGENCY RESPONSE PROTOCOL: {activePlan.hazard_type}
                  </span>
                  <span className="font-mono text-xs text-muted">Plan ID: {activePlan.plan_id}</span>
                </div>
                <h2 className="display text-xl font-bold text-text">{activePlan.title}</h2>
                <p className="text-xs text-muted/90 leading-relaxed font-mono">{activePlan.emergency_sop}</p>
              </div>
            </Reveal>

            {/* Shutdown Sequence & Isolation Steps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Emergency Shutdown Sequence */}
              <Reveal delay={0.2}>
                <div className="glass-glow p-6 space-y-4 h-full">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-danger flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-danger" /> 60-Second Emergency Shutdown (ESD) Sequence
                  </h3>
                  <div className="space-y-2.5">
                    {activePlan.shutdown_sequence?.map((step, i) => (
                      <div key={i} className="p-3 rounded-xl border border-danger/20 bg-danger/5 text-xs text-text flex items-start gap-2.5">
                        <span className="h-5 w-5 rounded-lg border border-danger/40 bg-danger/20 text-danger flex items-center justify-center font-mono text-xs font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>

              {/* Isolation Steps */}
              <Reveal delay={0.25}>
                <div className="glass-glow p-6 space-y-4 h-full">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-goldGlow flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-goldGlow" /> Physical & Electrical Isolation Steps
                  </h3>
                  <div className="space-y-2.5">
                    {activePlan.isolation_steps?.map((step, i) => (
                      <div key={i} className="p-3 rounded-xl border border-gold/20 bg-gold/5 text-xs text-text flex items-start gap-2.5">
                        <span className="text-goldGlow font-mono font-bold text-xs shrink-0 mt-0.5">LOTO</span>
                        <span className="leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Required PPE & Evacuation Protocol */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Mandatory PPE */}
              <Reveal delay={0.3}>
                <div className="glass-glow p-6 space-y-4 h-full">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-tealGlow flex items-center gap-2">
                    <HardHat className="h-4 w-4 text-tealGlow" /> Mandatory Tactical PPE
                  </h3>
                  <ul className="space-y-2 text-xs text-text">
                    {activePlan.required_ppe?.map((ppe, i) => (
                      <li key={i} className="p-2.5 rounded-lg border border-teal/20 bg-teal/5 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-tealGlow" />
                        <span>{ppe}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              {/* Evacuation Protocol */}
              <Reveal delay={0.35}>
                <div className="glass-glow p-6 space-y-4 h-full">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-blue-400 flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-blue-400" /> Plant Evacuation Protocol
                  </h3>
                  {activePlan.evacuation_protocol && (
                    <div className="space-y-3 text-xs text-text">
                      <div className="p-3 rounded-xl border border-white/5 bg-white/3 space-y-1">
                        <span className="font-bold text-tealGlow block">Primary Assembly Point:</span>
                        <p className="text-muted">{activePlan.evacuation_protocol.primary_assembly_point}</p>
                      </div>
                      <div className="p-3 rounded-xl border border-white/5 bg-white/3 space-y-1">
                        <span className="font-bold text-goldGlow block">Secondary Assembly Point:</span>
                        <p className="text-muted">{activePlan.evacuation_protocol.secondary_assembly_point}</p>
                      </div>
                      <div className="p-3 rounded-xl border border-white/5 bg-white/3 space-y-1">
                        <span className="font-bold text-blue-400 block">Evacuation Routes & Wind Dynamics:</span>
                        <p className="text-muted">{activePlan.evacuation_protocol.evacuation_routes}</p>
                        <p className="text-[10px] text-muted/60 font-mono mt-1">{activePlan.evacuation_protocol.wind_direction_dependency}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Reveal>
            </div>

            {/* Emergency Contacts */}
            <Reveal delay={0.4}>
              <div className="glass-glow p-6 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-violet-400 flex items-center gap-2">
                  <PhoneCall className="h-4 w-4 text-violet-400" /> Emergency Response Command Contacts
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {activePlan.emergency_contacts?.map((c, i) => (
                    <div key={i} className="p-3.5 rounded-xl border border-violet-400/20 bg-violet-400/5 space-y-1">
                      <span className="text-xs font-bold text-text block">{c.role}</span>
                      <span className="font-mono text-xs font-bold text-violet-400">{c.phone}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        )}
      </PageContainer>
    </div>
  );
}
