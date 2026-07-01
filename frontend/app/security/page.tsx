"use client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import {
  ShieldCheck,
  Lock,
  Server,
  KeyRound,
  Eye,
  FileCheck2,
  Network,
  CheckCircle2,
} from "lucide-react";

const PILLARS = [
  {
    icon: Server,
    title: "Deploy where your data lives",
    desc: "Run fully on-premise or in a dedicated private cloud (VPC). Your drawings, permits and process data never leave your perimeter.",
    glow: "teal" as const,
  },
  {
    icon: Lock,
    title: "Encrypted end to end",
    desc: "TLS 1.3 in transit and AES-256 at rest. Per-tenant keys with optional customer-managed keys (BYOK).",
    glow: "teal" as const,
  },
  {
    icon: KeyRound,
    title: "Role-based access",
    desc: "SSO / SAML, granular RBAC and scoped API tokens. Engineers see only the zones and documents they're cleared for.",
    glow: "gold" as const,
  },
  {
    icon: Eye,
    title: "Full audit trail",
    desc: "Every query, ingestion and export is logged and traceable — the same provenance that powers cited answers powers compliance review.",
    glow: "gold" as const,
  },
  {
    icon: Network,
    title: "Air-gap ready",
    desc: "Runs disconnected for high-security sites. Models and indexes ship with the deployment — no outbound calls required.",
    glow: "teal" as const,
  },
  {
    icon: FileCheck2,
    title: "No training on your data",
    desc: "Your corpus is used to answer your questions — never to train shared models. Isolation is contractual and technical.",
    glow: "gold" as const,
  },
];

const CERTS = [
  { name: "SOC 2 Type II", note: "Security, availability & confidentiality" },
  { name: "ISO 27001", note: "Information security management" },
  { name: "GDPR", note: "Data protection & privacy" },
  { name: "OISD / Factory Act", note: "Aligned to industrial standards" },
];

export default function Security() {
  return (
    <div className="min-h-screen">
      <AppSidebar />
      <PageContainer
        size="wide"
        hero={
          <PageHero
            badgeLabel="✦ Trust"
            badgeText="Security & Compliance"
            title1="Built for"
            title2="high-security sites"
            description="Heavy industry can't send its crown-jewel engineering data to a public endpoint. AETHON is designed to run inside your perimeter, with the controls your security team expects."
          />
        }
      >
        {/* certifications strip */}
        <Reveal className="mt-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CERTS.map((c) => (
              <div key={c.name} className="glass-glow flex flex-col items-center gap-2 p-5 text-center">
                <ShieldCheck className="h-6 w-6 text-tealGlow" strokeWidth={1.6} />
                <p className="display text-sm font-semibold">{c.name}</p>
                <p className="text-[11px] leading-snug text-muted">{c.note}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* pillars */}
        <Stagger className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <StaggerItem key={p.title}>
              <TiltCard className="h-full p-6" intensity={8}>
                <span
                  className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl border ${
                    p.glow === "teal"
                      ? "border-teal/30 bg-teal/10 text-tealGlow"
                      : "border-gold/30 bg-gold/10 text-goldGlow"
                  }`}
                >
                  <p.icon className="h-5 w-5" strokeWidth={1.6} />
                </span>
                <h3 className="display text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.desc}</p>
              </TiltCard>
            </StaggerItem>
          ))}
        </Stagger>

        {/* data-handling promise */}
        <Reveal className="mt-8">
          <div className="glass-glow p-6 sm:p-8">
            <h2 className="display text-xl font-semibold">Our data-handling promise</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                "Your data stays in your environment — on-prem or private VPC.",
                "No use of your corpus to train shared or third-party models.",
                "Least-privilege access with full, exportable audit logs.",
                "Right to delete: purge documents and their derived index on request.",
              ].map((t) => (
                <div key={t} className="flex items-start gap-3 rounded-xl border border-border bg-base/50 px-4 py-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-tealGlow" />
                  <span className="text-sm text-muted">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </PageContainer>
    </div>
  );
}
