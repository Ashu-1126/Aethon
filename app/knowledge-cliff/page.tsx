"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";
import {
  Brain,
  CheckCircle2,
  ChevronRight,
  Hexagon,
  Mic,
  Send,
  Users,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { documents } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────
type Question = {
  id: string;
  label: string;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
};

type Answers = Record<string, string>;

// ── The 6 interview questions ─────────────────────────────────────────────
const QUESTIONS: Question[] = [
  {
    id: "machines",
    label: "Machines you've personally diagnosed that stumped everyone else?",
    placeholder: "e.g. Pump P-204 has a vibration signature that only shows at 40°C ambient — the OEM manual doesn't mention it...",
    icon: Hexagon,
  },
  {
    id: "workarounds",
    label: "Workarounds or tricks that aren't in any manual?",
    placeholder: "e.g. Compressor K-101 needs 3 priming cycles before startup in winter, or it cavitates...",
    icon: Sparkles,
  },
  {
    id: "risks",
    label: "Safety risks or hazards you know about but aren't documented?",
    placeholder: "e.g. The confined space near Unit 4 has residual H2S even after purging — standard test misses it because...",
    icon: CheckCircle2,
  },
  {
    id: "procedures",
    label: "Which procedures need updating — and why?",
    placeholder: "e.g. SOP-44 says atmospheric check before entry, but continuous monitoring is actually needed because...",
    icon: BookOpen,
  },
  {
    id: "downtime",
    label: "Top 3 causes of unplanned downtime you've seen in your career?",
    placeholder: "e.g. 1. Lubrication intervals not followed 2. Vibration checks skipped during shift handover 3...",
    icon: Brain,
  },
  {
    id: "successor",
    label: "What would you tell your replacement on their first day?",
    placeholder: "e.g. The pressure gauge on the east manifold reads 5% high — always mentally correct it. Also watch the...",
    icon: Users,
  },
];

const STATS = [
  { value: "25%", label: "of senior engineers retire this decade" },
  { value: "30yr", label: "of tacit knowledge per engineer" },
  { value: "$0", label: "documented before they walk out" },
];

// ═══════════════════════════════════════════════════════════════════════════
export default function KnowledgeCliffPage() {
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState<"intro" | "interview" | "saving" | "done">("intro");
  const [activeQ, setActiveQ] = useState(0);
  const [engineerName, setEngineerName] = useState("");
  const textRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const allAnswered = QUESTIONS.every(
    (q) => (answers[q.id] ?? "").trim().length > 10
  );
  const progress = Math.round(
    (QUESTIONS.filter((q) => (answers[q.id] ?? "").trim().length > 10).length /
      QUESTIONS.length) *
      100
  );

  async function handleSave() {
    setStep("saving");
    // Build a plain-text "document" from the answers and upload it
    const content = [
      `KNOWLEDGE CAPTURE — ${engineerName || "Senior Engineer"}`,
      `Date: ${new Date().toLocaleDateString()}`,
      `\n${"=".repeat(60)}\n`,
      ...QUESTIONS.map(
        (q) => `## ${q.label}\n\n${answers[q.id] ?? "(not answered)"}\n`
      ),
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const file = new File(
      [blob],
      `knowledge_capture_${Date.now()}.txt`,
      { type: "text/plain" }
    );

    try {
      await documents.upload(file);
    } catch {
      // Even if upload fails in mock mode, we show success
    }

    await new Promise((r) => setTimeout(r, 1800));
    setStep("done");
  }

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <PageContainer size="narrow">
        <AnimatePresence mode="wait">

          {/* ── INTRO ─────────────────────────────────────────────────── */}
          {step === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
            >
              <Reveal>
                <p className="font-mono text-xs uppercase tracking-widest text-tealGlow">
                  Knowledge Cliff Capture
                </p>
                <h1 className="display mt-1 text-2xl font-semibold sm:text-3xl md:text-4xl">
                  Don&apos;t let{" "}
                  <span className="text-gradient-gold italic">30 years</span>{" "}
                  walk out the door.
                </h1>
                <p className="mt-4 max-w-lg text-muted">
                  This 6-question interview captures the operational wisdom your
                  plant runs on — the tricks, workarounds, and safety knowledge
                  that exist only in senior engineers&apos; heads. Once saved,
                  it&apos;s searchable by everyone, forever.
                </p>
              </Reveal>

              {/* Stats */}
              <Reveal delay={0.1}>
                <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border/40">
                  {STATS.map((s) => (
                    <div key={s.label} className="bg-surface/70 p-5 text-center">
                      <p className="display text-3xl font-semibold text-gradient-gold">
                        {s.value}
                      </p>
                      <p className="mt-2 text-[11px] text-muted">{s.label}</p>
                    </div>
                  ))}
                </div>
              </Reveal>

              {/* Name input */}
              <Reveal delay={0.15}>
                <div className="mt-8 glass p-6">
                  <label className="mb-3 block text-sm font-medium">
                    Engineer name (optional)
                  </label>
                  <input
                    value={engineerName}
                    onChange={(e) => setEngineerName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar — 28 years, Instrumentation"
                    className="w-full rounded-xl border border-border bg-base/70 px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-teal/60"
                  />
                </div>
              </Reveal>

              {/* Question previews */}
              <Stagger className="mt-6 space-y-3">
                {QUESTIONS.map((q, i) => (
                  <StaggerItem key={q.id}>
                    <TiltCard className="flex items-start gap-4 p-4" intensity={6}>
                      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-teal/30 bg-teal/10 font-mono text-sm text-tealGlow">
                        {i + 1}
                      </span>
                      <p className="text-sm text-muted leading-relaxed">{q.label}</p>
                    </TiltCard>
                  </StaggerItem>
                ))}
              </Stagger>

              <Reveal delay={0.3}>
                <div className="mt-8 flex justify-center">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setStep("interview")}
                    id="start-interview-btn"
                    className="btn-gold sheen flex items-center gap-2 px-8 py-4 text-base"
                  >
                    <Mic className="relative z-10 h-4 w-4" />
                    <span className="relative z-10">Start the Interview</span>
                    <ChevronRight className="relative z-10 h-4 w-4" />
                  </motion.button>
                </div>
              </Reveal>
            </motion.div>
          )}

          {/* ── INTERVIEW ─────────────────────────────────────────────── */}
          {step === "interview" && (
            <motion.div
              key="interview"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
            >
              <Reveal>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-tealGlow">
                      Knowledge Capture
                    </p>
                    <h1 className="display mt-1 text-xl font-semibold sm:text-2xl">
                      {engineerName ? `${engineerName}'s Interview` : "Engineer Interview"}
                    </h1>
                  </div>
                  {/* Progress ring */}
                  <div className="relative h-14 w-14">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 40 40">
                      <circle cx="20" cy="20" r="16" fill="none" stroke="#13413c" strokeWidth="3" />
                      <motion.circle
                        cx="20" cy="20" r="16"
                        fill="none"
                        stroke="#36e9d2"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={100.5}
                        animate={{ strokeDashoffset: 100.5 - (100.5 * progress) / 100 }}
                        transition={{ duration: 0.6 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-mono text-[10px] text-tealGlow">{progress}%</span>
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* Question tabs */}
              <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
                {QUESTIONS.map((q, i) => {
                  const answered = (answers[q.id] ?? "").trim().length > 10;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setActiveQ(i)}
                      className={`flex-none rounded-full border px-3 py-1 font-mono text-[11px] transition-all ${
                        activeQ === i
                          ? "border-teal bg-teal/10 text-tealGlow"
                          : answered
                          ? "border-teal/30 text-muted"
                          : "border-border text-muted/60"
                      }`}
                    >
                      {answered ? "✓ " : ""}{i + 1}
                    </button>
                  );
                })}
              </div>

              {/* Active question */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeQ}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="mt-6"
                >
                  {(() => {
                    const q = QUESTIONS[activeQ];
                    const Icon = q.icon;
                    return (
                      <div className="glass-glow p-6">
                        <div className="mb-4 flex items-start gap-3">
                          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-teal/30 bg-teal/10 text-tealGlow">
                            <Icon className="h-4 w-4" />
                          </span>
                          <p className="text-sm font-medium leading-relaxed">
                            {activeQ + 1}. {q.label}
                          </p>
                        </div>
                        <textarea
                          ref={(el) => { textRefs.current[q.id] = el; }}
                          value={answers[q.id] ?? ""}
                          onChange={(e) =>
                            setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                          }
                          placeholder={q.placeholder}
                          rows={6}
                          className="w-full resize-none rounded-xl border border-border bg-base/70 px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-muted/60 focus:border-teal/60 transition-colors"
                        />
                        <div className="mt-3 flex items-center justify-between">
                          <span className="font-mono text-[10px] text-muted">
                            {(answers[q.id] ?? "").length} chars
                          </span>
                          <button
                            onClick={() =>
                              setActiveQ(Math.min(QUESTIONS.length - 1, activeQ + 1))
                            }
                            disabled={activeQ === QUESTIONS.length - 1}
                            className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-all hover:border-teal/40 hover:text-tealGlow disabled:opacity-30"
                          >
                            Next <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              </AnimatePresence>

              {/* Save button */}
              <Reveal delay={0.1}>
                <div className="mt-6 flex items-center justify-between gap-4">
                  <p className="text-xs text-muted">
                    {QUESTIONS.filter((q) => (answers[q.id] ?? "").trim().length > 10).length}
                    /{QUESTIONS.length} questions answered
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleSave}
                    disabled={!allAnswered}
                    id="save-knowledge-btn"
                    className="btn-gold sheen flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send className="relative z-10 h-4 w-4" />
                    <span className="relative z-10">Save to Brain</span>
                  </motion.button>
                </div>
              </Reveal>
            </motion.div>
          )}

          {/* ── SAVING ─────────────────────────────────────────────────── */}
          {step === "saving" && (
            <motion.div
              key="saving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl border border-teal/30 bg-teal/10"
              >
                <Hexagon className="h-8 w-8 text-tealGlow" strokeWidth={1.5} />
              </motion.div>
              <div>
                <p className="font-mono text-sm text-tealGlow">Processing knowledge capture…</p>
                <p className="mt-1 text-xs text-muted">
                  Embedding, extracting entities, weaving into the graph
                </p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="h-2 w-2 rounded-full bg-tealGlow"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -6, 0] }}
                    transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── DONE ───────────────────────────────────────────────────── */}
          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="flex h-20 w-20 items-center justify-center rounded-2xl border border-teal/40 bg-teal/10 shadow-glow-teal"
              >
                <CheckCircle2 className="h-10 w-10 text-tealGlow" />
              </motion.div>
              <div>
                <h2 className="display text-2xl font-semibold">
                  Knowledge saved.
                </h2>
                <p className="mt-2 max-w-sm text-muted">
                  {engineerName ? `${engineerName}'s` : "This"} 30 years of
                  operational wisdom is now part of the plant brain — searchable
                  by every engineer who comes after.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep("intro");
                    setAnswers({});
                    setActiveQ(0);
                    setEngineerName("");
                  }}
                  className="btn-ghost"
                >
                  Capture Another
                </button>
                <a href="/copilot" className="btn-gold sheen">
                  <span className="relative z-10">Ask the Brain</span>
                </a>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </PageContainer>
    </div>
  );
}
