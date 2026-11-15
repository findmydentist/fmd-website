import type { Metadata } from "next";
import { Suspense } from "react";
import { DentistSearch } from "@/components/main/dentists/Search";
import { DentistSearchSkeleton } from "@/components/main/Skeletons";

// demo directory for now: kept out of search engines until real profiles are listed
export const metadata: Metadata = { title: "Find a dentist · FMD", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense fallback={<DentistSearchSkeleton />}>
      <DentistSearch />
    </Suspense>
  );
}
