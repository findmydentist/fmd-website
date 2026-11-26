import type { Metadata } from "next";
import { ProjectPage } from "@/components/scholar/Project";

export const metadata: Metadata = { title: "Project · FMD Scholar", robots: { index: false, follow: false } };
/** data loads in the browser (demo storage), so navigation into it isn't expected to be instant */
export const instant = false;

export default function Page() {
  return <ProjectPage />;
}
