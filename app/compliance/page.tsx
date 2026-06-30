"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { Counter } from "@/components/ui/Counter";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Send,
  Loader2,
} from "lucide-react";
import { compliance, copilot } from "@/lib/api";
import type { ComplianceAudit, ComplianceResult } from "@/lib/types";

// ── Quick-check types ──────────────────────────────────────────────────────
type QuickCheck = {
  query: string;
  answer: string;
  confidence: number;
} | null;

// ── Colors by score ────────────────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 90) return "text-tealGlow";
  if (score >= 75) return "text-goldGlow";
  return "text-danger";
}
function barColor(score: number) {
  if (score >= 90) return "from-teal to-tealGlow";
  if (score >= 75) return "from-gold to-goldGlow";
  return "from-danger/60 to-danger";
}

// ─────────────────────────────────────────────────────────────────────────────
function StandardCard({ s }: { s: ComplianceResult }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass overflow-hidden transition-colors hover:border-teal/30">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4"
      >
        <div className="flex items-center gap-3">
          {s.score >= 90 ? (
            <CheckCircle2 className="h-4 w-4 flex-none text-tealGlow" />
          ) : (
            <AlertTriangle className="h-4 w-4 flex-none text-goldGlow" />
          )}
          <span className="text-sm font-medium">{s.standard}</span>
        </div>
        <div className="flex items-center gap-4">
          {/* bar */}
          <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-border sm:block">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${s.score}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className={`h-full rounded-full bg-gradient-to-r ${barColor(s.score)}`}
            />
          </div>
          <span className={`font-mono text-sm font-semibold ${scoreColor(s.score)}`}>
            {s.score}%
          </span>
          <span className="text-muted">
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-5 pb-4 pt-3">
              {s.gaps.length === 0 ? (
                <p className="flex items-center gap-2 text-xs text-tealGlow">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  No gaps detected — fully compliant with indexed procedures.
                </p>
              ) : (
                <ul className="space-y-2">
                  {s.gaps.map((g, i) => (
                    <li key={i} className="flex flex-col gap-0.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="chip border-gold/30 bg-gold/10 text-goldGlow">
                          {g.clause}
                        </span>
                      </div>
                      <p className="pl-1 text-muted">{g.issue}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function CompliancePage() {
  const [audit, setAudit] = useState<ComplianceAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Quick-check
  const [checkText, setCheckText] = useState("");
  const [checking, setChecking] = useState(false);
  const [quickResult, setQuickResult] = useState<QuickCheck>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setAudit(await compliance.audit());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function runQuickCheck() {
    if (!checkText.trim() || checking) return;
    setChecking(true);
    setQuickResult(null);
    try {
      const q = `Does the following procedure comply with applicable regulations?\n\n${checkText}`;
      const res = await copilot.query(q);
      setQuickResult({
        query: checkText,
        answer: res.answer,
        confidence: res.confidence,
      });
    } catch {
      setQuickResult({ query: checkText, answer: "Backend offline — check server.", confidence: 0 });
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <PageContainer size="wide">

        {/* Header */}
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-widest text-tealGlow">
            Compliance Agent
          </p>
          <h1 className="display mt-1 text-2xl font-semibold sm:text-3xl md:text-4xl">
            Regulatory Audit
          </h1>
          <p className="mt-3 max-w-xl text-muted">
            Every procedure mapped against Factory Act, OISD, DGMS and PESO.
            Gaps identified, evidence packaged.
          </p>
        </Reveal>

        {error ? (
          <div className="mt-8">
            <ErrorState
              message="Couldn't load compliance data. Backend may be offline."
              onRetry={load}
            />
          </div>
        ) : (
          <>
            {/* Top row: score ring + KPI cards */}
            <div className="mt-8 grid gap-5 lg:grid-cols-4">
              {/* Big compliance ring */}
              <Reveal className="lg:col-span-1">
                <div className="glass-glow flex flex-col items-center justify-center p-6 h-full">
                  <h2 className="display mb-4 text-center text-lg font-semibold">
                    Overall Score
                  </h2>
                  {loading || !audit ? (
                    <Skeleton className="h-36 w-36 rounded-full" />
                  ) : (
                    <ComplianceRing value={audit.overall_score} />
                  )}
                </div>
              </Reveal>

              {/* Per-standard score cards */}
              <Stagger className="lg:col-span-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {loading || !audit
                  ? [0, 1, 2, 3].map((i) => (
                      <StaggerItem key={i}>
                        <TiltCard className="p-5" intensity={6}>
                          <Skeleton className="h-6 w-16 mb-2" />
                          <Skeleton className="h-8 w-12" />
                        </TiltCard>
                      </StaggerItem>
                    ))
                  : audit.standards.map((s) => (
                      <StaggerItem key={s.standard}>
                        <TiltCard className="p-5" intensity={6}>
                          <p className="mb-1 text-xs text-muted font-mono">{s.standard}</p>
                          <p className={`display text-3xl font-semibold ${scoreColor(s.score)}`}>
                            <Counter to={s.score} suffix="%" />
                          </p>
                          <p className="mt-1 text-[10px] text-muted">
                            {s.gaps.length === 0
                              ? "✓ compliant"
                              : `${s.gaps.length} gap${s.gaps.length > 1 ? "s" : ""}`}
                          </p>
                        </TiltCard>
                      </StaggerItem>
                    ))}
              </Stagger>
            </div>

            {/* Standards accordion */}
            <Reveal delay={0.1}>
              <h2 className="display mb-4 mt-8 text-lg font-semibold">
                Standard-by-Standard Breakdown
              </h2>
              {loading || !audit ? (
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {audit.standards.map((s) => (
                    <StandardCard key={s.standard} s={s} />
                  ))}
                </div>
              )}
            </Reveal>

            {/* Quick compliance check */}
            <Reveal delay={0.15}>
              <div className="glass-glow mt-8 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-tealGlow" />
                  <h2 className="display text-lg font-semibold">
                    Quick Compliance Check
                  </h2>
                </div>
                <p className="mb-4 text-sm text-muted">
                  Paste any procedure text and the agent will immediately check
                  it against all indexed regulations.
                </p>

                <textarea
                  value={checkText}
                  onChange={(e) => setCheckText(e.target.value)}
                  placeholder="Paste a procedure or SOP snippet here…&#10;e.g. 'Atmospheric check to be performed prior to entry. Worker may enter once O2 level ≥ 19.5%...'"
                  rows={5}
                  className="w-full resize-none rounded-xl border border-border bg-base/70 px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-muted/60 focus:border-teal/60 transition-colors"
                />

                <div className="mt-3 flex justify-end">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={runQuickCheck}
                    disabled={!checkText.trim() || checking}
                    id="quick-check-btn"
                    className="btn-gold sheen flex items-center gap-2 disabled:opacity-40"
                  >
                    {checking ? (
                      <Loader2 className="relative z-10 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="relative z-10 h-4 w-4" />
                    )}
                    <span className="relative z-10">
                      {checking ? "Checking…" : "Check Compliance"}
                    </span>
                  </motion.button>
                </div>

                {/* Result */}
                <AnimatePresence>
                  {quickResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-4 rounded-xl border border-teal/20 bg-surface/80 p-5"
                    >
                      <p className="text-sm leading-relaxed">{quickResult.answer}</p>
                      {quickResult.confidence > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted">confidence</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${quickResult.confidence}%` }}
                              transition={{ duration: 1 }}
                              className="h-full rounded-full bg-gradient-to-r from-teal to-tealGlow"
                            />
                          </div>
                          <span className="font-mono text-[10px] text-tealGlow">
                            {quickResult.confidence}%
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>

            {/* Export Button */}
            <Reveal delay={0.2}>
              <div className="mt-6 flex justify-end">
                <button
                  id="export-audit-btn"
                  className="btn-ghost flex items-center gap-2"
                  onClick={() => {
                    const content = audit
                      ? `AETHON Compliance Audit\n\nOverall: ${audit.overall_score}%\n\n` +
                        audit.standards
                          .map(
                            (s) =>
                              `${s.standard}: ${s.score}%\n` +
                              (s.gaps.length
                                ? s.gaps.map((g) => `  - ${g.clause}: ${g.issue}`).join("\n")
                                : "  ✓ No gaps")
                          )
                          .join("\n\n")
                      : "No data";
                    const blob = new Blob([content], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "aethon_audit.txt";
                    a.click();
                  }}
                >
                  <FileText className="h-4 w-4" />
                  Export Audit Package
                </button>
              </div>
            </Reveal>
          </>
        )}
      </PageContainer>
    </div>
  );
}

// ── Compliance Ring component ─────────────────────────────────────────────
function ComplianceRing({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-36 w-36">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#13413c" strokeWidth="8" />
        <motion.circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke="url(#ring2)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c - (c * value) / 100 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="ring2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1fb8a6" />
            <stop offset="100%" stopColor="#f4d488" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="display text-3xl font-semibold text-gradient-teal">
          <Counter to={value} suffix="%" />
        </span>
        <span className="text-[10px] text-muted">audit-ready</span>
      </div>
    </div>
  );
}
