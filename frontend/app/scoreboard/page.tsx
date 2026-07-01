"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { Counter } from "@/components/ui/Counter";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { Target, Quote, Timer, ListChecks } from "lucide-react";
import { scoreboard } from "@/lib/api";
import type { Scoreboard } from "@/lib/types";
import { PageHero } from "@/components/layout/PageHero";

export default function ScoreboardPage() {
  const [data, setData] = useState<Scoreboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setData(await scoreboard.get());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cards = data
    ? [
        { icon: Target, label: "Answer accuracy", value: data.answer_accuracy, suffix: "%", sub: "vs. expert-labelled answers" },
        { icon: Quote, label: "Citation precision", value: data.citation_precision, suffix: "%", sub: "sources actually support the claim" },
        { icon: Timer, label: "Avg. answer time", value: data.avg_answer_seconds, suffix: "s", sub: "retrieval + generation" },
        { icon: ListChecks, label: "Questions evaluated", value: data.questions_evaluated, suffix: "", sub: "benchmark size" },
      ]
    : [];

  // speed comparison: AETHON vs keyword-search baseline
  const aethon = data?.avg_answer_seconds ?? 0;
  const baseline = data?.keyword_baseline_seconds ?? 0;
  const speedup = baseline && aethon ? Math.round(baseline / aethon) : 0;

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <PageContainer 
        size="narrow"
        hero={
          <PageHero 
            badgeLabel="✦ Evidence"
            badgeText="Performance Metrics"
            title1="Measured,"
            title2="not claimed."
            description="AETHON is benchmarked against an expert-labelled question set — answer accuracy, citation precision, and speed versus a keyword-search baseline."
          />
        }
      >

          {error ? (
            <div className="mt-8">
              <ErrorState message="Couldn't load benchmark results." onRetry={load} />
            </div>
          ) : loading ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
                {cards.map((c) => (
                  <StaggerItem key={c.label}>
                    <TiltCard className="p-6" intensity={8}>
                      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-teal/30 bg-teal/10 text-tealGlow">
                        <c.icon className="h-5 w-5" strokeWidth={1.6} />
                      </span>
                      <p className="display text-3xl font-semibold text-gradient-teal">
                        <Counter to={c.value} suffix={c.suffix} />
                      </p>
                      <p className="mt-1 text-xs font-medium">{c.label}</p>
                      <p className="mt-0.5 text-[11px] text-muted">{c.sub}</p>
                    </TiltCard>
                  </StaggerItem>
                ))}
              </Stagger>

              {/* speed comparison */}
              <Reveal delay={0.2}>
                <div className="glass-glow mt-6 p-5 sm:p-7">
                  <div className="mb-6 flex items-baseline justify-between">
                    <h2 className="display text-lg font-semibold">Time to a cited answer</h2>
                    {speedup > 0 && (
                      <span className="text-gradient-gold display text-2xl font-semibold">
                        {speedup}× faster
                      </span>
                    )}
                  </div>

                  {/* AETHON bar */}
                  <Bar
                    label="AETHON"
                    seconds={aethon}
                    max={baseline}
                    gradient="from-teal to-tealGlow"
                    accent="text-tealGlow"
                  />
                  {/* baseline bar */}
                  <Bar
                    label="Keyword search (manual)"
                    seconds={baseline}
                    max={baseline}
                    gradient="from-muted/40 to-muted/60"
                    accent="text-muted"
                  />
                </div>
              </Reveal>
            </>
          )}
      </PageContainer>
    </div>
  );
}

function Bar({
  label,
  seconds,
  max,
  gradient,
  accent,
}: {
  label: string;
  seconds: number;
  max: number;
  gradient: string;
  accent: string;
}) {
  const pct = max ? Math.max(2, (seconds / max) * 100) : 0;
  const display =
    seconds >= 60 ? `${Math.round(seconds / 60)} min` : `${seconds.toFixed(1)} s`;
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className={`font-mono ${accent}`}>{display}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-border">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
        />
      </div>
    </div>
  );
}
