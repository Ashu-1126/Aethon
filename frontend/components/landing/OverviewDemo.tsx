"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  FileText,
  ShieldCheck,
  Wrench,
  Share2,
  Database,
  ScanLine,
  Cpu,
} from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { ExpandableCard } from "@/components/ui/expandable-card";

/** overlapping "AI team" agent cards — top fully visible, rest peek below.
 *  Each has rich detail shown when the card is clicked/expanded. */
const AGENT_CARDS = [
  {
    name: "COMPLIANCEBOT",
    desc: "Maps live procedures against OISD, DGMS & Factory Act — flags gaps before audits.",
    icon: ShieldCheck,
    tags: ["OISD", "AUDIT", "PESO"],
    detail: (
      <>
        <h4>What it does</h4>
        <p>
          Continuously reads your live procedures and inspection records, then maps each
          clause against the statutory standards — OISD-116, OISD-105, DGMS circulars,
          Factory Act 1948 and PESO rules — flagging every deviation before an audit ever
          catches it.
        </p>
        <h4>How it helps</h4>
        <p>
          Instead of a manual audit scramble, ComplianceBot maintains a live compliance
          score per standard, surfaces the exact non-conforming clause, and auto-assembles
          a corrective-action evidence package ready for regulators.
        </p>
        <h4>Example</h4>
        <p>
          &ldquo;SOP-44 omits continuous atmospheric monitoring required by Factory Act
          §36(1)(b)&rdquo; — flagged with the source clause and the offending procedure line.
        </p>
      </>
    ),
  },
  {
    name: "RCA AGENT",
    desc: "Root-cause + predictive maintenance.",
    icon: Wrench,
    tags: ["RCA", "PREDICT"],
    detail: (
      <>
        <h4>What it does</h4>
        <p>
          Fuses work-order history, failure records, OEM manuals and live operating
          conditions to pinpoint the true root cause of recurring failures — and fires
          predictive maintenance triggers before the next unplanned shutdown.
        </p>
        <h4>Example</h4>
        <p>
          Recurring bearing failure on Pump P-204 traced to a 90-day lubrication interval
          where the OEM mandates 60 days — with the fix and the source documents cited.
        </p>
      </>
    ),
  },
  {
    name: "GRAPH AGENT",
    desc: "Links equipment ↔ procedure ↔ incident.",
    icon: Share2,
    tags: ["GRAPH"],
    detail: (
      <>
        <h4>What it does</h4>
        <p>
          Extracts entities from every ingested document and weaves them into a
          traversable knowledge graph — equipment, regulations, procedures and incidents,
          all connected. The relationships no single team could ever hold in their head.
        </p>
      </>
    ),
  },
  {
    name: "COPILOT",
    desc: "Cited answers across the corpus.",
    icon: FileText,
    tags: ["RAG"],
    detail: (
      <>
        <h4>What it does</h4>
        <p>
          Ask anything in plain language across the entire corpus. Every answer is grounded
          in real documents — with inline citations, a confidence score and a clickable
          source link. No hallucinations, only evidence.
        </p>
      </>
    ),
  },
];

const FLOW_ICONS = [
  { icon: FileText, color: "#36e9d2" },
  { icon: Database, color: "#f4d488" },
  { icon: ScanLine, color: "#36e9d2" },
  { icon: ShieldCheck, color: "#f4d488" },
  { icon: Cpu, color: "#36e9d2" },
];

const STATS = [
  { value: "100%", label: "Response rate" },
  { value: "120x", label: "ROI" },
  { value: "10x", label: "Cost reduction" },
];

export function OverviewDemo() {
  return (
    <section className="relative overflow-hidden px-6 py-20 sm:py-28">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-14 lg:grid lg:grid-cols-[1fr_1.2fr] lg:items-center lg:gap-8">
        {/* ── LEFT: content + overlapping cards ── */}
        <div className="relative z-10 order-1 w-full lg:order-none">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
              From documents to decisions
            </p>
            <h2 className="display mt-4 text-4xl font-semibold leading-[1.05] sm:text-5xl">
              An AI workforce.{" "}
              <span className="text-gradient-teal">Built for plant teams.</span>
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-muted">
              A team of specialised agents that read every drawing, manual and permit —
              then act on what they find, around the clock, with answers you can prove.
            </p>
            <Link href="/dashboard" className="btn-gold sheen mt-8 inline-flex">
              <span className="relative z-10 uppercase tracking-wider">Enter Console</span>
            </Link>
          </Reveal>

          {/* YOUR AI TEAM — stacked deck */}
          <Reveal delay={0.15}>
            <p className="mb-4 mt-12 font-mono text-xs uppercase tracking-[0.25em] text-tealGlow">
              Your AI team
            </p>
            <div className="relative max-w-md pb-14">
              {[0, 1].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                  aria-hidden
                  className="absolute inset-0 rounded-2xl border border-border bg-surface2/80 shadow-lg"
                  style={{
                    zIndex: 10 - i,
                    transform: `translateY(${(i + 1) * 14}px) scale(${1 - (i + 1) * 0.05})`,
                    transformOrigin: "top center",
                    opacity: 1 - (i + 1) * 0.22,
                  }}
                />
              ))}

              {/* top card — click to expand into full details */}
              <div className="relative z-20">
                <ExpandableCard
                  title={AGENT_CARDS[0].name}
                  description="Compliance intelligence agent"
                  icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.6} />}
                  classNameExpanded="[&_h4]:text-tealGlow"
                  trigger={
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 }}
                      whileHover={{ y: -4 }}
                      className="rounded-2xl border border-teal/30 bg-surface p-5 shadow-glow-teal transition-colors hover:border-teal/50"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal/30 bg-teal/10 text-tealGlow">
                          <ShieldCheck className="h-5 w-5" strokeWidth={1.6} />
                        </span>
                        <span className="display text-lg font-semibold tracking-wide">
                          {AGENT_CARDS[0].name}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-muted">{AGENT_CARDS[0].desc}</p>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          {AGENT_CARDS[0].tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-base/70 px-3 py-1 font-mono text-[10px] text-muted"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        <span className="font-mono text-[10px] text-tealGlow">click to expand →</span>
                      </div>
                    </motion.div>
                  }
                >
                  {AGENT_CARDS[0].detail}
                </ExpandableCard>
              </div>
            </div>
          </Reveal>
        </div>

        {/* mobile stats row */}
        <div className="order-2 flex justify-center gap-8 lg:hidden">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="display text-3xl font-semibold text-gradient-teal">{s.value}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-muted">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── RIGHT: orbital ring + stats (desktop showpiece — hidden on mobile) ── */}
        <div className="relative order-3 hidden h-[48rem] w-full items-center justify-center lg:order-none lg:flex">
          <OrbitalRing />

          {/* floating stats — Far Right Edge */}
          <div className="absolute right-0 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-10 text-left lg:flex lg:pr-12 xl:pr-20">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.12 }}
                className="relative text-left"
              >
                {/* Techy connector line pointing left */}
                <div className="absolute top-[32px] -left-20 h-[1px] w-12 bg-gradient-to-r from-transparent to-teal/30" />
                <div className="absolute top-[30.5px] -left-8 h-1 w-1 rounded-full bg-teal shadow-[0_0_6px_#36e9d2]" />

                <p className="display text-5xl font-bold text-text sm:text-6xl drop-shadow-md">
                  {s.value}
                </p>
                <p className="mt-2 text-sm font-medium uppercase tracking-widest text-muted/80">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Orbital ring: perfectly matches the requested design.
 * Center is far right (X=950). Radius is massive (550).
 * Path sweeps from bottom to top, covering the left side.
 */
const RING_DUR = 14; 
const R = 550;
const CX = 950; 
const CY = 400;
const startX = CX; 
const startY = CY + R; // 950 (Bottom)
const endX = CX;
const endY = CY - R; // -150 (Top)
// A rx ry x-axis-rotation large-arc-flag sweep-flag x y
// Sweeping left from bottom to top goes clockwise (sweep-flag = 1)
const ARC = `M ${startX} ${startY} A ${R} ${R} 0 0 1 ${endX} ${endY}`;

function OrbitalRing() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      <style>{`
        .od-flow {
          offset-path: path('${ARC}');
          offset-rotate: auto 90deg;
          animation: od-travel ${RING_DUR}s linear infinite;
          top: 0; left: 0;
        }
        .od-counter {
          animation: od-counter-rot ${RING_DUR}s linear infinite;
        }
        @keyframes od-travel { from { offset-distance: 0%; } to { offset-distance: 100%; } }
        @keyframes od-counter-rot {
          0% { transform: rotate(90deg); }
          50% { transform: rotate(0deg); }
          100% { transform: rotate(-90deg); }
        }
        @media (prefers-reduced-motion: reduce) { 
          .od-flow, .od-counter { animation: none; offset-distance: 50%; transform: none; } 
        }
      `}</style>

      {/* 
        Fixed coordinate system container! 
        This ensures the CSS offset-path (which uses unscaled pixels) perfectly aligns 
        with the SVG path on ALL screen sizes. We just scale the entire box.
      */}
      <div className="relative w-[1000px] h-[800px] flex-none scale-[0.55] sm:scale-[0.75] lg:scale-100">
        
        {/* The ethereal, low-opacity gradient ring */}
        <svg width="1000" height="800" viewBox="0 0 1000 800" className="absolute inset-0">
          <defs>
            <linearGradient id="odRing" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#0f172a" stopOpacity="0" />
              <stop offset="25%" stopColor="#36e9d2" stopOpacity="0.15" />
              <stop offset="50%" stopColor="#eafaf6" stopOpacity="0.4" />
              <stop offset="75%" stopColor="#f4d488" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Main glowing track */}
          <path d={ARC} fill="none" stroke="url(#odRing)" strokeWidth="180" strokeOpacity="0.1" strokeLinecap="round" style={{ filter: "blur(35px)" }} />
          <path d={ARC} fill="none" stroke="url(#odRing)" strokeWidth="70" strokeOpacity="0.5" strokeLinecap="round" style={{ filter: "blur(8px)" }} />
          
          {/* Faint concentric background rings for structural depth */}
          <circle cx={CX} cy={CY} r={420} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 16" />
          <circle cx={CX} cy={CY} r={320} fill="none" stroke="rgba(54, 233, 210, 0.05)" strokeWidth="1" strokeDasharray="2 8" />
          <circle cx={CX} cy={CY} r={180} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
          
          {/* Radar crosshair at the orbital center */}
          <path d={`M ${CX-30} ${CY} L ${CX+30} ${CY} M ${CX} ${CY-30} L ${CX} ${CY+30}`} stroke="rgba(54, 233, 210, 0.15)" strokeWidth="1" />

          {/* Ambient floating data points (Animated) */}
          <g opacity="0.6">
            <circle cx="620" cy="220" r="1.5" fill="#36e9d2">
              <animate attributeName="cy" values="220;180;220" dur="8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;1;0" dur="8s" repeatCount="indefinite" />
            </circle>
            <circle cx="780" cy="650" r="1" fill="#f4d488">
              <animate attributeName="cy" values="650;600;650" dur="12s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;1;0" dur="12s" repeatCount="indefinite" />
            </circle>
            <circle cx="700" cy="480" r="2" fill="#36e9d2">
              <animate attributeName="cy" values="480;430;480" dur="10s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;1;0" dur="10s" repeatCount="indefinite" />
            </circle>
          </g>

          {/* Technical Data Readouts */}
          <g className="font-mono text-[10px] uppercase tracking-widest" fill="rgba(255,255,255,0.15)">
            <text x="650" y="250">SYS.OP.01</text>
            <text x="650" y="265" fill="rgba(54, 233, 210, 0.3)">[SYNC: STABLE]</text>
            
            <text x="800" y="580">AETHON_NODE_9</text>
            <text x="800" y="595" fill="rgba(244, 212, 136, 0.3)">SEC_CLR: 100%</text>
          </g>
        </svg>

        {/* Icons flowing along the exact same coordinate space */}
        {FLOW_ICONS.map((f, i) => {
          const delay = -(i * RING_DUR) / FLOW_ICONS.length;
          return (
            <div
              key={i}
              className="od-flow absolute h-14 w-14"
              style={{ animationDelay: `${delay}s` }}
            >
              {/* Comet Tail */}
              <div 
                className="absolute left-1/2 -ml-6 h-40 w-12 rounded-full opacity-90 blur-[12px]"
                style={{ 
                  top: '50%', 
                  background: `linear-gradient(to bottom, ${f.color}ff, ${f.color}00)` 
                }} 
              />

              {/* Upright Icon */}
              <div
                className="od-counter relative flex h-14 w-14 items-center justify-center rounded-full border shadow-2xl backdrop-blur-xl bg-surface/90"
                style={{ animationDelay: `${delay}s`, borderColor: `${f.color}40`, boxShadow: `0 0 30px ${f.color}40` }}
              >
                <f.icon className="h-6 w-6" style={{ color: f.color }} strokeWidth={2} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
