import type { Metadata } from "next";
import { SyllabusPage } from "@/components/scholar/Syllabus";

export const metadata: Metadata = { title: "Syllabus · FMD Scholar", robots: { index: false, follow: false } };
/** the Scholar frame draws pages only once the student is known (data lives in the browser), so this isn't an instant route */
export const instant = false;

export default function Page() {
  return <SyllabusPage />;
}
