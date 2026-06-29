import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Stats } from "@/components/landing/Stats";
import { Features } from "@/components/landing/Features";
import { Showcase } from "@/components/landing/Showcase";
import { CTA, Footer } from "@/components/landing/CTA";

export default function Home() {
  return (
    <main className="relative">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <Showcase />
      <CTA />
      <Footer />
    </main>
  );
}
