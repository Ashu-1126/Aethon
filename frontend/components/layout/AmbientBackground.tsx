/**
 * AmbientBackground — the shared AETHON page backdrop: deep teal wash, a
 * teal-core/gold-halo flare from the right, a centered AETHON watermark, and
 * teal→gold laser streaks. Rendered ONCE behind a whole page (hero + content)
 * so there's a single continuous surface with no seam.
 *
 * Pin it to the page zone that has the hero via `heroZone` (a viewport height,
 * e.g. "46vh") so the flare + watermark sit inside the hero and gently fade
 * as the content scrolls past.
 */
export function AmbientBackground({ heroZone = "46vh" }: { heroZone?: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* deep teal base wash */}
      <div className="absolute inset-0 bg-radial-teal" />

      {/* right-side flare — teal core, gold halo, anchored to the hero zone */}
      <div
        className="absolute right-0 w-[80vw] h-[150vh] -translate-y-1/2 opacity-60 mix-blend-screen"
        style={{
          top: heroZone,
          background:
            'radial-gradient(ellipse at right center, rgba(54, 233, 210, 0.28) 0%, rgba(217, 177, 94, 0.12) 38%, transparent 72%)',
        }}
      />
      <div
        className="absolute right-0 w-[50vw] h-[100vh] -translate-y-1/2 opacity-70 mix-blend-screen"
        style={{
          top: heroZone,
          background:
            'radial-gradient(ellipse at right center, rgba(244, 212, 136, 0.5) 0%, rgba(54, 233, 210, 0.16) 28%, transparent 62%)',
        }}
      />

      {/* Giant Watermark — centered in the hero zone */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-[22vw] font-black tracking-tighter text-tealGlow/[0.03] whitespace-nowrap"
        style={{ top: heroZone }}
      >
        AETHON
      </div>

      {/* Laser lines — teal→gold gradient, span the full page height */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.4 }}>
        <defs>
          <linearGradient id="ambientLaser" x1="1" y1="0.5" x2="0" y2="0.5">
            <stop offset="0%" stopColor="#36e9d2" stopOpacity="0.7" />
            <stop offset="55%" stopColor="#f4d488" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f4d488" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="100%" y1="6%" x2="20%" y2="0%" stroke="url(#ambientLaser)" strokeWidth="0.5" />
        <line x1="100%" y1="16%" x2="0%" y2="10%" stroke="url(#ambientLaser)" strokeWidth="1.5" />
        <line x1="100%" y1="28%" x2="30%" y2="58%" stroke="url(#ambientLaser)" strokeWidth="0.5" />
        <line x1="100%" y1="44%" x2="50%" y2="80%" stroke="url(#ambientLaser)" strokeWidth="0.5" />
        <line x1="100%" y1="68%" x2="0%" y2="92%" stroke="url(#ambientLaser)" strokeWidth="1" />
        <line x1="90%" y1="0%" x2="60%" y2="100%" stroke="url(#ambientLaser)" strokeWidth="0.5" />
      </svg>
    </div>
  );
}
