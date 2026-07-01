"use client";
import { useInView, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Animated count-up that runs once when scrolled into view.
 * Matches the proven Stats-section behaviour.
 */
export function Counter({
  to,
  suffix = "",
  prefix = "",
  decimals,
  duration = 1.6,
  delay = 0,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  duration?: number;
  /** seconds to wait before starting (use when the element fades in first) */
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  const dp = decimals ?? (Number.isInteger(to) ? 0 : 1);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration,
      delay,
      ease: "easeOut",
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [inView, to, duration, delay]);

  return (
    <span ref={ref}>
      {prefix}
      {val.toLocaleString("en-US", {
        minimumFractionDigits: dp,
        maximumFractionDigits: dp,
      })}
      {suffix}
    </span>
  );
}
