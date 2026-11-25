import type { Metadata } from "next";
import { ApplicantsPage } from "@/components/main/jobs/Employer";

export const metadata: Metadata = { title: "Applicants · FMD", robots: { index: false, follow: false } };
/** applicants load in the browser (sample data), so navigation into it isn't expected to be instant */
export const instant = false;

export default function Page() {
  return <ApplicantsPage />;
}
