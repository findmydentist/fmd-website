import type { Metadata } from "next";
import { Suspense } from "react";
import { SpaceBoard } from "@/components/main/jobs/Board";

export const metadata: Metadata = { title: "Clinic team · Jobs · FMD" };

export default function Page() {
  return (
    <Suspense fallback={<div className="card h-48 animate-pulse" aria-busy />}>
      <SpaceBoard space="team" />
    </Suspense>
  );
}
