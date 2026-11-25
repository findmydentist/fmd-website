import type { Metadata } from "next";
import { TopicPage } from "@/components/main/explore/Topic";

export const metadata: Metadata = { title: "Topic · Explore · FMD", robots: { index: false, follow: false } };
/** data loads in the browser (demo content), so navigation into it isn't expected to be instant */
export const instant = false;

export default function Page() {
  return <TopicPage />;
}
