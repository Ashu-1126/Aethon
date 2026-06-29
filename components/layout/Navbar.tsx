"use client";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Hexagon } from "lucide-react";

const links = [
  { label: "Platform", href: "#platform" },
  { label: "Intelligence", href: "#features" },
  { label: "Graph", href: "/knowledge-graph" },
  { label: "Copilot", href: "/copilot" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 30));

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "py-3" : "py-5"
      }`}
    >
      <nav
        className={`mx-auto flex max-w-7xl items-center justify-between px-6 transition-all duration-500 ${
          scrolled
            ? "glass mx-4 rounded-full px-6 py-2 md:mx-auto md:max-w-5xl"
            : ""
        }`}
      >
        <Link href="/" className="group flex items-center gap-2">
          <motion.span
            whileHover={{ rotate: 90 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="text-tealGlow drop-shadow-[0_0_8px_rgba(54,233,210,0.6)]"
          >
            <Hexagon className="h-6 w-6" strokeWidth={1.5} />
          </motion.span>
          <span className="display text-xl font-semibold tracking-tight">
            AETHON
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="group relative text-sm text-muted transition-colors hover:text-text"
            >
              {l.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-teal to-gold transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </div>

        <Link
          href="/dashboard"
          className="btn-gold sheen text-sm"
        >
          <span className="relative z-10">Enter Console</span>
        </Link>
      </nav>
    </motion.header>
  );
}
