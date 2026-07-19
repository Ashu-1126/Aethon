"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Send, FileText, Sparkles, Hexagon, AlertTriangle, Database, Cpu, ArrowRight } from "lucide-react";
import { copilot, ApiError } from "@/lib/api";
import type { Source } from "@/lib/types";
import ReactMarkdown from "react-markdown";

type Msg = {
  role: "user" | "ai";
  text: string;
  sources?: Source[];
  confidence?: number;
  error?: boolean;
};

const suggestions = [
  "Why did Pump P-204 fail three times?",
  "Which procedures violate OISD-116?",
  "Does SOP-44 comply with confined-space entry law?",
];

/**
 * SparkUnderline — a half-width underline under the headline with a bright
 * "spark" that keeps sweeping along the teal→gold stroke.
 */
function SparkUnderline() {
  return (
    <svg
      className="mt-4 h-3 w-[45%] max-w-[340px]"
      viewBox="0 0 340 12"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="sparkLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#36e9d2" />
          <stop offset="100%" stopColor="#f4d488" />
        </linearGradient>
        <linearGradient id="sparkGlow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f4d488" stopOpacity="0" />
          <stop offset="50%" stopColor="#f4d488" stopOpacity="1" />
          <stop offset="100%" stopColor="#f4d488" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* base line */}
      <motion.path
        d="M2 8 H338"
        stroke="url(#sparkLine)"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.5, ease: "easeOut" }}
      />

      {/* travelling spark */}
      <motion.path
        d="M2 8 H338"
        stroke="url(#sparkGlow)"
        strokeWidth="3.5"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="0.18 0.82"
        initial={{ strokeDashoffset: 1 }}
        animate={{ strokeDashoffset: [1, -1] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        style={{ filter: "drop-shadow(0 0 6px rgba(244,212,136,0.9))" }}
      />
    </svg>
  );
}

/**
 * HeroBackground — the full ambient backdrop (teal wash, gold/teal flare,
 * centered AETHON watermark, laser streaks). Rendered ONCE behind the whole
 * page so the hero and the chat share one continuous surface.
 */
function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* deep teal base wash */}
      <div className="absolute inset-0 bg-radial-teal" />

      {/* Background light flare from right — teal core, gold halo */}
      <div
        className="absolute right-0 top-[35%] -translate-y-1/2 w-[80vw] h-[150vh] opacity-60 mix-blend-screen"
        style={{
          background:
            'radial-gradient(ellipse at right center, rgba(54, 233, 210, 0.28) 0%, rgba(217, 177, 94, 0.12) 38%, transparent 72%)',
        }}
      />
      <div
        className="absolute right-0 top-[35%] -translate-y-1/2 w-[50vw] h-[100vh] opacity-70 mix-blend-screen"
        style={{
          background:
            'radial-gradient(ellipse at right center, rgba(244, 212, 136, 0.55) 0%, rgba(54, 233, 210, 0.16) 28%, transparent 62%)',
        }}
      />

      {/* Giant Watermark — centered in the hero zone */}
      <div className="absolute top-[35vh] left-1/2 -translate-x-1/2 -translate-y-1/2 text-[22vw] font-black tracking-tighter text-tealGlow/[0.03]">
        AETHON
      </div>

      {/* Laser lines — teal→gold gradient, span the full page height */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.4 }}>
        <defs>
          <linearGradient id="laserGrad" x1="1" y1="0.5" x2="0" y2="0.5">
            <stop offset="0%" stopColor="#36e9d2" stopOpacity="0.7" />
            <stop offset="55%" stopColor="#f4d488" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f4d488" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="100%" y1="6%" x2="20%" y2="0%" stroke="url(#laserGrad)" strokeWidth="0.5" />
        <line x1="100%" y1="18%" x2="0%" y2="12%" stroke="url(#laserGrad)" strokeWidth="1.5" />
        <line x1="100%" y1="30%" x2="30%" y2="60%" stroke="url(#laserGrad)" strokeWidth="0.5" />
        <line x1="100%" y1="46%" x2="50%" y2="82%" stroke="url(#laserGrad)" strokeWidth="0.5" />
        <line x1="100%" y1="70%" x2="0%" y2="94%" stroke="url(#laserGrad)" strokeWidth="1" />
        <line x1="90%" y1="0%" x2="60%" y2="100%" stroke="url(#laserGrad)" strokeWidth="0.5" />
      </svg>
    </div>
  );
}

function CopilotHero() {
  return (
    <div className="relative w-full min-h-[70vh] flex flex-col justify-start overflow-hidden">
      {/* Main Content Container */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-12 flex flex-col md:flex-row items-start pt-12 pb-10 sm:pt-16">

        {/* Left Side: Text and Input */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.21, 0.5, 0.27, 0.99] }}
          className="w-full md:w-[60%] flex flex-col items-start gap-4 sm:gap-6"
        >
          {/* Eyebrow */}
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-tealGlow">
            <Hexagon className="h-3.5 w-3.5" strokeWidth={1.6} />
            Expert Copilot · Ask the Brain
          </div>

          {/* Headline + sparkling half-underline */}
          <div className="relative">
            <h1 className="display text-[2.5rem] leading-[1.05] sm:text-6xl lg:text-[5.5rem] font-semibold tracking-tight">
              <span className="block text-text drop-shadow-md">Answers, Cited</span>
              <span className="block text-gradient-teal mt-2">
                From Your Data
              </span>
            </h1>
            <SparkUnderline />
          </div>

          {/* Subheadline */}
          <p className="text-[17px] text-muted max-w-lg leading-relaxed mt-2">
            Every P&amp;ID, manual, permit, and incident report — fused into one living
            knowledge graph. Ask anything and get an answer back in seconds, each claim
            traced to its exact source document and page.
          </p>

          {/* trust chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {["Exact citations", "Zero hallucination", "Audit-ready"].map((t) => (
              <span
                key={t}
                className="rounded-full border border-teal/25 bg-teal/5 px-3 py-1 font-mono text-[11px] text-tealGlow"
              >
                {t}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Right Side: reserved for flare */}
        <div className="hidden md:flex w-full md:w-[45%] h-[500px] relative items-center justify-center -mr-12" />
      </div>
    </div>
  )
}

export default function Copilot() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // auto-scroll to the newest message / thinking indicator
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, thinking]);

  // Load chat history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const history = await copilot.getHistory();
        if (history && history.length > 0) {
          const loadedMsgs: Msg[] = [];
          for (const h of history) {
            loadedMsgs.push({ role: "user", text: h.message });
            // Rehydrate AI message with original sources and confidence score
            loadedMsgs.push({
              role: "ai",
              text: h.response,
              sources: (h as any).sources ?? [],
              confidence: (h as any).confidence ?? 0
            });
          }
          setMsgs(loadedMsgs);
        }
      } catch {
        /* history loading is best-effort */
      }
    }
    loadHistory();
  }, []);

  async function ask(q: string) {
    if (!q.trim() || thinking) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setThinking(true);
    try {
      const res = await copilot.query(q);
      setMsgs((m) => [
        ...m,
        res.answer?.trim()
          ? {
              role: "ai",
              text: res.answer,
              sources: res.sources ?? [],
              confidence: res.confidence,
            }
          : {
              role: "ai",
              text: "No relevant information found in the corpus for that question. Try rephrasing, or ingest more documents.",
            },
      ]);
    } catch (e) {
      const msg =
        e instanceof ApiError && e.offline
          ? "Backend offline — couldn't reach the brain. Check the server is running."
          : e instanceof ApiError
            ? e.message
            : "Something went wrong answering that. Please try again.";
      setMsgs((m) => [...m, { role: "ai", text: msg, error: true }]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="min-h-screen bg-abyss">
      <AppSidebar />
      <main className="md:ml-60 flex flex-col min-h-screen relative bg-abyss pt-14 md:pt-0">

        {/* single ambient backdrop shared by the hero AND the chat below */}
        <HeroBackground />

        {/* NEW MASSIVE HERO SECTION */}
        <CopilotHero />

        {/* CHAT INTERFACE — sits on the same continuous backdrop */}
        <div className="relative flex flex-1 flex-col">
          <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 flex flex-1 flex-col">

          <div className="flex-1 space-y-5" aria-live="polite" aria-atomic="false">
            {msgs.length === 0 && !thinking && (
              <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
                <p className="text-sm text-muted/40">
                  Your chat history will appear here.
                </p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {msgs.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "ai" && (
                    <span
                      className={`mr-3 mt-1 flex h-8 w-8 flex-none items-center justify-center rounded-lg border ${
                        m.error
                          ? "border-danger/40 bg-danger/10 text-danger"
                          : "border-teal/30 bg-teal/10 text-tealGlow"
                      }`}
                    >
                      {m.error ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Hexagon className="h-4 w-4" strokeWidth={1.5} />
                      )}
                    </span>
                  )}
                  <div
                    className={`max-w-[78%] sm:max-w-lg ${
                      m.role === "user"
                        ? "glass bg-surface2/70 px-4 py-3 text-sm"
                        : m.error
                          ? "glass border-danger/30 bg-danger/5 p-4 text-sm leading-relaxed"
                          : "glass-glow border-teal/20 p-4 text-sm leading-relaxed"
                    }`}
                    aria-live={m.role === "ai" ? "polite" : undefined}
                  >
                    {m.role === "ai" ? (
                      <ReactMarkdown
                        components={{
                          p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                          ul: ({node, ...props}) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0" {...props} />,
                          ol: ({node, ...props}) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0" {...props} />,
                          li: ({node, ...props}) => <li className="pl-1" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-semibold text-white/90" {...props} />,
                        }}
                      >
                        {m.text}
                      </ReactMarkdown>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    )}
                    {m.sources && m.sources.length > 0 && (
                      <>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {m.sources.map((s, si) => (
                            <span
                              key={si}
                              title={s.snippet}
                              className="chip cursor-help"
                            >
                              <FileText className="h-3 w-3" /> {s.doc_name} · p.{s.page}
                            </span>
                          ))}
                        </div>
                        {typeof m.confidence === "number" && (
                          <div className="mt-3 flex items-center gap-2">
                            <span className="font-mono text-[10px] text-muted">
                              confidence
                            </span>
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-border">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${m.confidence}%` }}
                                transition={{ duration: 1, delay: 0.2 }}
                                className="h-full rounded-full bg-gradient-to-r from-teal to-tealGlow"
                              />
                            </div>
                            <span className="font-mono text-[10px] text-tealGlow">
                              {m.confidence}%
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {thinking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                role="status"
                aria-live="polite"
                className="flex items-center gap-3"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal/30 bg-teal/10 text-tealGlow">
                  <Sparkles className="h-4 w-4 animate-pulseGlow" />
                </span>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="h-2 w-2 rounded-full bg-tealGlow"
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                      transition={{ duration: 1, repeat: Infinity, delay: d * 0.15 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* scroll anchor — auto-scrolls into view on each new message */}
            <div ref={bottomRef} />
          </div>

          {/* suggestions */}
          <div className="mb-3 mt-6 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                 <button
                   key={s}
                   onClick={() => {
                     setInput(s);
                     ask(s);
                   }}
                   disabled={thinking}
                   className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-all hover:border-teal/40 hover:text-tealGlow disabled:opacity-40"
                 >
                   {s}
                 </button>
              ))}
            </div>
            {msgs.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm("Are you sure you want to clear your chat history?")) {
                    try {
                      await copilot.clearHistory();
                      setMsgs([]);
                    } catch {
                      alert("Failed to clear chat history");
                    }
                  }
                }}
                className="text-xs text-muted hover:text-danger px-3 py-1.5 rounded-full border border-transparent hover:border-danger/20 transition-all"
              >
                Clear History
              </button>
            )}
          </div>

          {/* lower chat input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="glass flex items-center gap-2 p-2"
          >
            <input
              id="chat-input"
              name="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask across every document your plant has ever produced…"
              aria-label="Ask the copilot a question"
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              type="submit"
              disabled={thinking}
              aria-label="Send question"
              className="btn-gold sheen !p-3 disabled:opacity-50"
            >
              <Send className="relative z-10 h-4 w-4" />
            </motion.button>
          </form>
          </div>
        </div>
      </main>
    </div>
  );
}
