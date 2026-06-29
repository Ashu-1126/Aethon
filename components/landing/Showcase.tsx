"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Quote, FileText, CheckCircle2 } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

export function Showcase() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const rotate = useTransform(scrollYProgress, [0, 1], [4, -4]);

  return (
    <section id="platform" ref={ref} className="relative px-6 py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
        <Reveal dir="right">
          <span className="chip mb-5">Cited. Traceable. Trusted.</span>
          <h2 className="display text-4xl font-semibold leading-tight md:text-5xl">
            Answers you can <span className="text-gradient-teal">prove.</span>
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-muted">
            Every response is grounded in a real document and traceable to the exact
            passage. Click any sentence to see its source. No hallucinations, no
            guessing — the difference between a chatbot and an operations brain.
          </p>
          <ul className="mt-7 space-y-3">
            {[
              "Inline citations on every claim",
              "Confidence score per answer",
              "Outdated-source & superseded-clause flags",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3 text-sm text-muted">
                <CheckCircle2 className="h-4 w-4 text-tealGlow" /> {t}
              </li>
            ))}
          </ul>
        </Reveal>

        <motion.div style={{ y, rotate }} className="relative">
          <div className="glass-glow relative overflow-hidden p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-gold/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-teal/50" />
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
              <span className="ml-2 font-mono text-xs text-muted">aethon · copilot</span>
            </div>

            <div className="rounded-xl bg-base/70 p-4 text-sm">
              <p className="text-muted">
                <span className="text-tealGlow">›</span> Does procedure SOP-44 comply with
                confined-space entry law?
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="mt-3 rounded-xl border border-teal/20 bg-surface/80 p-4 text-sm leading-relaxed"
            >
              <Quote className="mb-2 h-4 w-4 text-gold" />
              <p>
                <span className="rounded bg-gold/15 px-1 text-goldGlow">No.</span> SOP-44
                omits continuous atmospheric monitoring required by{" "}
                <span className="underline decoration-teal/50 decoration-dotted underline-offset-4">
                  Factory Act §36(1)(b)
                </span>
                . It also conflicts with the standby-person rule in{" "}
                <span className="underline decoration-teal/50 decoration-dotted underline-offset-4">
                  OISD-105 §9.4
                </span>
                .
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="chip">
                  <FileText className="h-3 w-3" /> Factory_Act_1948.pdf · p.42
                </span>
                <span className="chip">
                  <FileText className="h-3 w-3" /> OISD-105.pdf · p.18
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-mono text-[11px] text-muted">confidence</span>
                <div className="h-1.5 w-32 overflow-hidden rounded-full bg-border">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "94%" }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6, duration: 1 }}
                    className="h-full rounded-full bg-gradient-to-r from-teal to-tealGlow"
                  />
                </div>
                <span className="font-mono text-[11px] text-tealGlow">94%</span>
              </div>
            </motion.div>
          </div>

          {/* floating glow accent */}
          <div className="absolute -right-6 -top-6 -z-10 h-32 w-32 rounded-full bg-gold/20 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 -z-10 h-40 w-40 rounded-full bg-teal/20 blur-3xl" />
        </motion.div>
      </div>
    </section>
  );
}
