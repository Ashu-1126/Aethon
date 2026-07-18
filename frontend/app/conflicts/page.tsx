"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { GitCompareArrows, AlertTriangle, FileText } from "lucide-react";
import { conflicts } from "@/lib/api";
import { ApiError } from "@/lib/api";
import type { Conflict } from "@/lib/types";
import { PageHero } from "@/components/layout/PageHero";

export default function ConflictsPage() {
  const [items, setItems] = useState<Conflict[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      setItems(await conflicts.list());
    } catch (e) {
      // 503 (no docs indexed) is treated as "no conflicts yet", not a hard error
      if (e instanceof ApiError && e.status === 503) {
        setItems([]);
      } else {
        setError(true);
        setItems(null);
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <PageContainer
        size="wide"
        hero={
          <PageHero
            badgeLabel="✦ Conflicts"
            badgeText="Document Discrepancies"
            title1="Contradictions,"
            title2="caught early."
            description="AETHON surfaces disagreements across your corpus — a manual says 40 Nm, the SOP says 55 Nm — before they reach the shop floor."
          />
        }
      >
        {error ? (
          <div className="mt-8">
            <ErrorState
              message="Couldn't load conflicts. The backend may be offline."
              onRetry={load}
            />
          </div>
        ) : items === null ? (
          <div className="mt-8 space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={GitCompareArrows}
              title="No conflicts detected"
              message="Ingest more documents — AETHON flags contradictions as soon as two sources disagree."
            />
          </div>
        ) : (
          <Stagger className="mt-8 space-y-4">
            {items.map((c, i) => (
              <StaggerItem key={i}>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                  className="glass-glow p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 flex-none text-goldGlow" />
                        <span className="font-mono text-danger">{c.value_a}</span>
                        <span className="text-muted">vs</span>
                        <span className="font-mono text-danger">{c.value_b}</span>
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-muted">
                        field: <span className="text-text">{c.field}</span>
                      </p>
                      <p className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted">
                        <FileText className="h-3 w-3" />
                        {c.doc_a}
                        <span className="text-goldGlow">↔</span>
                        {c.doc_b}
                      </p>
                    </div>
                    <span className="flex-none rounded-full border border-teal/30 bg-teal/10 px-4 py-1.5 text-xs text-tealGlow">
                      Resolve
                    </span>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </PageContainer>
    </div>
  );
}
