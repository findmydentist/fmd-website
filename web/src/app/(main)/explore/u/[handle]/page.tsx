import type { Metadata } from "next";
import { ProfilePage } from "@/components/main/explore/Profile";

export const metadata: Metadata = { title: "Profile · Explore · FMD", robots: { index: false, follow: false } };
/** profiles load in the browser (sample data), so navigation into it isn't expected to be instant */
export const instant = false;

export default function Page() {
  return <ProfilePage />;
}
