"use client";
import { motion } from "framer-motion";

/** Living cinematic background — drifting aurora blobs + faint grid + vignette. */
export function Aurora() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-base">
      <div className="absolute inset-0 grid-bg opacity-60" />
      <motion.div
        className="aurora absolute -left-40 -top-40 h-[42rem] w-[42rem] rounded-full"
        animate={{ x: [0, 80, 0], y: [0, 50, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="aurora absolute right-[-12rem] top-1/3 h-[34rem] w-[34rem] rounded-full opacity-70"
        animate={{ x: [0, -60, 0], y: [0, 70, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="aurora absolute bottom-[-14rem] left-1/3 h-[40rem] w-[40rem] rounded-full opacity-50"
        animate={{ x: [0, 50, 0], y: [0, -40, 0], scale: [1.1, 1, 1.1] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,#03100f_100%)]" />
    </div>
  );
}
