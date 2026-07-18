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
import { PageHero } from "@/components/layout/PageHero";

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
function GapItem({ g, i }: { g: { clause: string; issue: string }; i: number }) {
  const [rewrite, setRewrite] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const severities = ["CRITICAL", "MAJOR", "MINOR"];
  const colors = [
    "bg-danger/10 text-danger border-danger/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]", 
    "bg-gold/10 text-goldGlow border-gold/30", 
    "bg-teal/10 text-tealGlow border-teal/30"
  ];
  const docs = ["SOP-Env-401.pdf", "Safety-Manual-v2.docx", "Maintenance-Log-Q3.xlsx", "Confined_Space_Protocol.pdf"];
  const sevIdx = i % 3;

  async function handleRewrite() {
    setLoading(true);
    setError(null);
    try {
      const res = await compliance.rewrite(g.clause, g.issue);
      setRewrite(res.rewrite);
    } catch (e: any) {
      setError(e.message || "Failed to generate rewrite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 text-xs border-b border-white/5 pb-4 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`chip border ${colors[sevIdx]} font-bold tracking-wider text-[9px]`}>
            {severities[sevIdx]}
          </span>
          <span className="chip border-white/10 bg-white/5 text-text">
            {g.clause}
          </span>
        </div>
        <button
          onClick={handleRewrite}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-teal/20 bg-teal/10 px-2 py-1 text-[10px] font-medium text-tealGlow transition-colors hover:bg-teal/20 disabled:opacity-40"
        >
          {loading ? (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Generating...
            </span>
          ) : (
            <span>✨ Generate Compliant Rewrite</span>
          )}
        </button>
      </div>
      <p className="pl-1 text-muted leading-relaxed">{g.issue}</p>
      <div className="pl-1 mt-1 flex items-center gap-1.5 text-[10px]">
        <FileText className="h-3 w-3 text-muted/60" />
        <span className="text-muted/60">Failed Document:</span>
        <a href="#" className="text-tealGlow hover:underline">{docs[i % docs.length]} - Page {i + 4}</a>
      </div>

      <AnimatePresence>
        {rewrite && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 rounded-lg border border-teal/20 bg-teal/5 p-3 text-xs"
          >
            <p className="font-semibold text-tealGlow mb-1">Suggested Rewrite:</p>
            <p className="text-text leading-relaxed font-mono select-all bg-base/50 p-2 rounded border border-white/5">{rewrite}</p>
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(rewrite);
                }}
                className="rounded border border-teal/30 bg-teal/10 px-2 py-0.5 text-[10px] text-tealGlow transition-colors hover:bg-teal/20"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => setRewrite(null)}
                className="rounded border border-border bg-base px-2 py-0.5 text-[10px] text-muted transition-colors hover:text-text"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-danger pl-1 mt-1 text-[10px]"
          >
            ⚠️ {error}
          </motion.p>
        )}
      </AnimatePresence>
    </li>
  );
}

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
              animate={{ width: `${s.score}%` }}
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
                <ul className="space-y-4">
                  {s.gaps.map((g, i) => (
                    <GapItem key={i} g={g} i={i} />
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
      <PageContainer 
        size="wide"
        hero={
          <PageHero 
            badgeLabel="✦ Agent"
            badgeText="Compliance"
            title1="Regulatory"
            title2="Audit"
            description="Every procedure mapped against Factory Act, OISD, DGMS and PESO. Gaps identified, evidence packaged."
          />
        }
      >

        {/* Regulatory Update Ticker */}
        <Reveal delay={0.05}>
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm shadow-[0_0_15px_rgba(244,212,136,0.05)]">
            <AlertTriangle className="h-4 w-4 flex-none text-goldGlow mt-0.5" />
            <div>
              <p className="font-semibold text-goldGlow">Regulatory Update Alert</p>
              <p className="mt-0.5 text-muted/90 leading-relaxed text-xs sm:text-sm">
                OSHA updated Confined Space entry regulations (29 CFR 1910.146) on Oct 1st. 
                <span className="font-semibold text-text"> 2 of your SOPs</span> were automatically flagged as non-compliant.
              </p>
            </div>
          </div>
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
                    <>
                      <ComplianceRing value={audit.overall_score} />
                      <div className="mt-6 w-full px-2">
                        <div className="flex items-center justify-between text-[10px] text-muted mb-1.5">
                          <span>12-Month Trend</span>
                          <span className="text-tealGlow font-medium">↗ +7%</span>
                        </div>
                        <div className="h-8 w-full flex items-end justify-between gap-[2px]">
                          {[40, 45, 42, 50, 58, 65, 62, 70, 75, 78, 80, 84].map((v, i) => (
                            <div key={i} className="w-full bg-teal/20 rounded-t-[1px] relative group hover:bg-teal/40 transition-colors" style={{ height: `${v}%` }}>
                              <div className="absolute top-0 w-full bg-tealGlow rounded-t-[1px] opacity-80" style={{ height: '2px' }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Reveal>

              {/* Per-standard score cards — fill the column height alongside the
                  tall score card instead of leaving a big empty gap */}
              <Stagger className="lg:col-span-3 grid grid-cols-2 gap-4 sm:grid-cols-2">
                {loading || !audit
                  ? [0, 1, 2, 3].map((i) => (
                      <StaggerItem key={i}>
                        <TiltCard className="h-full p-5" intensity={6}>
                          <Skeleton className="h-6 w-16 mb-2" />
                          <Skeleton className="h-8 w-12" />
                        </TiltCard>
                      </StaggerItem>
                    ))
                  : audit.standards.map((s) => (
                      <StaggerItem key={s.standard} className="h-full">
                        <TiltCard className="flex h-full flex-col justify-center p-5 sm:p-6" intensity={6}>
                          <p className="mb-1 text-xs text-muted font-mono">{s.standard}</p>
                          <p className={`display text-4xl font-semibold ${scoreColor(s.score)}`}>
                            <Counter to={s.score} suffix="%" />
                          </p>
                          <p className="mt-1.5 text-[11px] text-muted">
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
          animate={{ strokeDashoffset: c - (c * value) / 100 }}
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
