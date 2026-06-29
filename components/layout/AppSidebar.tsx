"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Hexagon,
  LayoutDashboard,
  MessageSquareText,
  Share2,
  FileStack,
  ShieldCheck,
  Wrench,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/copilot", label: "Copilot", icon: MessageSquareText },
  { href: "/knowledge-graph", label: "Knowledge Graph", icon: Share2 },
  { href: "/dashboard", label: "Documents", icon: FileStack },
  { href: "/dashboard", label: "Compliance", icon: ShieldCheck },
  { href: "/dashboard", label: "Maintenance", icon: Wrench },
];

export function AppSidebar() {
  const path = usePathname();
  return (
    <motion.aside
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col border-r border-border bg-base/70 p-4 backdrop-blur-xl md:flex"
    >
      <Link href="/" className="mb-10 flex items-center gap-2 px-2 pt-2">
        <Hexagon className="h-6 w-6 text-tealGlow drop-shadow-[0_0_8px_rgba(54,233,210,0.6)]" strokeWidth={1.5} />
        <span className="display text-lg font-semibold">AETHON</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {nav.map((n, i) => {
          const active = path === n.href;
          return (
            <Link
              key={n.label + i}
              href={n.href}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300 ${
                active
                  ? "bg-teal/10 text-tealGlow"
                  : "text-muted hover:bg-surface/60 hover:text-text"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-teal to-gold"
                />
              )}
              <n.icon className="h-4 w-4" strokeWidth={1.6} />
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="glass mt-auto p-3 text-xs">
        <p className="font-mono text-tealGlow">corpus · synced</p>
        <p className="mt-1 text-muted">4,182 documents indexed</p>
      </div>
    </motion.aside>
  );
}
