import type { Metadata } from "next";
import { VivaSetup } from "@/components/scholar/Viva";

export const metadata: Metadata = { title: "Viva practice · FMD Scholar", robots: { index: false, follow: false } };
/** the Scholar frame draws pages only once the signed-in student is known (data lives in the browser), so this isn't an instant route */
export const instant = false;

export default function Page() {
  return <VivaSetup />;
}
