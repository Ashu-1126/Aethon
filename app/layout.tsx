import type { Metadata } from "next";
import "./globals.css";
import { Aurora } from "@/components/motion/Aurora";
import { ScrollProgress } from "@/components/motion/ScrollProgress";

export const metadata: Metadata = {
  title: "AETHON — Unified Asset & Operations Brain",
  description:
    "Industrial Knowledge Intelligence. Every drawing, manual, procedure and incident — fused into one cited, queryable brain.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Aurora />
        <ScrollProgress />
        {children}
      </body>
    </html>
  );
}
