import type { Metadata } from "next";
import { Suspense } from "react";
import { CareerProfilePage } from "@/components/main/jobs/Career";

export const metadata: Metadata = { title: "Career profile · FMD", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense fallback={<div className="card h-96 animate-pulse" aria-busy />}>
      <CareerProfilePage />
    </Suspense>
  );
}
