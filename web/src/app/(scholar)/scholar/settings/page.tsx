import type { Metadata } from "next";
import { SettingsPage } from "@/components/scholar/Settings";

export const metadata: Metadata = { title: "Settings · FMD Scholar", robots: { index: false, follow: false } };
/** the Scholar frame draws pages only once the signed-in student is known (data lives in the browser), so this isn't an instant route */
export const instant = false;

export default function Page() {
  return <SettingsPage />;
}
