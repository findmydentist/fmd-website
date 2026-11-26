import type { Metadata } from "next";
import { DeckPage } from "@/components/scholar/DeckEditor";

export const metadata: Metadata = { title: "Presentation · FMD Scholar", robots: { index: false, follow: false } };
/** data loads in the browser (demo storage), so navigation into it isn't expected to be instant */
export const instant = false;

export default function Page() {
  return <DeckPage />;
}
