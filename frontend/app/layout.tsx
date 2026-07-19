import type { Metadata } from "next";
import "./globals.css";
import { Aurora } from "@/components/motion/Aurora";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "AETHON — Unified Asset & Operations Brain",
  description:
    "Industrial Knowledge Intelligence. Every drawing, manual, procedure and incident — fused into one cited, queryable brain.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="font-sans antialiased">
        <Aurora />
        <ScrollProgress />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
