import type { Metadata } from "next";
import { ApplicationsPage } from "@/components/main/jobs/Career";

export const metadata: Metadata = { title: "Your applications · FMD", robots: { index: false, follow: false } };
/** applications load in the browser (sample data), so navigation into it isn't expected to be instant */
export const instant = false;

export default function Page() {
  return <ApplicationsPage />;
}
