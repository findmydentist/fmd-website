import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Messages } from "@/components/main/explore/Messages";

export const metadata: Metadata = { title: "Messages · FMD", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <div className="mx-auto grid w-full max-w-[560px] gap-4">
      <Link href="/explore" className="inline-flex w-fit items-center gap-1.5 text-[14px] text-ink-3 hover:text-ink">
        <ArrowLeft className="size-4" strokeWidth={1.5} /> Explore
      </Link>
      <Messages className="h-[calc(100dvh-14rem)] min-h-[420px]" />
    </div>
  );
}
