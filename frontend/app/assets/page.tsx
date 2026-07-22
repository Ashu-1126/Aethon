"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Factory, Plus, Search, Filter, Zap, AlertTriangle,
  CheckCircle2, Wrench, WifiOff, Loader2, X, ChevronRight,
  Gauge, Thermometer, Activity, Shield,
} from "lucide-react";
import { assets } from "@/lib/api";
import type { Asset, AssetCriticality, AssetStatus } from "@/lib/types";
import Link from "next/link";

// ── Constants ─────────────────────────────────────────────────────────────────
const CRITICALITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; icon: React.ElementType }> = {
  operational: { label: "Operational",  color: "text-tealGlow border-teal/30 bg-teal/10",  dot: "bg-tealGlow", icon: CheckCircle2 },
  degraded:    { label: "Degraded",     color: "text-goldGlow border-gold/30 bg-gold/10",  dot: "bg-gold animate-pulse", icon: AlertTriangle },
  offline:     { label: "Offline",      color: "text-danger  border-danger/30 bg-danger/10", dot: "bg-danger", icon: WifiOff },
  maintenance: { label: "Maintenance",  color: "text-violet-400 border-violet-500/30 bg-violet-500/10", dot: "bg-violet-400", icon: Wrench },
};

const CRITICALITY_CONFIG: Record<string, { label: string; ring: string; badge: string }> = {
  critical: { label: "CRITICAL", ring: "ring-1 ring-danger/40",  badge: "bg-danger/15 text-danger border-danger/30" },
  high:     { label: "HIGH",     ring: "ring-1 ring-gold/40",    badge: "bg-gold/15 text-goldGlow border-gold/30" },
  medium:   { label: "MEDIUM",   ring: "ring-1 ring-teal/20",    badge: "bg-teal/10 text-tealGlow border-teal/20" },
  low:      { label: "LOW",      ring: "ring-1 ring-white/10",   badge: "bg-white/5 text-muted border-white/10" },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  pump: Activity,
  vessel: Gauge,
  compressor: Zap,
  heat_exchanger: Thermometer,
  default: Factory,
};

// ── Create Asset Modal ────────────────────────────────────────────────────────
function CreateAssetModal({ onClose, onCreate }: { onClose: () => void; onCreate: (a: Asset) => void }) {
  const [form, setForm] = useState({
    tag: "", name: "", category: "pump", location: "",
    criticality: "medium", manufacturer: "", model_number: "", install_date: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tag.trim() || !form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const asset = await assets.create(form);
      onCreate(asset);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create asset.");
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, key: keyof typeof form, type = "text", placeholder = "") => (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-muted uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text placeholder-muted/40 focus:border-teal/40 focus:outline-none focus:ring-1 focus:ring-teal/20"
      />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="glass-glow w-full max-w-lg p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-text">Register Asset</h2>
            <p className="text-xs text-muted mt-0.5">Add an industrial asset to the fleet registry</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:text-text hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            {field("Plant Tag *", "tag", "text", "e.g. P-101")}
            {field("Asset Name *", "name", "text", "e.g. Feed Water Pump")}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted uppercase tracking-wider">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text focus:border-teal/40 focus:outline-none"
              >
                {["pump","vessel","compressor","valve","motor","heat_exchanger","tank","reactor","other"].map(c => (
                  <option key={c} value={c} className="bg-[#0d0d14]">{c.replace(/_/g," ")}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted uppercase tracking-wider">Criticality</label>
              <select
                value={form.criticality}
                onChange={(e) => setForm((f) => ({ ...f, criticality: e.target.value }))}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text focus:border-teal/40 focus:outline-none"
              >
                {["critical","high","medium","low"].map(c => (
                  <option key={c} value={c} className="bg-[#0d0d14]">{c}</option>
                ))}
              </select>
            </div>
          </div>
          {field("Location", "location", "text", "e.g. Unit-3 / Bay-A")}
          <div className="grid grid-cols-2 gap-4">
            {field("Manufacturer", "manufacturer", "text", "e.g. KSB, Grundfos")}
            {field("Model Number", "model_number", "text", "e.g. ME-100")}
          </div>
          {field("Install Date", "install_date", "date")}

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-muted hover:text-text hover:bg-white/5">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.tag.trim() || !form.name.trim()}
              className="flex items-center gap-2 rounded-lg bg-teal/20 border border-teal/40 px-4 py-2 text-sm font-medium text-tealGlow hover:bg-teal/30 disabled:opacity-40"
            >
              {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Registering…</> : <><Plus className="h-3.5 w-3.5" />Register Asset</>}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Asset Card ────────────────────────────────────────────────────────────────
function AssetCard({ asset, index }: { asset: Asset; index: number }) {
  const status = STATUS_CONFIG[asset.status] ?? STATUS_CONFIG.operational;
  const crit   = CRITICALITY_CONFIG[asset.criticality] ?? CRITICALITY_CONFIG.medium;
  const StatusIcon = status.icon;
  const CatIcon = CATEGORY_ICONS[asset.category] ?? CATEGORY_ICONS.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link href={`/assets/${encodeURIComponent(asset.tag)}`}>
        <div className={`group glass-glow p-5 cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(0,210,180,0.08)] ${crit.ring}`}>
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                <CatIcon className="h-5 w-5 text-tealGlow/80" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-text">{asset.tag}</span>
                  <span className={`chip text-[9px] border font-bold tracking-widest ${crit.badge}`}>
                    {crit.label}
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5 truncate max-w-[180px]">{asset.name}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted/40 group-hover:text-tealGlow/60 transition-colors shrink-0 mt-1" />
          </div>

          {/* Status pill */}
          <div className="mt-4 flex items-center justify-between gap-2">
            <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${status.color}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </div>
            <span className="text-[11px] text-muted capitalize">{asset.category.replace(/_/g, " ")}</span>
          </div>

          {/* Location */}
          {asset.location && (
            <p className="mt-2 text-[11px] text-muted/60 truncate">{asset.location}</p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

// ── Fleet Summary Bar ─────────────────────────────────────────────────────────
function FleetSummary({ fleet }: { fleet: Asset[] }) {
  const counts = fleet.reduce(
    (acc, a) => {
      acc[a.status as string] = (acc[a.status as string] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const pills = [
    { key: "operational", label: "Operational", color: "text-tealGlow",  bg: "bg-teal/10 border-teal/20" },
    { key: "degraded",    label: "Degraded",    color: "text-goldGlow",  bg: "bg-gold/10 border-gold/20" },
    { key: "maintenance", label: "Maintenance", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
    { key: "offline",     label: "Offline",     color: "text-danger",    bg: "bg-danger/10 border-danger/20" },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {pills.map(p => (
        <div key={p.key} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${p.bg}`}>
          <span className={`font-bold text-sm ${p.color}`}>{counts[p.key] || 0}</span>
          <span className="text-muted">{p.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AssetsPage() {
  const [fleet, setFleet] = useState<Asset[] | null>(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCrit, setFilterCrit] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const data = await assets.list();
      setFleet(data);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = (fleet ?? [])
    .filter((a) => {
      const q = search.toLowerCase();
      const matchSearch = !q || a.tag.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.location?.toLowerCase().includes(q);
      const matchStatus = filterStatus === "all" || a.status === filterStatus;
      const matchCrit   = filterCrit === "all" || a.criticality === filterCrit;
      return matchSearch && matchStatus && matchCrit;
    })
    .sort((a, b) => (CRITICALITY_ORDER[a.criticality] ?? 9) - (CRITICALITY_ORDER[b.criticality] ?? 9));

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <PageContainer
        size="wide"
        hero={
          <PageHero
            badgeLabel="❖ Asset Registry"
            badgeText="Industrial Fleet"
            title1="Your assets,"
            title2="always in view."
            description="Register, monitor, and run AI diagnostics on every industrial asset in your facility. AETHON tracks health, compliance, and predicted failures — across the entire fleet."
          />
        }
      >
        {/* Toolbar */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/60" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by tag, name, location…"
                className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm text-text placeholder-muted/40 focus:border-teal/40 focus:outline-none focus:ring-1 focus:ring-teal/20"
              />
            </div>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text focus:border-teal/40 focus:outline-none"
            >
              <option value="all" className="bg-[#0d0d14]">All Statuses</option>
              {["operational","degraded","maintenance","offline"].map(s => (
                <option key={s} value={s} className="bg-[#0d0d14] capitalize">{s}</option>
              ))}
            </select>

            {/* Criticality filter */}
            <select
              value={filterCrit}
              onChange={(e) => setFilterCrit(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text focus:border-teal/40 focus:outline-none"
            >
              <option value="all" className="bg-[#0d0d14]">All Criticalities</option>
              {["critical","high","medium","low"].map(c => (
                <option key={c} value={c} className="bg-[#0d0d14] capitalize">{c}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg border border-teal/30 bg-teal/15 px-4 py-2 text-sm font-medium text-tealGlow transition-all hover:bg-teal/25"
          >
            <Plus className="h-4 w-4" />
            Register Asset
          </button>
        </div>

        {/* Fleet summary */}
        {fleet && fleet.length > 0 && (
          <div className="mt-4">
            <FleetSummary fleet={fleet} />
          </div>
        )}

        {/* Content */}
        {error ? (
          <div className="mt-8">
            <ErrorState message="Couldn't load asset fleet. The backend may be offline." onRetry={load} />
          </div>
        ) : fleet === null ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl border border-white/5 bg-white/3 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={Factory}
              title={fleet.length === 0 ? "No assets registered" : "No assets match your filters"}
              message={fleet.length === 0
                ? "Register your first industrial asset to begin fleet intelligence. AETHON will track health, maintenance, and compliance for every asset."
                : "Try changing your search or filter criteria."}
            />
            {fleet.length === 0 && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 rounded-lg border border-teal/30 bg-teal/15 px-5 py-2.5 text-sm font-medium text-tealGlow hover:bg-teal/25"
                >
                  <Plus className="h-4 w-4" />
                  Register Your First Asset
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((asset, i) => (
              <AssetCard key={asset.id} asset={asset} index={i} />
            ))}
          </div>
        )}

        {/* Count */}
        {fleet !== null && filtered.length > 0 && (
          <p className="mt-6 text-center text-xs text-muted/50">
            Showing {filtered.length} of {fleet.length} asset{fleet.length !== 1 ? "s" : ""}
          </p>
        )}
      </PageContainer>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateAssetModal
            onClose={() => setShowCreate(false)}
            onCreate={(a) => setFleet((f) => [...(f ?? []), a])}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
