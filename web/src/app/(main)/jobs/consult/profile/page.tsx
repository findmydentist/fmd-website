import type { Metadata } from "next";
import { Suspense } from "react";
import { ListingForm } from "@/components/main/jobs/Consult";

export const metadata: Metadata = { title: "Your consultant listing · Jobs · FMD" };

export default function Page() {
  return (
    <Suspense fallback={<div className="card h-48 animate-pulse" aria-busy />}>
      <ListingForm />
    </Suspense>
  );
}
