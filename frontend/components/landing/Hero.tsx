"use client";
import { motion } from "framer-motion";
import { FileText, GitBranch, ShieldCheck, Sparkles, ArrowRight, FileCheck2, Wrench } from "lucide-react";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { Counter } from "@/components/ui/Counter";
import dynamic from "next/dynamic";
import Link from "next/link";

// Canvas particle orb — client-only, lazy-loaded (no SSR, it's decorative).
const ParticleOrb = dynamic(() => import("@/components/landing/ParticleOrb"), {
  ssr: false,
});

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

// `side` anchors the chip to that edge so it never clips, regardless of width
const floatCards = [
  { icon: FileText, label: "P&ID · Unit-4", glow: "teal", side: "left", pos: "5%", y: "14%", d: 0 },
  { icon: ShieldCheck, label: "OISD-116 §7.2", glow: "gold", side: "right", pos: "5%", y: "9%", d: 0.4 },
  { icon: GitBranch, label: "RCA · Pump P-204", glow: "teal", side: "right", pos: "4%", y: "58%", d: 0.8 },
  { icon: Sparkles, label: "Near-miss #1187", glow: "gold", side: "left", pos: "4%", y: "62%", d: 1.2 },
  { icon: FileCheck2, label: "Permit PTW-5521", glow: "gold", side: "left", pos: "7%", y: "38%", d: 1.6 },
  { icon: Wrench, label: "WorkOrder #5521", glow: "teal", side: "right", pos: "7%", y: "33%", d: 2.0 },
] as const;

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-radial-teal px-6 pt-24 sm:pt-28">
      <div className="bg-radial-gold absolute inset-0" />

      {/* central particle orb (canvas, behind the headline) — scatters on scroll */}
      <ParticleOrb opacity={0.6} scrollReactive />

      {/* floating document chips */}
      {floatCards.map((c, i) => (
        <motion.div
          key={i}
          className="absolute hidden lg:block"
          style={{
            [c.side]: c.pos,
            top: c.y,
          }}
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
            <motion.span
              className="flex items-center justify-center"
              style={{ transformStyle: "preserve-3d", perspective: 300 }}
              animate={{ rotateY: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: c.d }}
            >
              <c.icon
                className={`h-4 w-4 ${c.glow === "teal" ? "text-tealGlow" : "text-goldGlow"}`}
              />
            </motion.span>
            <span className="font-mono text-xs text-muted">{c.label}</span>
          </motion.div>
        </motion.div>
      ))}

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        {/* legibility scrim so the headline reads over the orb's glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -z-[1] h-[120%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.55), rgba(0,0,0,0.25) 45%, transparent 70%)",
          }}
        />
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
          className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-muted sm:text-lg"
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

        {/* proof metrics */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.7 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-12"
        >
          {[
            { value: 91, suffix: "%", label: "answer accuracy" },
            { value: 94, suffix: "%", label: "citation precision" },
            { value: 200, suffix: "×", label: "faster than manual search" },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <p className="display text-2xl font-semibold text-gradient-teal sm:text-3xl">
                <Counter to={m.value} suffix={m.suffix} duration={0.9} delay={1.7} />
              </p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted">
                {m.label}
              </p>
            </div>
          ))}
        </motion.div>

        {/* regulatory coverage badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7, duration: 0.7 }}
          className="mt-9 flex flex-col items-center gap-3"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted/70">
            Grounded in real regulatory standards
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {["OISD", "Factory Act", "DGMS", "PESO"].map((r) => (
              <span
                key={r}
                className="rounded-full border border-border bg-surface/50 px-3 py-1 font-mono text-xs text-text/80 backdrop-blur"
              >
                {r}
              </span>
            ))}
          </div>
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
