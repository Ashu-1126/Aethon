"use client";
import { motion } from "framer-motion";
import { Hexagon, ArrowRight } from "lucide-react";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { Reveal } from "@/components/motion/Reveal";
import Link from "next/link";

export function CTA() {
  return (
    <section className="relative px-6 py-28">
      <Reveal>
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-border bg-surface/60 p-14 text-center backdrop-blur-xl">
          {/* animated conic glow */}
          <div className="aurora absolute inset-0 -z-10 opacity-40" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute left-1/2 top-1/2 -z-10 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal/10"
          />
          <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-teal/30 bg-teal/10 text-tealGlow shadow-glow-teal">
            <Hexagon className="h-7 w-7" strokeWidth={1.5} />
          </span>
          <h2 className="display mx-auto max-w-2xl text-4xl font-semibold leading-tight md:text-5xl">
            The knowledge your plant{" "}
            <span className="text-gradient-gold italic">can't afford to lose.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-muted">
            25% of senior engineers retire this decade — taking decades of operational
            wisdom with them. AETHON captures it, structures it, and keeps it working.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/dashboard">
              <MagneticButton>
                Enter the Console <ArrowRight className="h-4 w-4" />
              </MagneticButton>
            </Link>
            <Link href="/copilot" className="btn-ghost">
              Try the Copilot
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="relative border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-muted sm:flex-row">
        <div className="flex items-center gap-2">
          <Hexagon className="h-5 w-5 text-tealGlow" strokeWidth={1.5} />
          <span className="display font-semibold text-text">AETHON</span>
          <span className="ml-2 text-xs">Unified Asset & Operations Brain</span>
        </div>
        <p className="font-mono text-xs">
          Preserving what would otherwise be lost. © 2026
        </p>
      </div>
    </footer>
  );
}
