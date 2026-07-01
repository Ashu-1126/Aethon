"use client";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

const SPRING = { type: "spring" as const, stiffness: 260, damping: 20 };
const AUTOPLAY_MS = 2400;

type Zone = {
  title: string;
  blurb: string;
  image: string;
  // back-face data
  metric: string;
  metricLabel: string;
  facts: string[];
};

const ZONES: Zone[] = [
  {
    title: "Refinery Unit-4",
    blurb: "Coke-oven battery · live gas + permit monitoring",
    image:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
    metric: "24/7",
    metricLabel: "compound-risk watch",
    facts: ["Gas + hot-work permit fusion", "Evacuation in < 10 min", "OISD-116 enforced"],
  },
  {
    title: "Processing Plant",
    blurb: "Pressure vessels · vibration + thermal intelligence",
    image:
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80",
    metric: "92%",
    metricLabel: "compliance coverage",
    facts: ["Predictive maintenance", "RCA on recurring failures", "PESO vessel checks"],
  },
  {
    title: "Control Room",
    blurb: "Command center · unified operations brain",
    image:
      "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1200&q=80",
    metric: "4,182",
    metricLabel: "documents indexed",
    facts: ["Cited copilot answers", "Live knowledge graph", "Audit packages on demand"],
  },
  {
    title: "Storage & Dispatch",
    blurb: "Tank farm · confined-space permit intelligence",
    image:
      "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80",
    metric: "0",
    metricLabel: "missed near-misses",
    facts: ["Confined-space entry checks", "Oxygen + H₂S fusion", "Conflict detection"],
  },
  {
    title: "Maintenance Bay",
    blurb: "Workshop · work-order & manual intelligence",
    image:
      "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=1200&q=80",
    metric: "200×",
    metricLabel: "faster than manual search",
    facts: ["OEM manual lookup", "Torque-spec conflict alerts", "Work-order history"],
  },
];

export function CarouselSection() {
  const [active, setActive] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  // spread factor: shrink card size + side-card offsets on small screens so
  // the 3D carousel never overflows the viewport (was pushing page width wide,
  // which shoved every other section to the left on mobile)
  const [spread, setSpread] = useState(1);
  useEffect(() => {
    const onResize = () => setSpread(Math.min(1, window.innerWidth / 900));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const n = ZONES.length;
  const go = (dir: number) => {
    setFlipped(false);
    setActive((a) => (a + dir + n) % n);
  };

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setFlipped(false);
      setActive((a) => (a + 1) % n);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [n]);

  const offsetOf = (i: number) => {
    let d = i - active;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  };

  const transformFor = (offset: number) => {
    const abs = Math.abs(offset);
    const dir = Math.sign(offset);
    const s = spread; // 1 on desktop, <1 on narrow screens — scales side offsets
    // keep the active card readable (don't shrink below 0.9); only the side
    // cards + their x-offsets scale down so nothing overflows on mobile
    if (offset === 0) return { rotateY: 0, z: 0, scale: 1, x: 0, opacity: 1, zIndex: 50, show: true };
    if (abs === 1) return { rotateY: -dir * 40, z: -200, scale: 0.84, x: dir * 320 * s, opacity: 0.85, zIndex: 40, show: true };
    if (abs === 2) return { rotateY: -dir * 60, z: -420, scale: 0.68, x: dir * 560 * s, opacity: 0.4, zIndex: 30, show: true };
    return { rotateY: -dir * 78, z: -620, scale: 0.52, x: dir * 700 * s, opacity: 0, zIndex: 10, show: false };
  };

  return (
    <section id="zones" className="relative overflow-hidden px-6 py-16 sm:py-28">
      <Reveal className="mx-auto mb-14 max-w-2xl text-center">
        <span className="chip mb-5">Deployed across the facility</span>
        <h2 className="display text-3xl font-semibold sm:text-4xl">
          One brain. <span className="text-gradient-teal">Every zone.</span>
        </h2>
        <p className="mt-4 text-muted">
          AETHON watches every corner of the plant in real time. Hover a zone to look inside.
        </p>
      </Reveal>

      <div
        className="relative flex h-[32rem] w-full items-center justify-center [perspective:1800px]"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
        }}
      >
        {ZONES.map((zone, i) => {
          const offset = offsetOf(i);
          const t = transformFor(offset);
          const isActive = offset === 0;
          return (
            <motion.div
              key={i}
              className="absolute h-[26rem] w-[18rem] sm:h-[29rem] sm:w-[23rem] [transform-style:preserve-3d]"
              style={{ zIndex: t.zIndex, pointerEvents: t.show ? "auto" : "none" }}
              animate={{ rotateY: t.rotateY, z: t.z, scale: t.scale, x: t.x, opacity: t.opacity }}
              transition={SPRING}
              onMouseEnter={() => {
                if (isActive) {
                  setPaused(true);
                  setFlipped(true);
                }
              }}
              onMouseLeave={() => {
                if (isActive) {
                  setPaused(false);
                  setFlipped(false);
                }
              }}
              onClick={() => {
                if (!isActive) {
                  setFlipped(false);
                  setActive(i);
                }
              }}
            >
              <motion.div
                className="pointer-events-none relative h-full w-full [transform-style:preserve-3d]"
                animate={{ rotateY: isActive && flipped ? 180 : 0 }}
                transition={SPRING}
              >
                {/* FRONT — zone image card */}
                <div className="absolute inset-0 overflow-hidden rounded-[1.75rem] border border-border [backface-visibility:hidden]">
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${zone.image})` }} />
                  <div className="absolute inset-0 bg-abyss/55" />
                  <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/35 to-abyss/70" />
                  <div className="absolute inset-x-0 top-0 p-6">
                    <h3 className="display text-xl font-semibold text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.8)]">
                      {zone.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,0.85)]">
                      {zone.blurb}
                    </p>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <span className="flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
                      <MapPin className="h-4 w-4" /> Navigate
                    </span>
                  </div>
                </div>

                {/* BACK — live data face */}
                <div className="absolute inset-0 flex flex-col justify-center gap-4 rounded-[1.75rem] border border-teal/40 bg-surface px-7 shadow-glow-teal [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <div>
                    <p className="display text-5xl font-semibold text-gradient-teal">{zone.metric}</p>
                    <p className="mt-1 text-xs uppercase tracking-wider text-muted">{zone.metricLabel}</p>
                  </div>
                  <div className="h-px w-full bg-border" />
                  <ul className="space-y-2.5">
                    {zone.facts.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-text">
                        <span className="h-1.5 w-1.5 flex-none rounded-full bg-tealGlow" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-tealGlow">
                    {zone.title}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* controls */}
      <div className="mt-10 flex items-center justify-center gap-6">
        <button onClick={() => go(-1)} aria-label="Previous" className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted transition hover:border-teal/50 hover:text-tealGlow">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex gap-2">
          {ZONES.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setFlipped(false);
                setActive(i);
              }}
              aria-label={`Go to zone ${i + 1}`}
              className={`h-2 rounded-full transition-all ${i === active ? "w-6 bg-tealGlow" : "w-2 bg-border"}`}
            />
          ))}
        </div>
        <button onClick={() => go(1)} aria-label="Next" className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted transition hover:border-teal/50 hover:text-tealGlow">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
