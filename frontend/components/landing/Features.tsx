"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  ArrowRight,
  Cpu,
  Database,
  Share2,
  MessageSquareText,
  Wrench,
  ShieldCheck,
  AlertTriangle,
  ScanLine,
  Lock,
} from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

type Feature = {
  title: string;
  description: string;
  tag: string;
  href: string;
  days: string;
  hours: string;
  image: string;
};

// dark / industrial Unsplash backgrounds matching the AETHON theme
const features: Feature[] = [
  {
    title: "Universal Ingestion",
    description: "Drop in PDFs, scanned forms, P&ID drawings, spreadsheets and decades of email archives. Every file is parsed, OCR'd, chunked and embedded automatically — turning dead documents into one living, searchable corpus.",
    tag: "Pipeline",
    href: "/upload",
    days: "Every format",
    hours: "Auto-indexed",
    image: "/img44.png",
  },
  {
    title: "Knowledge Graph",
    description: "Equipment, procedures, regulations and incidents woven into one traversable structure. AETHON surfaces the relationships buried across siloed systems — the connections no single engineer could ever hold in their head.",
    tag: "Graph",
    href: "/knowledge-graph",
    days: "38,914 links",
    hours: "Live & growing",
    image: "/img22.png",
  },
  {
    title: "Expert Copilot",
    description: "Ask anything across the entire corpus in plain language. Every answer comes grounded in real documents — with inline citations, a confidence score and a clickable source link. No hallucinations, only evidence.",
    tag: "RAG",
    href: "/copilot",
    days: "Cited answers",
    hours: "94% precision",
    image: "/img33.png",
  },
  {
    title: "Maintenance & RCA",
    description: "Fuses work-order history, failure records, OEM manuals and live operating conditions to pinpoint root causes and fire predictive maintenance triggers — connecting the dots that prevent the next unplanned shutdown.",
    tag: "Agent",
    href: "/copilot",
    days: "Root-cause analysis",
    hours: "Predictive",
    image: "/img11.png",
  },
  {
    title: "Compliance Agent",
    description: "Continuously maps Factory Act, OISD, DGMS and PESO clauses against your live procedures and inspection records — flagging deviations before an audit ever does, and auto-assembling the corrective evidence package.",
    tag: "Agent",
    href: "/dashboard",
    days: "OISD · DGMS · PESO",
    hours: "Audit-ready",
    image: "/img55.png",
  },
  {
    title: "Conflict Detector",
    description: "Scans every document for contradictions — a manual says 40 Nm, the SOP says 55 Nm — and surfaces the clash before it ever reaches the shop floor. The silent errors that cause incidents, caught early.",
    tag: "Intelligence",
    href: "/dashboard",
    days: "Cross-document",
    hours: "Pre-incident",
    image: "/img66.png",
  },
  {
    title: "Knowledge Cliff Capture",
    description:
      "25% of senior engineers retire this decade. A 6-question interview captures 30 years of operational wisdom and structures it into the graph — before it walks out the door.",
    tag: "Preserve",
    href: "/knowledge-cliff",
    days: "Tacit → structured",
    hours: "Never lost",
    image:
      "/img77.png",
  },
  {
    title: "Failure Intelligence",
    description:
      "Spots dangerous patterns across every past incident — same machine, same procedure, same failure — and warns operational teams before history repeats itself.",
    tag: "Predict",
    href: "/dashboard",
    days: "Systemic patterns",
    hours: "Pre-emptive",
    image:
      "/img88.png",
  },
];

const stack = [
  { icon: Cpu, label: "Local LLM" },
  { icon: Database, label: "Vector RAG" },
  { icon: Share2, label: "Knowledge Graph" },
  { icon: ScanLine, label: "OCR pipeline" },
  { icon: Lock, label: "On-prem · data never leaves" },
];

export function Features() {
  return (
    <section id="features" className="relative px-6 py-16 sm:py-28">
      <Reveal className="mx-auto mb-16 max-w-2xl text-center">
        <span className="chip mb-5">The Intelligence Layer</span>
        <h2 className="display text-4xl font-semibold md:text-5xl">
          Six agents. One <span className="text-gradient-gold italic">brain.</span>
        </h2>
        <p className="mt-4 text-muted">
          Not a search box. A reasoning layer that connects every document your plant has
          ever produced — and acts on what it finds.
        </p>
      </Reveal>

      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:gap-6">
        <FeatureRow items={features.slice(0, 3)} />
        <FeatureRow items={features.slice(3, 6)} />
      </div>

      {/* how they work together */}
      <Reveal delay={0.15}>
        <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-muted">
          They aren&apos;t siloed. <span className="text-text">Ingestion</span> feeds the{" "}
          <span className="text-text">graph</span>, the graph grounds the{" "}
          <span className="text-text">copilot</span>, and the agents act on what it all
          reveals — one compound intelligence.
        </p>
      </Reveal>

      {/* tech-stack strip */}
      <Reveal delay={0.25}>
        <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {stack.map((s) => (
            <span
              key={s.label}
              className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted"
            >
              <s.icon className="h-3.5 w-3.5 text-tealGlow/70" />
              {s.label}
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/** One accordion row: hovering a card expands it horizontally, others compress. */
function FeatureRow({ items }: { items: Feature[] }) {
  const [active, setActive] = useState<string | null>(null);
  return (
    <div
      className="flex flex-col gap-4 sm:h-[24rem] sm:flex-row sm:gap-6"
      onMouseLeave={() => setActive(null)}
    >
      {items.map((f) => {
        const isActive = active === f.title;
        return (
          <motion.div
            key={f.title}
            layout
            onMouseEnter={() => setActive(f.title)}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ flexGrow: isActive ? 2.6 : active ? 0.85 : 1 }}
            className="sm:min-w-0"
          >
            <Link href={f.href} className="block h-full">
              <motion.article
                layout
                className={`group relative h-64 overflow-hidden rounded-[2rem] border sm:h-full ${isActive ? "border-teal/40 shadow-glow-teal" : "border-border"
                  }`}
              >
                {/* background image */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${f.image})` }}
                />
                {/* legibility overlays — base scrim + darkened top AND bottom */}
                <div className="absolute inset-0 bg-abyss/60" />
                <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/35 to-abyss/75" />
                <div className="absolute inset-0 bg-gradient-to-br from-teal/10 to-transparent" />

                {/* top row: title/description + (expanded) arrow button */}
                <div className="absolute inset-x-0 top-0 flex items-start justify-between p-6">
                  <motion.div layout="position">
                    <h3 className="display text-xl font-semibold text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.8)] sm:text-2xl">
                      {f.title}
                    </h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.85)]">
                      {f.description}
                    </p>
                  </motion.div>

                  <AnimatePresence>
                    {isActive && (
                      <motion.span
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{ duration: 0.35, delay: 0.15 }}
                        className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white text-abyss shadow-glow-teal"
                      >
                        <ArrowRight className="h-5 w-5" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {/* bottom row: Navigate pill + (expanded) schedule */}
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6">
                  <motion.span
                    layout="position"
                    className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-colors group-hover:bg-white/20"
                  >
                    <MapPin className="h-4 w-4" />
                    {f.tag}
                  </motion.span>

                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16 }}
                        transition={{ duration: 0.35, delay: 0.18 }}
                        className="text-right text-xs leading-relaxed text-white/80 drop-shadow"
                      >
                        <p>{f.days}</p>
                        <p className="font-mono text-tealGlow">{f.hours}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.article>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
