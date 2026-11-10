import type { Metadata } from "next";
import { Suspense } from "react";
import { NewPostPage } from "@/components/main/explore/Create";

export const metadata: Metadata = { title: "Create a post · FMD", robots: { index: false, follow: false } };

// Suspense: the form starts a draft with a random id, which can't be prerendered; the build emits the placeholder
export default function Page() {
  return (
    <Suspense fallback={<div className="app-panel h-64 animate-pulse" aria-busy />}>
      <NewPostPage />
    </Suspense>
  );
}
