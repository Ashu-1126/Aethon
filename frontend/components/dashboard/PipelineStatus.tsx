"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Loader2, ScanLine, CheckCircle2, ArrowRight } from "lucide-react";

const stages = [
  { label: "Parsing", value: 3, icon: ScanLine, color: "text-gold" },
  { label: "Embedding", value: 12, icon: Loader2, color: "text-tealGlow", spin: true },
  { label: "Indexed", value: 4182, icon: CheckCircle2, color: "text-success" },
];

export function PipelineStatus() {
  return (
    <div className="glass-glow p-6">
      <div className="mb-5 flex items-center gap-2">
        <ScanLine className="h-4 w-4 text-tealGlow" />
        <h2 className="display text-lg font-semibold">Ingestion Pipeline</h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stages.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="rounded-xl border border-border bg-base/50 p-4 text-center"
          >
            <s.icon className={`mx-auto mb-2 h-5 w-5 ${s.color} ${s.spin ? "animate-spin" : ""}`} strokeWidth={1.6} />
            <p className="display text-2xl font-semibold">{s.value.toLocaleString()}</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <Link
        href="/upload"
        className="mt-4 inline-flex items-center gap-1 text-xs text-tealGlow hover:underline"
      >
        Manage ingestion <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
