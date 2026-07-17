"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Hexagon, ArrowRight } from "lucide-react";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { Reveal } from "@/components/motion/Reveal";
import EvolvingLogo from "@/components/landing/EvolvingLogo";
import Link from "next/link";
import { FloatingLines } from "@/components/motion/FloatingLines";

// pin the locale so server and client format identically (avoids a hydration
// mismatch: e.g. US "12,405,192" vs Indian "1,24,05,192")
const nf = new Intl.NumberFormat("en-US");

function LiveCounter() {
  const [count, setCount] = useState(12405192);
  useEffect(() => {
    const interval = setInterval(() => setCount((c) => c + Math.floor(Math.random() * 4) + 1), 2800);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="hidden sm:flex absolute right-6 top-6 items-center gap-2 rounded-full border border-teal/10 bg-teal/5 px-3 py-1.5 text-[10px] font-mono text-tealGlow shadow-[0_0_15px_rgba(54,233,210,0.1)] backdrop-blur-md">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tealGlow opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-tealGlow"></span>
      </span>
      Data Points Secured: {nf.format(count)}
    </div>
  );
}

export function CTA() {
  return (
    <section className="relative px-6 py-10 sm:py-16 overflow-hidden">
      <Reveal>
        <div className="relative mx-auto w-full max-w-7xl overflow-hidden py-8 px-4 text-center sm:py-14 sm:px-8 border border-white/5 rounded-[2.5rem] shadow-[0_0_40px_rgba(54,233,210,0.03)]">
          <LiveCounter />
          
          {/* animated conic glow & data streams */}
          <div className="aurora absolute inset-0 -z-10 opacity-40" />
          <div className="absolute inset-0 -z-10 opacity-30 mix-blend-overlay">
             <FloatingLines idPrefix="cta-streams" />
          </div>
          
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="absolute left-1/2 top-1/2 -z-10 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal/10"
          />
          
          {/* Pulsing radar behind logo */}
          <div className="absolute left-1/2 top-1/2 -z-10 h-32 w-32 -translate-x-1/2 -translate-y-24 animate-pulse rounded-full bg-gold/10 blur-xl" />

          {/* Ambient Floating Elements (Left) */}
          <motion.div
            animate={{ y: [0, -30, 0], opacity: [0.1, 0.4, 0.1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-8 top-1/4 hidden lg:flex flex-col gap-3 -z-10"
          >
            <div className="h-1 w-12 bg-tealGlow/40 rounded-full blur-[1px]" />
            <div className="h-1 w-8 bg-tealGlow/30 rounded-full blur-[1px]" />
            <div className="h-1 w-16 bg-tealGlow/20 rounded-full blur-[1px]" />
          </motion.div>
          <motion.div
            animate={{ y: [0, 40, 0], opacity: [0.05, 0.2, 0.05] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute left-16 bottom-1/4 hidden lg:block -z-10"
          >
            <div className="h-24 w-24 rounded-full bg-teal/20 blur-2xl" />
          </motion.div>

          {/* Ambient Floating Elements (Right) */}
          <motion.div
            animate={{ y: [0, 30, 0], opacity: [0.1, 0.5, 0.1] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute right-12 top-1/3 hidden lg:flex flex-col items-end gap-2 -z-10"
          >
            <div className="h-1.5 w-1.5 bg-goldGlow/50 rounded-full blur-[1px]" />
            <div className="h-1.5 w-1.5 bg-goldGlow/30 rounded-full blur-[1px]" />
            <div className="h-1.5 w-1.5 bg-goldGlow/20 rounded-full blur-[1px]" />
          </motion.div>
          <motion.div
            animate={{ y: [0, -20, 0], opacity: [0.05, 0.15, 0.05] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3 }}
            className="absolute right-24 bottom-1/3 hidden lg:block -z-10"
          >
            <div className="h-32 w-32 rounded-full bg-gold/10 blur-3xl" />
          </motion.div>

          <div className="mb-6 flex justify-center">
            <EvolvingLogo className="h-44 w-44 sm:h-52 sm:w-52" finalOpacity={0.95} />
          </div>
          <h2 className="display mx-auto max-w-2xl text-4xl font-semibold leading-tight md:text-5xl">
            The knowledge your plant{" "}
            <span className="text-gradient-gold italic">can&apos;t afford to lose.</span>
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
          
          {/* Risk Reversal Microcopy */}
          <p className="mt-4 text-[11px] text-muted/60">
            Deploy on-prem or in a secure private cloud. SOC2 Compliant.
          </p>

          {/* Guided Demo Alternative */}
          <div className="mt-5 text-sm text-muted">
            Prefer a guided tour? <a href="#" className="text-tealGlow hover:underline">Talk to an implementation engineer.</a>
          </div>

          {/* Trust Badges */}
          <div className="mt-12 flex flex-col items-center gap-3 border-t border-white/5 pt-6 sm:flex-row sm:justify-center">
            <span className="text-[10px] uppercase tracking-wider text-muted/50">Built for compliance with</span>
            <div className="flex gap-4 font-mono text-[11px] font-semibold text-muted/40">
              <span>ISO 9001</span>
              <span>OSHA</span>
              <span>OISD</span>
              <span>SOC 2</span>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="relative mt-16 border-t border-white/5 bg-base pt-16 pb-8 overflow-hidden z-10">
      {/* Background glow for footer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-tealGlow/20 to-transparent" />
      <div className="absolute -top-24 left-1/2 -z-10 h-48 w-full max-w-3xl -translate-x-1/2 rounded-full bg-teal/5 blur-3xl" />
      
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-4 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Hexagon className="h-6 w-6 text-tealGlow" strokeWidth={1.5} />
              <span className="display text-lg font-semibold text-text">AETHON</span>
            </div>
            <p className="text-sm text-muted/80 leading-relaxed mb-6">
              The unified operations brain for heavy industry. Capturing decades of engineering wisdom before it walks out the door.
            </p>
          </div>

          {/* Nav Columns */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-text mb-4">Platform</h3>
              <ul className="space-y-3 text-sm text-muted/80">
                <li><Link href="/copilot" className="hover:text-tealGlow transition-colors">Copilot</Link></li>
                <li><Link href="/knowledge-graph" className="hover:text-tealGlow transition-colors">Knowledge Graph</Link></li>
                <li><Link href="/compliance" className="hover:text-tealGlow transition-colors">Compliance Engine</Link></li>
                <li><Link href="/integrations" className="hover:text-tealGlow transition-colors">Integrations</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text mb-4">Solutions</h3>
              <ul className="space-y-3 text-sm text-muted/80">
                <li><Link href="/solutions" className="hover:text-tealGlow transition-colors">Refineries</Link></li>
                <li><Link href="/solutions" className="hover:text-tealGlow transition-colors">Manufacturing</Link></li>
                <li><Link href="/solutions" className="hover:text-tealGlow transition-colors">Energy & Utilities</Link></li>
                <li><Link href="/solutions" className="hover:text-tealGlow transition-colors">Health & Safety</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text mb-4">Company</h3>
              <ul className="space-y-3 text-sm text-muted/80">
                <li><Link href="/dashboard" className="hover:text-tealGlow transition-colors">Console</Link></li>
                <li><Link href="/rca" className="hover:text-tealGlow transition-colors">Maintenance & RCA</Link></li>
                <li><Link href="/security" className="hover:text-tealGlow transition-colors">Security (SOC2)</Link></li>
              </ul>
            </div>
          </div>

          {/* Contact Column */}
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-text mb-4">Contact Us</h3>
            <p className="text-xs text-muted/80 mb-4 leading-relaxed">
              For any queries, please reach out to us at:
              <br />
              <a href="mailto:ironlogic@zohomail.in" className="text-tealGlow hover:underline mt-2 inline-block">
                ironlogic@zohomail.in
              </a>
            </p>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted/60">
          <p>Preserving what would otherwise be lost. © 2026 Aethon Inc.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-text transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-text transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-text transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
