import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AmbientBackground } from "./AmbientBackground";

/**
 * Standard app-page shell.
 * - Offsets for the desktop sidebar (md:ml-60) and the mobile top bar (pt-14).
 * - Consistent responsive max-width + padding so every page aligns identically
 *   (fixes the off-center / inconsistent-width desktop issues).
 */
export function PageContainer({
  children,
  hero,
  size = "wide",
  flush = false,
  className,
}: {
  children: ReactNode;
  hero?: ReactNode;
  size?: "wide" | "narrow" | "chat";
  flush?: boolean; // for flex column pages (copilot)
  className?: string;
}) {
  const max =
    size === "narrow"
      ? "max-w-5xl"
      : size === "chat"
        ? "max-w-3xl"
        : "max-w-6xl 2xl:max-w-7xl";
  return (
    <main
      className={cn(
        "relative min-h-screen pt-14 md:ml-60 md:pt-0",
        hero && "bg-abyss",
        flush && "flex flex-col"
      )}
    >
      {/* one continuous ambient backdrop shared by the hero AND the content */}
      {hero && <AmbientBackground />}

      {hero && <div className="relative z-10">{hero}</div>}
      <div
        className={cn(
          "relative z-10 mx-auto w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-10",
          max,
          flush && "flex flex-1 flex-col",
          className
        )}
      >
        {children}
      </div>
    </main>
  );
}
