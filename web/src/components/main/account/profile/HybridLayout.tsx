"use client";

import { Bookmark, LayoutGrid, Pencil, Settings, SquarePlay, SquarePen, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { initials } from "@/lib/fmd";
import { PostFeed } from "../../explore/Explore";
import { CoverEdit } from "../../CoverPhoto";
import { PostGrid } from "../../PostGrid";
import { ProfilePostsSkeleton } from "../../Skeletons";
import { Highlights, hy, HybridHeader, HybridTabs, Stat, type Trust } from "../../ProfileHybrid";
import { ViewToggle, type PostView } from "../../ProfileLayout";
import { fbCard, FollowingCard, GetVerified, HIGHLIGHTS, Intro, OwnGrid, RoleTags, SavedPanel } from "./parts";
import type { AccountView, Grid } from "./useAccountProfile";

const TABS = [
  ["posts", "Posts", LayoutGrid],
  ["reels", "Videos", SquarePlay],
  ["saved", "Saved", Bookmark],
  ["about", "About", UserRound],
] as const;
type Tab = (typeof TABS)[number][0];

/**
 * Layout 3, Instagram + Facebook refined: one header (photo in its verification ring, one primary action, counts, bio,
 * highlights), a sticky labelled tab bar, and on wide screens Facebook's Intro and Following beside the posts.
 */
export function HybridLayout({ v }: { v: AccountView }) {
  const { me, mine, savedPosts, savedDentists, follows, accountType, certificate, seen, headline, clinic, canPost, loadPosts, openHighlight, openFollowing } = v;
  const [tab, setTab] = useState<Tab>("posts");
  const [view, setView] = useState<PostView>("grid");
  const dp = me.dentist_profile;
  const trust: Trust = dp?.verification_status === "verified" ? "verified" : dp?.verification_status === "pending" ? "pending" : null;
  const posts = tab === "saved" ? savedPosts : tab === "reels" ? (mine?.filter((x) => x.kind === "video") ?? null) : mine;
  const grid: Grid = tab === "about" ? "posts" : tab;

  return (
    <div className="mx-auto grid w-full max-w-[1100px] grid-cols-1 gap-4">
      <HybridHeader
        trust={trust}
        cover={v.cover}
        coverEdit={<CoverEdit has={!!v.cover} onPick={v.pickCover} onRemove={v.dropCover} />}
        photo={<span className="grid size-[112px] place-items-center rounded-full bg-[var(--surface-elevated)] text-[36px] font-semibold text-ink sm:size-[144px] sm:text-[44px]">{initials(me.full_name)}</span>}
        title={<h2 className="text-[28px] font-bold leading-tight tracking-[-0.01em] text-ink sm:text-[30px]">{me.full_name}</h2>}
        role={<RoleTags me={me} accountType={accountType} />}
        headline={[me.dentist_profile?.specialisation, clinic?.clinic_name, me.city].filter(Boolean).join(", ") || headline} // the role is in its pill above
        actions={
          <>
            {/* one primary action: share something if you can post, otherwise finish your profile */}
            {canPost ? (
              <Link href="/explore/new" className={`${hy.primary} flex-1 sm:flex-none`}>
                <SquarePen aria-hidden className="size-[18px]" strokeWidth={2} /> New post
              </Link>
            ) : (
              <Link href="/account/settings" className={`${hy.primary} flex-1 sm:flex-none`}>
                <Pencil aria-hidden className="size-[18px]" strokeWidth={2} /> Edit profile
              </Link>
            )}
            {canPost && (
              <Link href="/account/settings" className={`${hy.secondary} flex-1 sm:flex-none`}>
                <Pencil aria-hidden className="size-[18px]" strokeWidth={2} /> Edit profile
              </Link>
            )}
            <Link href="/account/settings" aria-label="Settings" title="Settings" className={hy.icon}>
              <Settings aria-hidden className="size-5" strokeWidth={1.9} />
            </Link>
          </>
        }
        stats={
          <>
            <Stat n={mine?.length ?? "–"} label={mine?.length === 1 ? "post" : "posts"} onClick={() => setTab("posts")} />
            <Stat n={follows.length} label="following" onClick={openFollowing} />
            <Stat n={savedPosts?.length ?? "–"} label="saved" onClick={() => setTab("saved")} />
            <Stat n={savedDentists} label="saved dentists" href="/saved" />
          </>
        }
        highlights={
          <Highlights
            label="Highlights"
            items={HIGHLIGHTS.map((h, i) => ({
              key: h.id,
              name: h.name,
              seen: seen.includes(h.id),
              onClick: () => openHighlight(i),
              face: <Image src={h.photo!} alt="" fill sizes="64px" className="object-cover object-[center_20%]" />,
            }))}
          />
        }
        tabs={<HybridTabs tabs={TABS} value={tab} onChange={setTab} right={tab !== "about" && posts && posts.length > 0 ? <ViewToggle value={view} onChange={setView} /> : undefined} />}
      />

      <GetVerified me={me} accountType={accountType} certificate={certificate} />

      {tab === "about" ? (
        <div key="about" className="fmd-enter mx-auto grid w-full max-w-[680px] gap-4">
          <Intro v={v} />
          <FollowingCard v={v} />
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          {/* Facebook's side column, on wide screens */}
          <div className="hidden gap-4 lg:sticky lg:top-[152px] lg:grid">
            <Intro v={v} />
            <FollowingCard v={v} />
          </div>
          <div key={`${tab}-${view}`} role="tabpanel" className="fmd-enter grid min-w-0 gap-3">
            {posts && posts.length > 0 && (
              <div className="flex justify-end sm:hidden">
                <ViewToggle value={view} onChange={setView} />
              </div>
            )}
            {!posts ? (
              <ProfilePostsSkeleton />
            ) : !posts.length ? (
              <div className={fbCard}>{grid === "saved" ? <SavedPanel posts={savedPosts} /> : <OwnGrid me={me} posts={[]} reels={grid === "reels"} />}</div>
            ) : view === "grid" ? (
              <PostGrid posts={posts} square />
            ) : (
              <PostFeed posts={posts} userId={me.id} onChange={loadPosts} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
