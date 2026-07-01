import React from "react";
import { Hexagon } from "lucide-react";

interface PageHeroProps {
  badgeText: string;
  badgeLabel: string;
  title1: string;
  title2: string;
  description: string;
}

export function PageHero({ badgeText, badgeLabel, title1, title2, description }: PageHeroProps) {
  return (
    <div className="relative w-full min-h-[46vh] flex flex-col justify-center overflow-hidden">
      {/* backdrop (wash, flare, watermark, lasers) is provided page-wide by
          PageContainer's <AmbientBackground /> so it flows seamlessly below. */}

      {/* Main Content Container */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-12 flex flex-col md:flex-row items-center pt-14 pb-12 sm:pt-20 sm:pb-16">
        <div className="w-full md:w-[70%] flex flex-col items-start gap-4 sm:gap-6">
          {/* Eyebrow — hexagon + spaced mono uppercase (matches Copilot) */}
          <div className="flex items-center gap-2 font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.25em] text-tealGlow">
            <Hexagon className="h-3.5 w-3.5 flex-none" strokeWidth={1.6} />
            {badgeLabel.replace(/[✦✧*]/g, "").trim()} · {badgeText}
          </div>

          {/* Headline */}
          <h1 className="display text-[2.5rem] leading-[1.05] sm:text-6xl lg:text-[5.5rem] font-semibold tracking-tight">
            <span className="block text-text drop-shadow-md">{title1}</span>
            <span className="block text-gradient-teal mt-2">
              {title2}
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-[17px] text-muted max-w-xl leading-relaxed mt-2">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
