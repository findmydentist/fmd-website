"use client";

import Link from "next/link";
import { Sheet } from "@/components/app/Sheet";
import { initials } from "@/lib/fmd";
import { Ring } from "../../explore/Explore";
import { StoryViewer } from "../../explore/Stories";
import { LayoutPicker, useProfileLayout } from "../../ProfileLayout";
import { FbInstaLayout } from "./FbInstaLayout";
import { InstaLayout } from "./InstaLayout";
import { useAccountProfile } from "./useAccountProfile";

/**
 * /account: your profile. The data comes from useAccountProfile; how it looks is one of two layouts, picked from the
 * dropdown (layout 1 InstaLayout.tsx, layout 2 FbInstaLayout.tsx). Changes to your details live in /account/settings.
 */
export function AccountProfile() {
  const v = useAccountProfile();
  const [layout, pickLayout] = useProfileLayout();
  if (!v) return <div className="app-panel h-40 animate-pulse" aria-busy />;

  return (
    <div className="grid gap-3">
      <h1 className="sr-only">Your profile</h1>
      {/* the link keeps the pick (?layout=), so each can be shared and compared */}
      <div className="mx-auto flex w-full max-w-[1128px] justify-end">
        <LayoutPicker value={layout} onChange={pickLayout} />
      </div>
      <div key={layout} className="fmd-enter">
        {layout === "insta" ? <InstaLayout v={v} /> : <FbInstaLayout v={v} />}
      </div>

      {v.watching && <StoryViewer stories={v.watching.list} start={v.watching.start} onClose={v.closeStory} onSeen={v.markSeen} />}
      {v.showFollowing && (
        <Sheet title="Following" onClose={v.closeFollowing}>
          {v.follows.length ? (
            <ul className="grid gap-1">
              {v.follows.map((a) => (
                <li key={a.id}>
                  <Link href={`/dentists/${a.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[var(--surface-glass)]">
                    <Ring>
                      <span className="grid size-10 place-items-center rounded-full bg-[var(--surface-elevated)] text-[12px] font-semibold text-ink">{initials(a.name)}</span>
                    </Ring>
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate text-[14px] font-semibold text-ink">{a.name}</span>
                      <span className="block truncate text-[12.5px] text-ink-3">{a.specialty}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-ink-3">You don&apos;t follow anyone yet. Follow dentists from their posts in Explore or their profiles.</p>
          )}
        </Sheet>
      )}
    </div>
  );
}
