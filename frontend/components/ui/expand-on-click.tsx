"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useId, useState, ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ExpandOnClick — wrap any card's collapsed content; on click it morphs (shared
 * layoutId) into a centered detail modal showing `expanded`. Escape / click-out
 * to close. Themed for AETHON. Great for data cards (risks, zones, conflicts…).
 */
export function ExpandOnClick({
  collapsed,
  expanded,
  className,
  accent = "teal",
}: {
  collapsed: ReactNode;
  expanded: ReactNode;
  className?: string;
  accent?: "teal" | "gold" | "danger";
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKey);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const ring =
    accent === "gold" ? "border-gold/40 shadow-glow-gold" : accent === "danger" ? "border-danger/40" : "border-teal/40 shadow-glow-teal";

  return (
    <>
      <motion.div
        layoutId={`exp-${id}`}
        onClick={() => setOpen(true)}
        className={cn("cursor-pointer", className)}
      >
        {collapsed}
      </motion.div>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[100] grid place-items-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-abyss/80 backdrop-blur-sm"
            />
            <motion.div
              layoutId={`exp-${id}`}
              className={cn(
                "relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border bg-surface p-6",
                ring
              )}
            >
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-abyss/60 text-text backdrop-blur transition-colors hover:text-tealGlow"
              >
                <X className="h-4 w-4" />
              </button>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
              >
                {expanded}
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
