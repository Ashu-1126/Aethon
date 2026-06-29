"use client";
import { motion, useScroll, useSpring } from "framer-motion";

/** Gold scroll-progress beam fixed to the top of the viewport. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 25 });
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed left-0 top-0 z-[90] h-[2px] w-full origin-left bg-gradient-to-r from-teal via-tealGlow to-gold shadow-glow-teal"
    />
  );
}
