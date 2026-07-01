"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useId, useState, ReactNode } from "react";
import { Maximize2, X } from "lucide-react";

/**
 * PanelExpand — wraps a whole dashboard panel. Adds a small expand button in
 * the top-right; clicking it opens the SAME panel content enlarged in a modal.
 * Sub-cards inside stay independently clickable (button doesn't cover them).
 *
 * `render(expanded)` returns the panel body; `expanded` lets you tweak layout
 * (e.g. wider grid) when shown large.
 */
export function PanelExpand({
  render,
}: {
  render: (expanded: boolean) => ReactNode;
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

  return (
    <>
      <motion.div layoutId={`panel-${id}`} className="relative">
        {/* expand button — sits above panel content, top-right */}
        <button
          onClick={() => setOpen(true)}
          aria-label="Expand panel"
          className="absolute right-4 top-5 z-30 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-base/60 text-muted backdrop-blur transition-colors hover:border-teal/40 hover:text-tealGlow"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        {render(false)}
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
              layoutId={`panel-${id}`}
              className="relative z-10 max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl"
            >
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute right-4 top-5 z-30 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-base/60 text-text backdrop-blur transition-colors hover:text-tealGlow"
              >
                <X className="h-4 w-4" />
              </button>
              {render(true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
