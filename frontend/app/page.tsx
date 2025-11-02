"use client";

import { Hero } from "@/components/Hero";
import { PropertyGrid } from "@/components/PropertyGrid";
import { TransactionHistory } from "@/components/TransactionHistory";
import { Footer } from "@/components/Footer";
import { NetworkWarning } from "@/components/NetworkWarning";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <div className="container max-w-6xl mx-auto px-4">
        <NetworkWarning />
      </div>
      <PropertyGrid />
      <TransactionHistory />
      <Footer />
    </div>
  );
}
