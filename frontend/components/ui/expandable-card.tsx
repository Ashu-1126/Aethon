"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useId, useRef, useState, ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ExpandableCard — a compact card that expands into a centered modal overlay
 * on click (image + title + description + rich children). Escape / click-outside
 * to close. Smooth shared-layout animation via Framer Motion layoutId.
 */
export function ExpandableCard({
  title,
  description,
  src,
  icon,
  trigger,
  children,
  classNameExpanded,
}: {
  title: string;
  description?: string;
  src?: string;
  icon?: ReactNode;
  /** custom collapsed card content; if omitted a default card is rendered */
  trigger?: ReactNode;
  children: ReactNode;
  classNameExpanded?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

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
      {/* collapsed trigger */}
      <motion.div layoutId={`card-${title}-${id}`} onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger ?? (
          <div className="flex items-center gap-4 rounded-2xl border border-teal/30 bg-surface p-5 shadow-glow-teal transition-colors hover:border-teal/50">
            {src ? (
              <motion.img
                layoutId={`image-${title}-${id}`}
                src={src}
                alt={title}
                className="h-14 w-14 flex-none rounded-xl object-cover"
              />
            ) : icon ? (
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-teal/30 bg-teal/10 text-tealGlow">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              <motion.h3 layoutId={`title-${title}-${id}`} className="display text-lg font-semibold tracking-wide">
                {title}
              </motion.h3>
              {description && (
                <motion.p layoutId={`desc-${title}-${id}`} className="mt-0.5 truncate text-sm text-muted">
                  {description}
                </motion.p>
              )}
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[100] grid place-items-center p-4">
            {/* backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-abyss/80 backdrop-blur-sm"
            />

            {/* expanded card */}
            <motion.div
              ref={ref}
              layoutId={`card-${title}-${id}`}
              className={cn(
                "relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-teal/30 bg-surface shadow-glow-teal",
                classNameExpanded
              )}
            >
              {/* close */}
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-abyss/60 text-text backdrop-blur transition-colors hover:text-tealGlow"
              >
                <X className="h-4 w-4" />
              </button>

              {src && (
                <motion.img
                  layoutId={`image-${title}-${id}`}
                  src={src}
                  alt={title}
                  className="h-56 w-full flex-none object-cover"
                />
              )}

              <div className="flex min-h-0 flex-col overflow-hidden">
                <div className="flex items-center gap-3 p-6 pb-3">
                  {!src && icon && (
                    <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-teal/30 bg-teal/10 text-tealGlow">
                      {icon}
                    </span>
                  )}
                  <div>
                    <motion.h3 layoutId={`title-${title}-${id}`} className="display text-2xl font-semibold">
                      {title}
                    </motion.h3>
                    {description && (
                      <motion.p layoutId={`desc-${title}-${id}`} className="mt-0.5 text-sm text-muted">
                        {description}
                      </motion.p>
                    )}
                  </div>
                </div>

                {/* scrollable rich content */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-4 overflow-y-auto px-6 pb-8 text-sm leading-relaxed text-muted [&_h4]:mt-4 [&_h4]:font-semibold [&_h4]:text-text"
                >
                  {children}
                </motion.div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
