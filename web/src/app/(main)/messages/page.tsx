import type { Metadata } from "next";
import { MessagesPage } from "@/components/main/messages/Messages";

export const metadata: Metadata = { title: "Chats · FMD", robots: { index: false, follow: false } };
/** chats load in the browser (sample data), so navigation into it isn't expected to be instant */
export const instant = false;

export default function Page() {
  return <MessagesPage />;
}
