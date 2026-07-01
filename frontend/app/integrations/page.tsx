"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import {
  Cpu,
  Database,
  FileStack,
  GitBranch,
  Gauge,
  ShieldCheck,
  Workflow,
  Radio,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

type Integration = {
  name: string;
  category: string;
  desc: string;
  icon: LucideIcon;
  status: "live" | "beta" | "planned";
  glow: "teal" | "gold";
};

// What an industrial knowledge platform actually connects to.
const INTEGRATIONS: Integration[] = [
  {
    name: "SCADA / DCS",
    category: "Control systems",
    desc: "Stream tag data and alarms from Honeywell, Emerson, Yokogawa and Siemens control systems into the knowledge graph.",
    icon: Gauge,
    status: "live",
    glow: "teal",
  },
  {
    name: "Process Historians",
    category: "Time-series",
    desc: "Ingest historical trends from OSIsoft PI, Aspen IP.21 and Wonderware to correlate events with equipment behaviour.",
    icon: Database,
    status: "live",
    glow: "teal",
  },
  {
    name: "CMMS / EAM",
    category: "Maintenance",
    desc: "Sync work orders, PM schedules and asset registers from SAP PM, Maximo and Fiix for root-cause traceability.",
    icon: Workflow,
    status: "live",
    glow: "gold",
  },
  {
    name: "Document Systems",
    category: "Content",
    desc: "Index P&IDs, OEM manuals, SOPs and permits from SharePoint, Documentum and network shares — with OCR.",
    icon: FileStack,
    status: "live",
    glow: "gold",
  },
  {
    name: "Permit-to-Work",
    category: "Safety",
    desc: "Pull active permits and isolations so compound-risk detection can flag dangerous combinations in real time.",
    icon: ShieldCheck,
    status: "beta",
    glow: "teal",
  },
  {
    name: "IIoT Gateways",
    category: "Edge",
    desc: "MQTT / OPC-UA bridges for edge sensors and PLCs where a full control-system tap isn't available.",
    icon: Radio,
    status: "beta",
    glow: "teal",
  },
  {
    name: "ERP",
    category: "Enterprise",
    desc: "Reconcile parts, procurement and cost data from SAP and Oracle for lifecycle and spares intelligence.",
    icon: GitBranch,
    status: "planned",
    glow: "gold",
  },
  {
    name: "REST & GraphQL API",
    category: "Developer",
    desc: "A documented API and webhooks so you can push any proprietary or in-house data source into AETHON.",
    icon: Cpu,
    status: "live",
    glow: "teal",
  },
];

const badge = {
  live: "border-teal/30 bg-teal/10 text-tealGlow",
  beta: "border-gold/30 bg-gold/10 text-goldGlow",
  planned: "border-border bg-surface/60 text-muted",
} as const;

export default function Integrations() {
  return (
    <div className="min-h-screen">
      <AppSidebar />
      <PageContainer
        size="wide"
        hero={
          <PageHero
            badgeLabel="✦ Connectors"
            badgeText="Integrations"
            title1="Connects to"
            title2="your stack"
            description="AETHON plugs into the systems your plant already runs — control systems, historians, maintenance and document repositories — and fuses them into one living knowledge graph."
          />
        }
      >
        <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {INTEGRATIONS.map((it) => (
            <StaggerItem key={it.name}>
              <TiltCard className="group h-full p-6" intensity={8}>
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                      it.glow === "teal"
                        ? "border-teal/30 bg-teal/10 text-tealGlow"
                        : "border-gold/30 bg-gold/10 text-goldGlow"
                    }`}
                  >
                    <it.icon className="h-5 w-5" strokeWidth={1.6} />
                  </span>
                  <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase ${badge[it.status]}`}>
                    {it.status}
                  </span>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted">{it.category}</p>
                <h3 className="display mt-1 text-lg font-semibold">{it.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{it.desc}</p>
              </TiltCard>
            </StaggerItem>
          ))}
        </Stagger>

        {/* how it flows */}
        <Reveal className="mt-10">
          <div className="glass-glow p-6 sm:p-8">
            <h2 className="display text-xl font-semibold">From source to cited answer</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Every connector feeds the same pipeline — so an answer can cite a sensor
              reading, a permit and an OEM manual in the same breath.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { step: "01", label: "Ingest", note: "Connectors pull tags, docs, permits and work orders." },
                { step: "02", label: "Structure", note: "Entities and relationships extracted into the graph." },
                { step: "03", label: "Reason", note: "Agents correlate signals no single system flags." },
                { step: "04", label: "Cite", note: "Answers traced to the exact source and page." },
              ].map((s) => (
                <div key={s.step} className="rounded-xl border border-border bg-base/50 p-4">
                  <p className="font-mono text-xs text-tealGlow">{s.step}</p>
                  <p className="display mt-1 text-base font-semibold">{s.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{s.note}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal className="mt-8">
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-teal/20 bg-teal/5 p-6 sm:flex-row sm:items-center">
            <div>
              <h3 className="display text-lg font-semibold">Need a connector we don&apos;t list?</h3>
              <p className="mt-1 text-sm text-muted">
                The REST &amp; GraphQL API lets you push any proprietary source into AETHON.
              </p>
            </div>
            <Link href="/copilot" className="btn-gold sheen inline-flex flex-none">
              <span className="relative z-10 flex items-center gap-2 uppercase tracking-wider">
                Ask the Copilot <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </Reveal>
      </PageContainer>
    </div>
  );
}
