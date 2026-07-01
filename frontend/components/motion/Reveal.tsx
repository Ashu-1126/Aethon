"use client";
import { motion, useReducedMotion, useInView } from "framer-motion";
import { ReactNode, useRef } from "react";

type Dir = "up" | "down" | "left" | "right" | "scale";

const offset: Record<Dir, { x?: number; y?: number; scale?: number }> = {
  up: { y: 40 },
  down: { y: -40 },
  left: { x: 60 },
  right: { x: -60 },
  scale: { scale: 0.92 },
};

/**
 * Reveal — fades/slides content in when it scrolls into view.
 *
 * Uses `useInView` + an explicit `animate` (NOT the `whileInView` prop) so it
 * fires reliably even when the element is ALREADY in the viewport at mount —
 * including async/lazy-mounted content like a dynamically-imported canvas.
 * (The `whileInView` prop can miss that first-paint case, leaving content
 * frozen at opacity:0 — which is what blanked whole pages before.)
 */
export function Reveal({
  children,
  dir = "up",
  delay = 0,
  className,
}: {
  children: ReactNode;
  dir?: Dir;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const from = reduce ? {} : offset[dir];
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, ...from }}
      animate={inView ? { opacity: 1, x: 0, y: 0, scale: 1 } : undefined}
      transition={{ duration: 0.8, delay, ease: [0.21, 0.5, 0.27, 0.99] }}
    >
      {children}
    </motion.div>
  );
}

/** Stagger container — children reveal in sequence */
export function Stagger({
  children,
  className,
  gap = 0.12,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: gap } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 30 },
        show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.21, 0.5, 0.27, 0.99] } },
      }}
    >
      {children}
    </motion.div>
  );
}
