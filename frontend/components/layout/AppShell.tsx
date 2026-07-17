"use client";
import { ReactNode } from "react";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { PageTransition } from "@/components/motion/PageTransition";

import { ProtectedRoute } from "./ProtectedRoute";

/** Client wrapper so the root layout can stay a server component (keeps metadata). */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <OfflineBanner />
      <PageTransition>{children}</PageTransition>
    </ProtectedRoute>
  );
}
