"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { Factory, Flame, Zap, HardHat, ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

type Industry = {
  name: string;
  icon: LucideIcon;
  glow: "teal" | "gold";
  tagline: string;
  desc: string;
  wins: string[];
};

const INDUSTRIES: Industry[] = [
  {
    name: "Refineries",
    icon: Flame,
    glow: "gold",
    tagline: "Hydrocarbon processing",
    desc: "Decades of P&IDs, OISD standards and incident reports fused so operators trace a fault to its root — before it becomes an event.",
    wins: [
      "Compound-risk detection across permits + gas readings",
      "OISD-116 clause conflicts flagged automatically",
      "35-hour manual searches cut to seconds",
    ],
  },
  {
    name: "Manufacturing",
    icon: Factory,
    glow: "teal",
    tagline: "Discrete & process",
    desc: "Every OEM manual, work order and quality procedure in one brain — so line engineers stop re-solving problems the plant already solved.",
    wins: [
      "Torque-spec & tolerance conflict alerts",
      "Root-cause traceable across work-order history",
      "Tribal knowledge captured before retirement",
    ],
  },
  {
    name: "Energy & Utilities",
    icon: Zap,
    glow: "gold",
    tagline: "Power & grid",
    desc: "Turbines, substations and distribution assets carry heavy regulatory load. AETHON keeps procedures current and provably compliant.",
    wins: [
      "Live compliance coverage across standards",
      "Superseded-clause & outdated-source flags",
      "1-click audit-ready compliance export",
    ],
  },
  {
    name: "Health & Safety",
    icon: HardHat,
    glow: "teal",
    tagline: "EHS & permits",
    desc: "The knowledge that prevents incidents is scattered across permits, near-misses and SOPs. AETHON reads it all and warns before the shop floor does.",
    wins: [
      "Confined-space & hot-work risk combinations",
      "Near-miss patterns surfaced across reports",
      "Factory Act / DGMS alignment checks",
    ],
  },
];

export default function Solutions() {
  return (
    <div className="min-h-screen">
      <AppSidebar />
      <PageContainer
        size="wide"
        hero={
          <PageHero
            badgeLabel="✦ Industries"
            badgeText="Solutions"
            title1="One brain,"
            title2="every industry"
            description="AETHON adapts to the standards, assets and failure modes of your sector — from refineries to the grid — turning scattered documents into decisions you can prove."
          />
        }
      >
        <Stagger className="mt-8 grid gap-5 lg:grid-cols-2">
          {INDUSTRIES.map((ind) => (
            <StaggerItem key={ind.name}>
              <TiltCard className="h-full p-6 sm:p-7" intensity={6}>
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                      ind.glow === "teal"
                        ? "border-teal/30 bg-teal/10 text-tealGlow"
                        : "border-gold/30 bg-gold/10 text-goldGlow"
                    }`}
                  >
                    <ind.icon className="h-5 w-5" strokeWidth={1.6} />
                  </span>
                  <div>
                    <h3 className="display text-xl font-semibold">{ind.name}</h3>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted">{ind.tagline}</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-muted">{ind.desc}</p>
                <ul className="mt-4 space-y-2">
                  {ind.wins.map((w) => (
                    <li key={w} className="flex items-start gap-2 text-sm">
                      <span className={`mt-1.5 h-1.5 w-1.5 flex-none rounded-full ${ind.glow === "teal" ? "bg-tealGlow" : "bg-goldGlow"}`} />
                      <span className="text-text/90">{w}</span>
                    </li>
                  ))}
                </ul>
              </TiltCard>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal className="mt-8">
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-teal/20 bg-teal/5 p-6 sm:flex-row sm:items-center">
            <div>
              <h3 className="display text-lg font-semibold">Don&apos;t see your sector?</h3>
              <p className="mt-1 text-sm text-muted">
                If it runs on drawings, permits and procedures, AETHON fits. See it on your data.
              </p>
            </div>
            <Link href="/dashboard" className="btn-gold sheen inline-flex flex-none">
              <span className="relative z-10 flex items-center gap-2 uppercase tracking-wider">
                Enter Console <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </Reveal>
      </PageContainer>
    </div>
  );
}
