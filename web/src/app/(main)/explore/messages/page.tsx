import type { Metadata } from "next";
import { Messages } from "@/components/main/explore/Messages";

export const metadata: Metadata = { title: "Messages · FMD", robots: { index: false, follow: false } };

/** Direct messages on phones (the bottom tab bar's Messages tab); it fills the screen above the tab bar, no page scroll. */
export default function Page() {
  return (
    <div className="mx-auto w-full max-w-[560px]">
      <Messages className="h-[calc(100dvh-12.5rem-env(safe-area-inset-bottom))] min-h-[380px] lg:h-[calc(100dvh-8.75rem)]" />
    </div>
  );
}
