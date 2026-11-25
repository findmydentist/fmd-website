import { redirect } from "next/navigation";

/** Chats moved to /messages (one inbox for Explore and Jobs); old links land there. */
export default function Page() {
  redirect("/messages");
}
