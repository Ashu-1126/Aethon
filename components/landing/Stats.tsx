"use client";
import { motion, useInView, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/motion/Reveal";

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.8,
      ease: "easeOut",
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [inView, to]);
  return (
    <span ref={ref}>
      {Number.isInteger(to) ? Math.round(val) : val.toFixed(1)}
      {suffix}
    </span>
  );
}

const stats = [
  { value: 35, suffix: "%", label: "Of an engineer's day lost to searching — eliminated" },
  { value: 12, suffix: "", label: "Disconnected document systems, unified into one" },
  { value: 22, suffix: "%", label: "Of unplanned downtime traced to knowledge gaps" },
  { value: 2.4, suffix: "s", label: "Average cited answer time vs. hours of manual search" },
];

export function Stats() {
  return (
    <section className="relative px-6 py-24">
      <Reveal>
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border bg-border/40 md:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              whileHover={{ backgroundColor: "rgba(14,48,45,0.9)" }}
              className="bg-surface/70 p-8 text-center transition-colors"
            >
              <p className="display text-4xl font-semibold text-gradient-teal md:text-5xl">
                <Counter to={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-3 text-xs leading-relaxed text-muted">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
