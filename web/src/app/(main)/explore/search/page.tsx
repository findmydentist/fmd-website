import type { Metadata } from "next";
import { Suspense } from "react";
import { DiscoverPage } from "@/components/main/explore/Discover";

export const metadata: Metadata = { title: "Discover · Explore · FMD", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense fallback={<div className="card h-48 animate-pulse" aria-busy />}>
      <DiscoverPage />
    </Suspense>
  );
}
