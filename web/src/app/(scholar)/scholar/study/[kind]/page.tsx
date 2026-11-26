import type { Metadata } from "next";
import { Suspense } from "react";
import { StudyPage } from "@/components/scholar/Study";

export const metadata: Metadata = { title: "Study · FMD Scholar", robots: { index: false, follow: false } };
/** data loads in the browser (demo storage), so navigation into it isn't expected to be instant */
export const instant = false;

export default function Page() {
  return (
    <Suspense fallback={<div className="h-40" aria-busy />}>
      <StudyPage />
    </Suspense>
  );
}
