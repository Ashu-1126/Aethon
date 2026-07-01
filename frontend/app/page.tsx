import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Stats } from "@/components/landing/Stats";
import { Features } from "@/components/landing/Features";
import { OverviewDemo } from "@/components/landing/OverviewDemo";
import { CarouselSection } from "@/components/landing/CarouselSection";
import { Showcase } from "@/components/landing/Showcase";
import { CTA, Footer } from "@/components/landing/CTA";

export default function Home() {
  return (
    <main className="relative">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <OverviewDemo />
      <CarouselSection />
      <Showcase />
      <CTA />
      <Footer />
    </main>
  );
}
