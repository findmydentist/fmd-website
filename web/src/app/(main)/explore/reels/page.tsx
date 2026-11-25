import type { Metadata } from "next";
import { ClipsPage } from "@/components/main/explore/Clips";

export const metadata: Metadata = { title: "Clips · Explore · FMD", robots: { index: false, follow: false } };
/** clips load in the browser (sample data), so navigation into it isn't expected to be instant */
export const instant = false;

export default function Page() {
  return <ClipsPage />;
}
