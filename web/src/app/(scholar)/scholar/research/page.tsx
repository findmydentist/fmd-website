import type { Metadata } from "next";
import { ResearchList } from "@/components/scholar/Research";

export const metadata: Metadata = { title: "Research · FMD Scholar", robots: { index: false, follow: false } };
/** the Scholar frame draws pages only once the signed-in student is known (data lives in the browser), so this isn't an instant route */
export const instant = false;

export default function Page() {
  return <ResearchList />;
}
