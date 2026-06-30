"use client";
import {
  FileStack,
  Share2,
  MessageSquareText,
  Wrench,
  ShieldCheck,
  AlertTriangle,
  Brain,
  TrendingUp,
} from "lucide-react";
import { TiltCard } from "@/components/motion/TiltCard";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";

const features = [
  {
    icon: FileStack,
    title: "Universal Ingestion",
    body: "PDFs, scanned forms, P&ID drawings, spreadsheets, email archives — parsed, OCR'd and embedded automatically.",
    tag: "Pipeline",
  },
  {
    icon: Share2,
    title: "Knowledge Graph",
    body: "Equipment ↔ procedure ↔ regulation ↔ incident. The relationships no single team can hold in their head.",
    tag: "Graph",
    featured: true,
  },
  {
    icon: MessageSquareText,
    title: "Expert Copilot",
    body: "Ask anything across the corpus. Every answer carries inline citations, a confidence score, and a source link.",
    tag: "RAG",
  },
  {
    icon: Wrench,
    title: "Maintenance & RCA",
    body: "Fuses work orders, failure records and manuals to surface root causes and predictive maintenance triggers.",
    tag: "Agent",
  },
  {
    icon: ShieldCheck,
    title: "Compliance Agent",
    body: "Maps Factory Act, OISD, DGMS & PESO clauses against live procedures — flags gaps, builds audit packages.",
    tag: "Agent",
  },
  {
    icon: AlertTriangle,
    title: "Conflict Detector",
    body: "Finds contradictions across documents — a manual says 40 Nm, the SOP says 55 Nm — before they cause incidents.",
    tag: "Intelligence",
  },
  {
    icon: Brain,
    title: "Knowledge Cliff Capture",
    body: "25% of senior engineers retire this decade. A 6-question interview saves 30 years of operational wisdom before it walks out the door.",
    tag: "Preserve",
  },
  {
    icon: TrendingUp,
    title: "Failure Intelligence",
    body: "Spots dangerous patterns across all past incidents — same machine, same procedure, same failure — and warns you before history repeats.",
    tag: "Predict",
  },
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

      <Stagger className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {features.map((f) => (
          <StaggerItem key={f.title}>
            <TiltCard
              className={`group h-full p-5 sm:p-7 ${
                f.featured ? "shadow-glow-teal" : ""
              }`}
            >
              <div className="mb-5 flex items-center justify-between">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-300 ${
                    f.featured
                      ? "border-teal/40 bg-teal/10 text-tealGlow group-hover:shadow-glow-teal"
                      : "border-border bg-base/60 text-muted group-hover:text-tealGlow"
                  }`}
                >
                  <f.icon className="h-5 w-5" strokeWidth={1.6} />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                  {f.tag}
                </span>
              </div>
              <h3 className="display mb-2 text-xl font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{f.body}</p>
            </TiltCard>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
