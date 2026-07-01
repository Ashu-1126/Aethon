"use client";
import { useEffect, useRef, useState } from "react";
import "./ParticleOrb.css";

/**
 * AETHON particle background — pure Canvas 2D, no dependencies.
 *
 * Lifecycle (infinite loop):
 *   scattered fragments → swirl + assemble into the AETHON hexagon logo
 *   → hold, breathing → morph into a rotating 3D particle orb
 *   → orb floats/pulses while stray particles break away and rejoin
 *   → dissolve outward → reassemble …
 *
 * Runs on all devices (lighter particle count on phones), pauses off-screen,
 * respects prefers-reduced-motion.
 */

// brand palette: teal core, deep-teal body, bright-teal + gold accents
const PALETTE = [
  { color: "54,233,210", weight: 0.4 }, // tealGlow
  { color: "31,184,166", weight: 0.3 }, // teal
  { color: "234,250,246", weight: 0.14 }, // warm-white highlight
  { color: "244,212,136", weight: 0.16 }, // gold sparkle
];

// timeline (ms)
const T_ASSEMBLE = 5000;
const T_LOGO = 4500;
const T_MORPH = 3200;
const T_ORB = 20000;
const T_DISSOLVE = 2800;
const CYCLE = T_ASSEMBLE + T_LOGO + T_MORPH + T_ORB + T_DISSOLVE;

const P_COUNT_DESKTOP = 1200;
const P_COUNT_MOBILE = 450;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

function pickColorIndex(): number {
  let r = Math.random();
  for (let i = 0; i < PALETTE.length; i++) {
    if (r < PALETTE[i].weight) return i;
    r -= PALETTE[i].weight;
  }
  return 0;
}

/** soft round glow sprite per palette color (drawImage is cheaper than per-particle gradients) */
function makeSprites(): HTMLCanvasElement[] {
  return PALETTE.map(({ color }) => {
    const s = document.createElement("canvas");
    s.width = s.height = 32;
    const g = s.getContext("2d")!;
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, `rgba(255,255,255,0.9)`);
    grad.addColorStop(0.25, `rgba(${color},0.8)`);
    grad.addColorStop(0.6, `rgba(${color},0.25)`);
    grad.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
    return s;
  });
}

/**
 * Generate evenly-distributed points filling a CIRCLE (sunflower / golden-angle
 * pattern), normalized + centered to [-0.5, 0.5]. Guarantees a clean round disc.
 */
function makeCirclePoints(count: number): Float32Array {
  const out = new Float32Array(count * 2);
  const R = 0.5; // fills the normalized space
  for (let i = 0; i < count; i++) {
    // sqrt distribution → uniform area density (no center clumping)
    const r = Math.sqrt((i + 0.5) / count) * R;
    const a = GOLDEN * i;
    out[i * 2] = Math.cos(a) * r;
    out[i * 2 + 1] = Math.sin(a) * r;
  }
  return out;
}

/**
 * Evenly-distributed points filling a regular HEXAGON (flat-top), normalized +
 * centered to roughly [-0.5, 0.5]. Uses the golden-angle spiral then clamps each
 * point inside the hexagon so the fill is dense and even.
 */
function makeHexPoints(count: number): Float32Array {
  const out = new Float32Array(count * 2);
  const R = 0.5;
  // half-plane normals of a pointy-top hexagon (6 edges)
  const edges: [number, number][] = [];
  for (let e = 0; e < 6; e++) {
    const a = (Math.PI / 3) * e + Math.PI / 6;
    edges.push([Math.cos(a), Math.sin(a)]);
  }
  const apothem = R * Math.cos(Math.PI / 6); // inradius
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt((i + 0.5) / count) * R;
    const a = GOLDEN * i;
    let x = Math.cos(a) * r;
    let y = Math.sin(a) * r;
    // pull any point outside the hexagon back onto its nearest edge
    for (const [nx, ny] of edges) {
      const dist = x * nx + y * ny;
      if (dist > apothem) {
        x -= (dist - apothem) * nx;
        y -= (dist - apothem) * ny;
      }
    }
    out[i * 2] = x;
    out[i * 2 + 1] = y;
  }
  return out;
}

export default function ParticleOrb({
  opacity = 0.6,
  scrollReactive = false,
}: {
  opacity?: number;
  /** When true, scroll velocity bursts the orb outward; it springs back on stop. */
  scrollReactive?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  // live scroll "energy" — spikes while scrolling, decays each frame to 0 on stop
  const scrollEnergy = useRef(0);
  // signed scroll direction (+down / -up) so the scatter reads as a travelling wave
  const scrollDir = useRef(0);
  // opacity multiplier that dims the orb as it leaves the hero (readability)
  const dimRef = useRef(1);
  // size multiplier — 1 over the hero, grows larger on the lower sections
  const growRef = useRef(1);
  // 0 over the hero → 1 on lower sections: morphs the orb from sphere to hexagon
  const hexRef = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) setEnabled(true);
  }, []);

  // measure scroll velocity + direction → scatter the orb into a travelling wave,
  // and dim it as it moves past the first viewport (readability on lower sections)
  useEffect(() => {
    if (!enabled || !scrollReactive) return;
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      // accumulate energy (clamped) + remember which way we're heading
      scrollEnergy.current = Math.min(scrollEnergy.current + Math.abs(delta) * 0.06, 6);
      if (delta !== 0) scrollDir.current = Math.sign(delta);
      // full strength over the hero, fading to ~40% once a full viewport down
      const vh = window.innerHeight || 800;
      dimRef.current = Math.max(0.4, 1 - y / vh);
      // 1x over the hero, growing up to ~1.7x as it travels down the page
      growRef.current = 1 + Math.min(y / vh, 1) * 0.7;
      // sphere over the hero → hexagon once ~60% of a viewport down
      hexRef.current = Math.min(Math.max((y / vh - 0.15) / 0.45, 0), 1);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled, scrollReactive]);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d")!;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    const N = isDesktop ? P_COUNT_DESKTOP : P_COUNT_MOBILE;
    const dpr = 1; // dim soft background — extra resolution invisible, costs 2-4x pixels
    let W = 0, H = 0, CX = 0, CY = 0, SCALE = 0;
    let raf = 0;
    let running = true;
    let visible = true;
    const logoPts: Float32Array = makeCirclePoints(N);
    const hexPts: Float32Array = makeHexPoints(N);
    const sprites = makeSprites();

    const resize = () => {
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      CX = W / 2;
      CY = isDesktop ? H / 2 : H * 0.5;
      SCALE = Math.min(W, H) * (isDesktop ? 1.05 : 1.2);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // ---- particles ----
    const px = new Float32Array(N);
    const py = new Float32Array(N);
    const vx = new Float32Array(N);
    const vy = new Float32Array(N);
    const size = new Float32Array(N);
    const ci = new Uint8Array(N);
    const sphX = new Float32Array(N);
    const sphY = new Float32Array(N);
    const sphZ = new Float32Array(N);
    const freeUntil = new Float32Array(N);
    const kicked = new Int32Array(N);

    for (let i = 0; i < N; i++) {
      px[i] = Math.random() * (W || 800);
      py[i] = Math.random() * (H || 600);
      vx[i] = (Math.random() - 0.5) * 0.6;
      vy[i] = (Math.random() - 0.5) * 0.6;
      size[i] = 1.4 + Math.random() * 2.4;
      ci[i] = pickColorIndex();
      const t = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - t * t));
      const th = GOLDEN * i;
      sphX[i] = Math.cos(th) * r;
      sphY[i] = t;
      sphZ[i] = Math.sin(th) * r;
      freeUntil[i] = 0;
      kicked[i] = -1;
    }

    // phase boundaries
    const A = T_ASSEMBLE;
    const B = A + T_LOGO;
    const C = B + T_MORPH;
    const D = C + T_ORB;

    const t0 = performance.now();
    let last = t0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!running || !visible) return;
      const dtRaw = now - last;
      last = now;
      const dt = Math.min(dtRaw, 50) / 16.667;

      const tc = (now - t0) % CYCLE;
      const cycleN = Math.floor((now - t0) / CYCLE);
      const tSec = now * 0.001;

      // scroll-scatter: read this frame's energy, then decay it toward 0 so the
      // orb re-gathers quickly (~0.5s) once scrolling stops
      const scatter = scrollEnergy.current;
      scrollEnergy.current *= Math.pow(0.86, dt);
      if (scrollEnergy.current < 0.01) scrollEnergy.current = 0;
      // dimming multiplier (1 = hero, fades on lower sections); only when reactive
      const dim = scrollReactive ? dimRef.current : 1;
      const grow = scrollReactive ? growRef.current : 1;
      const hex = scrollReactive ? hexRef.current : 0;

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";

      let env = 1;
      if (tc > D) env = 1 - ((tc - D) / T_DISSOLVE) * 0.65;
      else if (tc < A) env = 0.35 + (tc / A) * 0.65;

      const orbR = SCALE * 0.42 * grow * (1 + 0.035 * Math.sin(tSec * 1.1));
      const floatX = Math.sin(tSec * 0.31) * SCALE * 0.03;
      const floatY = Math.cos(tSec * 0.23) * SCALE * 0.045;
      const rotY = tSec * 0.28;
      const rotX = 0.42 + Math.sin(tSec * 0.17) * 0.12;
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);

      for (let i = 0; i < N; i++) {
        let k = 0, damp = 0.9, tx = 0, ty = 0, hasTarget = true;
        let depthAlpha = 1, depthSize = 1;

        if (tc < B && logoPts) {
          tx = CX + logoPts[i * 2] * SCALE;
          ty = CY + logoPts[i * 2 + 1] * SCALE;
          if (tc < A) {
            k = 0.012 + (tc / A) * 0.02;
            damp = 0.9;
            const dx = tx - px[i], dy = ty - py[i];
            const sw = 0.05 * (1 - tc / A);
            vx[i] += -dy * sw * 0.02 * dt;
            vy[i] += dx * sw * 0.02 * dt;
          } else {
            k = 0.04;
            damp = 0.82;
            tx += Math.sin(tSec * 1.4 + i * 0.37) * 1.6;
            ty += Math.cos(tSec * 1.1 + i * 0.61) * 1.6;
          }
        } else if (tc < D || !logoPts) {
          let x = sphX[i], y = sphY[i], z = sphZ[i];
          let x1 = x * cosY + z * sinY;
          let z1 = -x * sinY + z * cosY;
          let y1 = y * cosX - z1 * sinX;
          let z2 = y * sinX + z1 * cosX;
          const persp = 2.6 / (2.6 - z2 * 0.9);
          tx = CX + floatX + x1 * orbR * persp;
          ty = CY + floatY + y1 * orbR * persp;
          depthAlpha = 0.35 + ((z2 + 1) / 2) * 0.65;
          depthSize = 0.6 + persp * 0.5;

          // morph the 3D orb toward a flat 2D hexagon as we scroll down the page
          if (hex > 0) {
            const hxTarget = CX + floatX + hexPts[i * 2] * orbR * 2;
            const hyTarget = CY + floatY + hexPts[i * 2 + 1] * orbR * 2;
            tx += (hxTarget - tx) * hex;
            ty += (hyTarget - ty) * hex;
            // flatten depth cues as it becomes a 2D shape
            depthAlpha += (1 - depthAlpha) * hex;
            depthSize += (1 - depthSize) * hex;
          }

          const morphIn = tc < C ? (tc - B) / T_MORPH : 1;
          // stiffen the return spring while (and just after) scattering so the
          // orb snaps back springily in ~0.5s instead of drifting home slowly
          k = 0.02 + morphIn * 0.07 + Math.min(scatter, 3) * 0.05;
          damp = 0.8;

          if (tc >= C) {
            if (freeUntil[i] === 0 && Math.random() < 0.0006) {
              freeUntil[i] = now + 1200 + Math.random() * 2600;
              const ang = Math.random() * Math.PI * 2;
              const imp = 1.5 + Math.random() * 2.5;
              vx[i] += Math.cos(ang) * imp;
              vy[i] += Math.sin(ang) * imp;
            }
            if (freeUntil[i] > 0) {
              if (now < freeUntil[i]) {
                hasTarget = false;
                damp = 0.985;
              } else freeUntil[i] = 0;
            }
          }
        } else {
          hasTarget = false;
          damp = 0.97;
          if (kicked[i] !== cycleN) {
            kicked[i] = cycleN;
            const dx = px[i] - CX, dy = py[i] - CY;
            const d = Math.sqrt(dx * dx + dy * dy) || 1;
            const imp = 1 + Math.random() * 3;
            vx[i] += (dx / d) * imp + (Math.random() - 0.5) * 1.5;
            vy[i] += (dy / d) * imp + (Math.random() - 0.5) * 1.5;
          }
        }

        if (hasTarget) {
          vx[i] += (tx - px[i]) * k * dt;
          vy[i] += (ty - py[i]) * k * dt;
        }

        // scroll-driven turbulence: the orb bursts into a wave that travels WITH
        // the scroll. Radial scatter + swirl for chaos, plus a directional drag
        // biased opposite the scroll (particles stream past like a wake). When
        // scrolling stops, `scatter` fades and the spring pulls it back to shape.
        if (scatter > 0) {
          const dir = scrollDir.current;
          // DOMINANT directional stream — particles trail in the scroll direction
          // so the orb reads as a travelling WAVE (down scroll → wave streams up).
          // Per-particle spread (by x-position) gives the wave a crest.
          const lane = (px[i] - CX) / (SCALE || 1); // -0.5..0.5 across the orb
          vy[i] += dir * scatter * (1.8 + Math.cos(lane * Math.PI) * 0.9) * dt;
          // gentle lateral shear + light radial spread for organic wave texture
          vx[i] += Math.sin(tSec * 3 + lane * 6) * scatter * 0.35 * dt;
          const dx = px[i] - (CX + floatX);
          const d = Math.abs(dx) || 1;
          vx[i] += (dx / d) * scatter * 0.2 * dt;
        }

        const dampDt = Math.pow(damp, dt);
        vx[i] *= dampDt;
        vy[i] *= dampDt;
        px[i] += vx[i] * dt;
        py[i] += vy[i] * dt;

        const s = size[i] * depthSize;
        ctx.globalAlpha = Math.min(1, 0.62 * env * depthAlpha * dim);
        ctx.drawImage(sprites[ci[i]], px[i] - s, py[i] - s, s * 2, s * 2);
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    raf = requestAnimationFrame(frame);

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
      },
      { threshold: 0 }
    );
    io.observe(wrap);
    const onVis = () => {
      running = document.visibilityState === "visible";
      last = performance.now();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={wrapRef}
      className={`aethon-particle-bg${scrollReactive ? " aethon-particle-bg--fixed" : ""}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <div className="aethon-particle-ambient" />
      <canvas ref={canvasRef} />
    </div>
  );
}
