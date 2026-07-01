"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Hexagon,
  Home,
  LayoutDashboard,
  MessageSquareText,
  Share2,
  UploadCloud,
  Target,
  Wrench,
  ShieldCheck,
  Brain,
  Cable,
  Layers,
  Lock,
  Menu,
  X,
} from "lucide-react";
import { health } from "@/lib/api";
import { ApiError } from "@/lib/api";

const nav = [
  { href: "/",                 label: "Home",              icon: Home },
  { href: "/dashboard",        label: "Overview",          icon: LayoutDashboard },
  { href: "/copilot",           label: "Copilot",           icon: MessageSquareText },
  { href: "/knowledge-graph",   label: "Knowledge Graph",   icon: Share2 },
  { href: "/rca",               label: "Maintenance & RCA", icon: Wrench },
  { href: "/compliance",        label: "Compliance",        icon: ShieldCheck },
  { href: "/knowledge-cliff",   label: "Knowledge Cliff",   icon: Brain },
  { href: "/upload",            label: "Documents",         icon: UploadCloud },
  { href: "/integrations",      label: "Integrations",      icon: Cable },
  { href: "/solutions",         label: "Solutions",         icon: Layers },
  { href: "/security",          label: "Security",          icon: Lock },
  { href: "/scoreboard",        label: "Scoreboard",        icon: Target },
];

/** Live backend status, polled from /health. */
function StatusPill() {
  const [state, setState] = useState<"connecting" | "online" | "offline">("connecting");
  const [docs, setDocs] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const ping = async () => {
      try {
        const h = await health.check();
        if (!active) return;
        setState("online");
        setDocs(h.corpus_docs);
      } catch (e) {
        if (active) setState(e instanceof ApiError && e.offline ? "offline" : "offline");
      }
    };
    ping();
    const id = setInterval(ping, 8000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const dot =
    state === "online" ? "bg-tealGlow" : state === "offline" ? "bg-danger" : "bg-gold";
  const label =
    state === "online" ? "corpus · synced" : state === "offline" ? "backend · offline" : "connecting…";

  return (
    <div className="glass mt-auto p-3 text-xs">
      <p className="flex items-center gap-2 font-mono">
        <span className={`h-1.5 w-1.5 animate-pulseGlow rounded-full ${dot}`} />
        <span className={state === "offline" ? "text-danger" : "text-tealGlow"}>{label}</span>
      </p>
      <p className="mt-1 text-muted">
        {docs != null ? `${docs.toLocaleString()} documents indexed` : "—"}
      </p>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1" aria-label="Primary">
      {nav.map((n, i) => {
        const active = path === n.href;
        return (
          <Link
            key={n.label + i}
            href={n.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50 ${
              active ? "bg-teal/10 text-tealGlow" : "text-muted hover:bg-surface/60 hover:text-text"
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
  );
}

export function AppSidebar() {
  const [open, setOpen] = useState(false);

  // Escape closes the mobile drawer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Desktop sidebar */}
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
        <NavLinks />
        <StatusPill />
      </motion.aside>

      {/* Mobile top bar — fixed h-14 (56px) to match the pt-14 page offset */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-base/80 px-4 backdrop-blur-xl md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Hexagon className="h-5 w-5 text-tealGlow" strokeWidth={1.5} />
          <span className="display font-semibold">AETHON</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted hover:text-tealGlow"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-abyss/70 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-border bg-base/95 p-4 backdrop-blur-xl md:hidden"
            >
              <div className="mb-10 flex items-center justify-between pt-2">
                <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2 px-2">
                  <Hexagon className="h-6 w-6 text-tealGlow" strokeWidth={1.5} />
                  <span className="display text-lg font-semibold">AETHON</span>
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation menu"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted hover:text-tealGlow"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavLinks onNavigate={() => setOpen(false)} />
              <StatusPill />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
