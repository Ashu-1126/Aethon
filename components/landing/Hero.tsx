"use client";
import { motion } from "framer-motion";
import { FileText, GitBranch, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { MagneticButton } from "@/components/motion/MagneticButton";
import Link from "next/link";

const word = {
  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: 0.3 + i * 0.08, duration: 0.7, ease: [0.21, 0.5, 0.27, 0.99] },
  }),
};

const line1 = ["The", "Operations", "Brain"];
const line2 = ["Your", "Plant", "Forgot", "It", "Had."];

const floatCards = [
  { icon: FileText, label: "P&ID — Unit 4", glow: "teal", x: "-8%", y: "8%", d: 0 },
  { icon: ShieldCheck, label: "OISD-116 §7.2", glow: "gold", x: "78%", y: "2%", d: 0.4 },
  { icon: GitBranch, label: "RCA · Pump P-204", glow: "teal", x: "82%", y: "62%", d: 0.8 },
  { icon: Sparkles, label: "Near-miss #1187", glow: "gold", x: "-6%", y: "66%", d: 1.2 },
];

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-radial-teal px-6 pt-28">
      <div className="bg-radial-gold absolute inset-0" />

      {/* floating document chips */}
      {floatCards.map((c, i) => (
        <motion.div
          key={i}
          className="absolute hidden lg:block"
          style={{ left: c.x, top: c.y }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1 + i * 0.15, duration: 0.8 }}
        >
          <motion.div
            animate={{ y: [0, -16, 0] }}
            transition={{ duration: 6 + c.d, repeat: Infinity, ease: "easeInOut", delay: c.d }}
            className={`glass flex items-center gap-2 px-4 py-2.5 ${
              c.glow === "teal" ? "shadow-glow-teal" : "shadow-glow-gold"
            }`}
          >
            <c.icon
              className={`h-4 w-4 ${c.glow === "teal" ? "text-tealGlow" : "text-goldGlow"}`}
            />
            <span className="font-mono text-xs text-muted">{c.label}</span>
          </motion.div>
        </motion.div>
      ))}

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mb-6 flex justify-center"
        >
          <span className="chip">
            <span className="h-1.5 w-1.5 animate-pulseGlow rounded-full bg-tealGlow" />
            Industrial Knowledge Intelligence
          </span>
        </motion.div>

        <h1 className="display text-5xl font-semibold leading-[1.05] sm:text-6xl md:text-7xl">
          <span className="flex flex-wrap justify-center gap-x-4">
            {line1.map((w, i) => (
              <motion.span key={w} custom={i} variants={word} initial="hidden" animate="show">
                {w}
              </motion.span>
            ))}
          </span>
          <span className="mt-2 flex flex-wrap justify-center gap-x-4">
            {line2.map((w, i) => (
              <motion.span
                key={w}
                custom={i + line1.length}
                variants={word}
                initial="hidden"
                animate="show"
                className={w === "Forgot" ? "text-gradient-gold italic" : ""}
              >
                {w}
              </motion.span>
            ))}
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted"
        >
          Every drawing, manual, permit, inspection and incident report — fused into a
          single living knowledge graph. Ask it anything. Get a cited answer in seconds,
          not a 35-hour search.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.7 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link href="/copilot">
            <MagneticButton>
              Ask the Brain <ArrowRight className="h-4 w-4" />
            </MagneticButton>
          </Link>
          <Link href="/knowledge-graph" className="btn-ghost">
            Explore the Graph
          </Link>
        </motion.div>
      </div>

      {/* scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="flex h-9 w-5 items-start justify-center rounded-full border border-border p-1"
        >
          <span className="h-2 w-1 rounded-full bg-tealGlow" />
        </motion.div>
      </motion.div>
    </section>
  );
}
