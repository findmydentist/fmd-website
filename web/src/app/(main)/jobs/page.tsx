import type { Metadata } from "next";
import { Suspense } from "react";
import { JobsLanding } from "@/components/main/jobs/Board";

export const metadata: Metadata = { title: "Dental jobs · FMD" };

export default function Page() {
  return (
    <Suspense fallback={<div className="app-panel h-48 animate-pulse" aria-busy />}>
      <JobsLanding />
    </Suspense>
  );
}
