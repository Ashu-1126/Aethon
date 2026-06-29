"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Send, FileText, Sparkles, Hexagon } from "lucide-react";

type Msg = {
  role: "user" | "ai";
  text: string;
  sources?: string[];
  confidence?: number;
};

const seed: Msg[] = [
  {
    role: "user",
    text: "What are the confined-space entry requirements, and does SOP-44 comply?",
  },
  {
    role: "ai",
    text: "Confined-space entry requires continuous atmospheric monitoring and a posted standby person. SOP-44 omits continuous monitoring (required by Factory Act §36(1)(b)) and conflicts with the standby-person rule in OISD-105 §9.4. Recommend revising SOP-44 before the next entry permit is issued.",
    sources: ["Factory_Act_1948.pdf · p.42", "OISD-105.pdf · p.18", "SOP-44.docx"],
    confidence: 94,
  },
];

const suggestions = [
  "Why did Pump P-204 fail three times?",
  "Which procedures violate OISD-116?",
  "Summarise the last 3 near-miss reports",
];

export default function Copilot() {
  const [msgs, setMsgs] = useState<Msg[]>(seed);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  function ask(q: string) {
    if (!q.trim()) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setMsgs((m) => [
        ...m,
        {
          role: "ai",
          text: "Cross-referencing the corpus — bearing failures on P-204 correlate with a lubrication-interval deviation logged in 3 separate work orders. Root cause: maintenance procedure MP-12 specifies a 90-day interval, but the OEM manual mandates 60 days.",
          sources: ["WorkOrder_log.xlsx", "OEM_Pump_Manual.pdf · p.7", "MP-12.docx"],
          confidence: 89,
        },
      ]);
    }, 1600);
  }

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <main className="flex min-h-screen flex-col md:ml-60">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10">
          <div className="mb-6">
            <p className="font-mono text-xs uppercase tracking-widest text-tealGlow">
              Expert Copilot
            </p>
            <h1 className="display mt-1 text-3xl font-semibold">Ask the Brain</h1>
          </div>

          <div className="flex-1 space-y-5">
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
                    <span className="mr-3 mt-1 flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-teal/30 bg-teal/10 text-tealGlow">
                      <Hexagon className="h-4 w-4" strokeWidth={1.5} />
                    </span>
                  )}
                  <div
                    className={`max-w-lg ${
                      m.role === "user"
                        ? "glass bg-surface2/70 px-4 py-3 text-sm"
                        : "glass-glow border-teal/20 p-4 text-sm leading-relaxed"
                    }`}
                  >
                    <p>{m.text}</p>
                    {m.sources && (
                      <>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {m.sources.map((s) => (
                            <span key={s} className="chip">
                              <FileText className="h-3 w-3" /> {s}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="font-mono text-[10px] text-muted">confidence</span>
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
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {thinking && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
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
          </div>

          {/* suggestions */}
          <div className="mb-3 mt-6 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-all hover:border-teal/40 hover:text-tealGlow"
              >
                {s}
              </button>
            ))}
          </div>

          {/* input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="glass flex items-center gap-2 p-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask across every document your plant has ever produced…"
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              type="submit"
              className="btn-gold sheen !p-3"
            >
              <Send className="relative z-10 h-4 w-4" />
            </motion.button>
          </form>
        </div>
      </main>
    </div>
  );
}
