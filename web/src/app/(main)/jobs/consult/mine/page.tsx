import type { Metadata } from "next";
import { Suspense } from "react";
import { ConsultMine } from "@/components/main/jobs/Consult";

export const metadata: Metadata = { title: "My consultations · Jobs · FMD" };

export default function Page() {
  return (
    <Suspense fallback={<div className="card h-48 animate-pulse" aria-busy />}>
      <ConsultMine />
    </Suspense>
  );
}
