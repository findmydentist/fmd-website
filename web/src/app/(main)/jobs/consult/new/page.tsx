import type { Metadata } from "next";
import { Suspense } from "react";
import { CaseForm } from "@/components/main/jobs/Consult";

export const metadata: Metadata = { title: "Post a case · Jobs · FMD" };

export default function Page() {
  return (
    <Suspense fallback={<div className="card h-48 animate-pulse" aria-busy />}>
      <CaseForm />
    </Suspense>
  );
}
