"use client";
import Link from "next/link";
import { MessageSquareText, UploadCloud, ShieldCheck, FileDown } from "lucide-react";

const actions = [
  { label: "Ask Copilot", href: "/copilot", icon: MessageSquareText },
  { label: "Upload docs", href: "/upload", icon: UploadCloud },
  { label: "Run audit", href: "/compliance", icon: ShieldCheck },
  { label: "Export report", href: "/scoreboard", icon: FileDown },
];

export function QuickActions() {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {actions.map((a) => (
        <Link
          key={a.label}
          href={a.href}
          className="group flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-2 text-sm text-muted backdrop-blur transition-all hover:border-teal/40 hover:text-tealGlow"
        >
          <a.icon className="h-4 w-4" strokeWidth={1.6} />
          {a.label}
        </Link>
      ))}
    </div>
  );
}
