"use client";
import { motion } from "framer-motion";
import { Lightbulb, Wrench, ArrowRight } from "lucide-react";
import Link from "next/link";

export function InsightCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-glow p-6"
    >
      <div className="mb-4 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-goldGlow" />
        <h2 className="display text-lg font-semibold">Latest RCA Insight</h2>
      </div>

      <div className="rounded-xl border border-teal/20 bg-base/50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal/30 bg-teal/10 text-tealGlow">
            <Wrench className="h-4 w-4" strokeWidth={1.6} />
          </span>
          <div>
            <p className="text-sm font-medium">Recurring bearing failure · Pump P-204</p>
            <p className="font-mono text-[11px] text-muted">3rd occurrence this year</p>
          </div>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="w-28 flex-none text-muted">Root cause</dt>
            <dd className="text-text">Lubrication interval set to 90d — OEM mandates 60d</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 flex-none text-muted">Affected</dt>
            <dd className="text-text">Pump P-204 · Processing Plant</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 flex-none text-muted">Recommended</dt>
            <dd className="text-tealGlow">Revise MP-12 to 60-day interval · re-lubricate now</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="chip">WorkOrder_log.xlsx</span>
          <span className="chip">OEM_Pump_Manual.pdf · p.7</span>
        </div>
      </div>

      <Link
        href="/rca"
        className="mt-4 inline-flex items-center gap-1 text-xs text-tealGlow hover:underline"
      >
        View all RCA insights <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </motion.div>
  );
}
