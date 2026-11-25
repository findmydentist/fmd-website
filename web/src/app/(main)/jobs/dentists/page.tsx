import type { Metadata } from "next";
import { Suspense } from "react";
import { SpaceBoard } from "@/components/main/jobs/Board";

export const metadata: Metadata = { title: "Dentist roles · Jobs · FMD" };

export default function Page() {
  return (
    <Suspense fallback={<div className="card h-48 animate-pulse" aria-busy />}>
      <SpaceBoard space="dentist" />
    </Suspense>
  );
}
