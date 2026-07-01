"use client";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { ExpandOnClick } from "@/components/ui/expand-on-click";
import { PanelExpand } from "@/components/ui/panel-expand";

type Status = "safe" | "warning" | "critical";
type Zone = {
  name: string;
  code: string;
  status: Status;
  sensors: { label: string; value: string; ok: boolean }[];
  permits: string[];
};

const ZONES: Zone[] = [
  {
    name: "Refinery Unit-4", code: "zone_a", status: "critical",
    sensors: [{ label: "Methane", value: "62% LEL", ok: false }, { label: "Temperature", value: "71 °C", ok: true }, { label: "Pressure", value: "6.1 bar", ok: true }],
    permits: ["Hot-work PTW-5521"],
  },
  {
    name: "Processing Plant", code: "zone_b", status: "warning",
    sensors: [{ label: "Pressure", value: "8.4 bar", ok: false }, { label: "Vibration", value: "17 mm/s", ok: false }, { label: "Temperature", value: "58 °C", ok: true }],
    permits: ["Maintenance MW-338"],
  },
  {
    name: "Control Room", code: "zone_c", status: "safe",
    sensors: [{ label: "Temperature", value: "23 °C", ok: true }, { label: "Humidity", value: "44%", ok: true }],
    permits: [],
  },
  {
    name: "Loading Bay", code: "zone_d", status: "safe",
    sensors: [{ label: "CO", value: "3 ppm", ok: true }, { label: "Temperature", value: "31 °C", ok: true }],
    permits: [],
  },
  {
    name: "Storage & Dispatch", code: "zone_e", status: "warning",
    sensors: [{ label: "Oxygen", value: "18.9%", ok: false }, { label: "H₂S", value: "8 ppm", ok: false }],
    permits: ["Confined-space CS-114"],
  },
  {
    name: "Maintenance Bay", code: "zone_f", status: "safe",
    sensors: [{ label: "Temperature", value: "27 °C", ok: true }, { label: "Noise", value: "72 dB", ok: true }],
    permits: [],
  },
];

const map = {
  safe: { dot: "bg-success", ring: "border-success/30", label: "Safe" },
  warning: { dot: "bg-warning", ring: "border-warning/40", label: "Warning" },
  critical: { dot: "bg-danger", ring: "border-danger/50", label: "Critical" },
} as const;

export function ZoneStatusGrid() {
  return (
    <PanelExpand render={() => (
    <div className="glass-glow p-6">
      <div className="mb-5 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-tealGlow" />
        <h2 className="display text-lg font-semibold">Facility Zone Status</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ZONES.map((z, i) => {
          const m = map[z.status];
          const collapsed = (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className={`flex items-center gap-3 rounded-xl border ${m.ring} bg-base/50 px-3 py-2.5 transition-colors hover:border-teal/40`}
            >
              <span className="relative flex h-2.5 w-2.5 flex-none">
                {z.status !== "safe" && (
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${m.dot} opacity-60`} />
                )}
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${m.dot}`} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{z.name}</p>
                <p className="font-mono text-[10px] text-muted">{m.label}</p>
              </div>
            </motion.div>
          );

          const expanded = (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${m.dot}`} />
                <div>
                  <h3 className="display text-xl font-semibold">{z.name}</h3>
                  <p className="mt-0.5 font-mono text-xs text-muted">{z.code} · {m.label}</p>
                </div>
              </div>

              <p className="mb-2 text-xs uppercase tracking-wider text-muted">Live sensors</p>
              <div className="mb-5 space-y-2">
                {z.sensors.map((s) => (
                  <div key={s.label} className="flex items-center justify-between rounded-lg border border-border bg-base/50 px-3 py-2 text-sm">
                    <span className="text-muted">{s.label}</span>
                    <span className={`font-mono ${s.ok ? "text-tealGlow" : "text-danger"}`}>{s.value}</span>
                  </div>
                ))}
              </div>

              <p className="mb-2 text-xs uppercase tracking-wider text-muted">Active permits</p>
              {z.permits.length ? (
                <div className="flex flex-wrap gap-2">
                  {z.permits.map((p) => (
                    <span key={p} className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs text-goldGlow">{p}</span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No active permits.</p>
              )}
            </div>
          );

          return (
            <ExpandOnClick
              key={z.code}
              collapsed={collapsed}
              expanded={expanded}
              accent={z.status === "critical" ? "danger" : z.status === "warning" ? "gold" : "teal"}
            />
          );
        })}
      </div>
    </div>
    )} />
  );
}
