"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { GitCompareArrows, AlertTriangle, FileText, Loader2, CheckCircle2, Wand2, ShieldCheck } from "lucide-react";
import { conflicts, compliance } from "@/lib/api";
import { ApiError } from "@/lib/api";
import type { Conflict } from "@/lib/types";
import { PageHero } from "@/components/layout/PageHero";

type CardState = { loading: boolean; rewrite: string | null; error: string | null };

function ConflictCard({ c, index }: { c: Conflict; index: number }) {
  const [st, setSt] = useState<CardState>({ loading: false, rewrite: null, error: null });

  async function handleResolve() {
    if (st.loading || st.rewrite) return;
    setSt({ loading: true, rewrite: null, error: null });
    try {
      const clause = `${c.field}: "${c.value_a}" (${c.doc_a}) vs "${c.value_b}" (${c.doc_b})`;
      const issue = `Contradiction on "${c.field}". One document states "${c.value_a}" and the other "${c.value_b}". Provide a single authoritative compliant resolution.`;
      const res = await compliance.rewrite(clause, issue);
      setSt({ loading: false, rewrite: res.rewrite, error: null });
    } catch (e) {
      setSt({ loading: false, rewrite: null, error: e instanceof Error ? e.message : "AI resolution failed." });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06 }}
      className="glass-glow p-6 space-y-4"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 flex-none text-goldGlow" />
            <span className="font-mono text-danger">{c.value_a}</span>
            <span className="text-muted">vs</span>
            <span className="font-mono text-danger">{c.value_b}</span>
          </p>
          <p className="font-mono text-xs text-muted">
            Discrepancy Field: <span className="text-text font-bold">{c.field}</span>
          </p>
          <p className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted pt-1">
            <FileText className="h-3.5 w-3.5 text-tealGlow" />
            <span className="text-text font-semibold">{c.doc_a}</span>
            <span className="text-goldGlow font-bold">↔</span>
            <span className="text-text font-semibold">{c.doc_b}</span>
          </p>
        </div>

        <button
          onClick={handleResolve}
          disabled={st.loading || !!st.rewrite}
          className={[
            "flex flex-none items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-200",
            st.rewrite
              ? "border-tealGlow/40 bg-tealGlow/10 text-tealGlow cursor-default"
              : st.loading
              ? "border-gold/30 bg-gold/10 text-goldGlow cursor-wait"
              : "border-teal/30 bg-teal/10 text-tealGlow hover:bg-teal/20 hover:border-teal/60 cursor-pointer",
          ].join(" ")}
        >
          {st.loading ? (<><Loader2 className="h-3 w-3 animate-spin" />Resolving…</>) :
           st.rewrite  ? (<><CheckCircle2 className="h-3 w-3" />Resolved</>) :
                         (<><Wand2 className="h-3 w-3" />Resolve Conflict</>)}
        </button>
      </div>

      {/* Recommended Unified Compliance Directive */}
      {c.recommended_unified_compliance && (
        <div className="p-4 rounded-xl border border-teal/30 bg-teal/5 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-tealGlow flex items-center gap-1.5 font-mono">
            <ShieldCheck className="h-3.5 w-3.5 text-tealGlow" /> Recommended Unified Compliance Directive
          </span>
          <p className="text-xs text-text/90 leading-relaxed font-medium">
            {c.recommended_unified_compliance}
          </p>
        </div>
      )}

      <AnimatePresence>
        {st.error && (
          <motion.p key="err" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 flex items-center gap-2 text-xs text-danger">
            <AlertTriangle className="h-3 w-3 flex-none" />{st.error}
          </motion.p>
        )}
        {st.rewrite && (
          <motion.div key="res" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35 }} className="mt-4 overflow-hidden">
            <div className="rounded-xl border border-teal/20 bg-teal/5 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-tealGlow">
                <CheckCircle2 className="h-3 w-3" />AI Resolution Directive
              </p>
              <p className="text-sm leading-relaxed text-text/90">{st.rewrite}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ConflictsPage() {
  const [items, setItems] = useState<Conflict[] | null>(null);
  const [error, setError] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      setItems(await conflicts.list());
    } catch (e) {
      if (e instanceof ApiError && e.status === 503) {
        setItems([]);
      } else {
        setError(true);
        setItems(null);
      }
    }
  }, []);

  async function handleRescan() {
    setRescanning(true);
    setScanMsg(null);
    try {
      const res = await conflicts.rescan();
      setItems(res.conflicts);
      setScanMsg(res.message);
    } finally {
      setRescanning(false);
    }

  }

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <PageContainer
        size="wide"
        hero={
          <PageHero
            badgeLabel="❖ Conflicts"
            badgeText="Document Discrepancies"
            title1="Contradictions,"
            title2="caught early."
            description="AETHON surfaces disagreements across Internal SOPs, ISO standards, OSHA regulations, Factory Act, and Company Policies — recommending a unified compliance directive."
          />
        }
      >
        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {items !== null && (
              <span className="chip border border-white/10 bg-white/5 text-muted text-xs font-mono">
                {items.length} contradiction{items.length !== 1 ? "s" : ""} detected
              </span>
            )}
            {scanMsg && (
              <span className="text-[11px] text-tealGlow/70">{scanMsg}</span>
            )}
          </div>
          <button
            onClick={handleRescan}
            disabled={rescanning}
            className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3.5 py-2 text-xs font-semibold text-goldGlow transition-all hover:bg-gold/20 disabled:opacity-40"
          >
            {rescanning ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" />Cross-Auditing Regulations…</>
            ) : (
              <><GitCompareArrows className="h-3.5 w-3.5" />Re-scan & Cross-Audit</>
            )}
          </button>
        </div>

        {error ? (
          <div className="mt-8">
            <ErrorState message="Couldn't load conflicts. The backend may be offline." onRetry={load} />
          </div>
        ) : items === null ? (
          <div className="mt-8 space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8">
            <EmptyState icon={GitCompareArrows} title="No conflicts detected" message="Click 'Re-scan & Cross-Audit' to run AI conflict detection across your indexed documents." />
          </div>
        ) : (
          <Stagger className="mt-8 space-y-4">
            {items.map((c, i) => (
              <StaggerItem key={i}>
                <ConflictCard c={c} index={i} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </PageContainer>
    </div>
  );
}
