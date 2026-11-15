import type { Metadata } from "next";
import { Suspense } from "react";
import { ExplorePage } from "@/components/main/explore/Explore";
import { ExploreSkeleton } from "@/components/main/Skeletons";

export const metadata: Metadata = { title: "Explore · FMD", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense fallback={<ExploreSkeleton />}>
      <ExplorePage />
    </Suspense>
  );
}
