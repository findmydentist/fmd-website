import type { Metadata } from "next";
import { Suspense } from "react";
import { AskPage } from "@/components/scholar/Ask";

export const metadata: Metadata = { title: "Ask · FMD Scholar", robots: { index: false, follow: false } };
/** the Scholar frame draws pages only once the signed-in student is known (data lives in the browser), so this isn't an instant route */
export const instant = false;

export default function Page() {
  return (
    <Suspense fallback={<div className="h-40" aria-busy />}>
      <AskPage />
    </Suspense>
  );
}
