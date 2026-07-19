"use client";
import { animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Animated count-up. Animates from the previous value to `to` whenever `to`
 * changes (e.g. async data arriving after mount). No scroll-gating — the
 * dashboard KPI cards are above the fold and must always reflect live data.
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
  const [val, setVal] = useState(0);
  const valRef = useRef(0);
  const dp = decimals ?? (Number.isInteger(to) ? 0 : 1);

  useEffect(() => {
    const from = valRef.current;
    const controls = animate(from, to, {
      duration,
      delay,
      ease: "easeOut",
      onUpdate: (v) => {
        valRef.current = v;
        setVal(v);
      },
    });
    return () => controls.stop();
  }, [to, duration, delay]);

  return (
    <span>
      {prefix}
      {val.toLocaleString("en-US", {
        minimumFractionDigits: dp,
        maximumFractionDigits: dp,
      })}
      {suffix}
    </span>
  );
}
