"use client";

import { Bookmark, Building2, Camera, Grid3x3, MapPin, Pencil, Settings, SquarePlay, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { initials } from "@/lib/fmd";
import { PostFeed } from "../../explore/Explore";
import { PostGrid } from "../../PostGrid";
import { ViewToggle, type PostView } from "../../ProfileLayout";
import { fbBlue, fbCard, fbGrey, FollowingCard, GetVerified, HIGHLIGHTS, Intro, OwnGrid, SavedPanel, VerifiedTick, VerifyBadges } from "./parts";
import type { AccountView, Grid } from "./useAccountProfile";

/**
 * Layout 2, Facebook + Instagram: Facebook's cover, tab bar and Intro column; Instagram's ringed photo, counts, bio,
 * highlights and square post grid, or Facebook's full posts with the grid/list switch.
 */
export function FbInstaLayout({ v }: { v: AccountView }) {
  const { me, mine, savedPosts, savedDentists, follows, accountType, certificate, seen, headline, clinic, canPost, loadPosts, openHighlight, openFollowing } = v;
  const [grid, setGrid] = useState<Grid>("posts");
  const [mixView, setMixView] = useState<PostView>("grid");
  const [mixAbout, setMixAbout] = useState(false);
  const mixPosts = grid === "saved" ? savedPosts : grid === "reels" ? (mine?.filter((x) => x.kind === "video") ?? null) : mine;
  const mixStat = "text-[14px] text-ink-3 hover:text-ink sm:text-[15px]";
  const MIX_TABS = [
    ["posts", "Posts", Grid3x3],
    ["reels", "Videos", SquarePlay],
    ["saved", "Saved", Bookmark],
    ["about", "About", UserRound],
  ] as const;
  return (
    <div className="mx-auto grid w-full max-w-[1100px] grid-cols-1 gap-4">
      <header className="-mx-4 overflow-hidden bg-[var(--surface)] sm:mx-0 sm:rounded-2xl sm:border sm:border-line">
        <div className="relative h-[150px] bg-[linear-gradient(120deg,rgba(59,130,246,0.5),rgba(139,92,246,0.35)_45%,rgba(236,72,153,0.25)_75%,rgba(34,211,238,0.25))] sm:h-[240px]">
          <Link href="/account/settings" className={`${fbGrey} absolute bottom-3 right-3 bg-black/50 text-white hover:bg-black/60`}>
            <Camera className="size-4" strokeWidth={2} /> <span className="hidden sm:inline">Edit cover</span>
          </Link>
        </div>
        <div className="px-4 pb-4 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
            <button type="button" onClick={() => openHighlight(0)} aria-label="Your highlights" className="relative z-10 -mt-[60px] w-fit rounded-full sm:-mt-[72px]">
              <span className="block rounded-full bg-[linear-gradient(135deg,#60a5fa,#8b5cf6,#ec4899)] p-[3px]">
                <span className="block rounded-full bg-[var(--surface)] p-[3px]">
                  <span className="grid size-[112px] place-items-center rounded-full bg-[var(--surface-elevated)] text-[36px] font-semibold text-ink sm:size-[136px] sm:text-[42px]">{initials(me.full_name)}</span>
                </span>
              </span>
            </button>
            <div className="grid min-w-0 flex-1 gap-2 sm:pb-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h2 className="flex items-center gap-2 text-[24px] font-bold leading-tight text-ink sm:text-[28px]">
                  {me.full_name}
                  <VerifiedTick me={me} />
                </h2>
                <VerifyBadges v={v} />
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <button type="button" onClick={() => (setMixAbout(false), setGrid("posts"))} className={mixStat}>
                  <b className="font-semibold text-ink">{mine?.length ?? "–"}</b> posts
                </button>
                <button type="button" onClick={openFollowing} className={mixStat}>
                  <b className="font-semibold text-ink">{follows.length}</b> following
                </button>
                <button type="button" onClick={() => (setMixAbout(false), setGrid("saved"))} className={mixStat}>
                  <b className="font-semibold text-ink">{savedPosts?.length ?? "–"}</b> saved
                </button>
                <Link href="/saved" className={mixStat}>
                  <b className="font-semibold text-ink">{savedDentists}</b> saved dentists
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:pb-1">
              <Link href={canPost ? "/explore/new" : "/account/settings"} className={`${fbBlue} flex-1 sm:flex-none`}>
                {canPost ? (
                  <>
                    <SquarePlay className="size-4" strokeWidth={2} /> Add post
                  </>
                ) : (
                  <>
                    <Pencil className="size-4" strokeWidth={2} /> Edit profile
                  </>
                )}
              </Link>
              {canPost && (
                <Link href="/account/settings" className={`${fbGrey} flex-1 sm:flex-none`}>
                  <Pencil className="size-4" strokeWidth={2} /> Edit profile
                </Link>
              )}
              <Link href="/account/settings" aria-label="Settings" title="Settings" className={fbGrey}>
                <Settings className="size-4" strokeWidth={2} />
              </Link>
            </div>
          </div>
          {/* the bio, as on Instagram */}
          <div className="mt-3 grid gap-0.5 text-[14.5px] text-ink-2">
            <p className="font-semibold text-ink">{headline}</p>
            {me.city && (
              <p className="flex items-center gap-1.5">
                <MapPin className="size-4 text-ink-3" strokeWidth={1.75} /> {me.city}
              </p>
            )}
            {clinic && (
              <p className="flex items-center gap-1.5">
                <Building2 className="size-4 text-ink-3" strokeWidth={1.75} /> {clinic.clinic_name}
              </p>
            )}
          </div>
          {/* highlights */}
          <ul aria-label="Highlights" className="-mx-4 mt-4 flex gap-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
            {HIGHLIGHTS.map((h, i) => (
              <li key={h.id} className="shrink-0">
                <button type="button" onClick={() => openHighlight(i)} className="grid w-[72px] justify-items-center gap-1.5 text-center" aria-label={`Highlight: ${h.name}`}>
                  <span className={`block rounded-full p-[2.5px] ${seen.includes(h.id) ? "bg-[var(--border-strong)]" : "bg-[linear-gradient(135deg,#60a5fa,#8b5cf6,#ec4899)]"}`}>
                    <span className="block rounded-full bg-[var(--surface)] p-[2.5px]">
                      <span className="relative block size-[60px] overflow-hidden rounded-full bg-[var(--surface-elevated)]">
                        <Image src={h.photo!} alt="" fill sizes="64px" className="object-cover object-[center_20%]" />
                      </span>
                    </span>
                  </span>
                  <span className="w-full truncate text-[12px] font-medium text-ink-2">{h.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {/* the tab bar: Facebook's place, Instagram's icons */}
        <div className="flex items-center justify-between gap-2 border-t border-line px-2 sm:px-6">
          <div role="tablist" aria-label="Profile" className="flex overflow-x-auto [scrollbar-width:none]">
            {MIX_TABS.map(([t, label, Icon]) => {
              const on = t === "about" ? mixAbout : !mixAbout && grid === t;
              return (
                <button
                  key={t}
                  role="tab"
                  aria-selected={on}
                  aria-label={label}
                  onClick={() => (t === "about" ? setMixAbout(true) : (setMixAbout(false), setGrid(t)))}
                  className={`relative flex h-[50px] shrink-0 items-center gap-1.5 px-3 text-[14.5px] font-semibold transition-colors sm:px-4 ${on ? "text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-full after:bg-[linear-gradient(90deg,#60a5fa,#8b5cf6)]" : "text-ink-3 hover:text-ink"}`}
                >
                  <Icon className="size-[18px] sm:size-4" strokeWidth={1.9} /> <span className="sr-only sm:not-sr-only">{label}</span>
                </button>
              );
            })}
          </div>
          {!mixAbout && <ViewToggle value={mixView} onChange={setMixView} />}
        </div>
      </header>

      <GetVerified me={me} accountType={accountType} certificate={certificate} />

      {mixAbout ? (
        <div key="about" className="fmd-enter mx-auto grid w-full max-w-[680px] gap-4">
          <Intro v={v} />
          <FollowingCard v={v} />
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          {/* Facebook's left column */}
          <div className="hidden gap-4 lg:sticky lg:top-24 lg:grid">
            <Intro v={v} />
            <FollowingCard v={v} />
          </div>
          <div key={`${grid}-${mixView}`} role="tabpanel" className="fmd-enter min-w-0">
            {!mixPosts ? (
              <div className="aspect-[3/1] animate-pulse rounded-xl bg-[var(--surface-glass)]" aria-busy />
            ) : !mixPosts.length ? (
              <div className={fbCard}>{grid === "saved" ? <SavedPanel posts={savedPosts} insta={false} /> : <OwnGrid me={me} posts={[]} reels={grid === "reels"} />}</div>
            ) : mixView === "grid" ? (
              <PostGrid posts={mixPosts} square />
            ) : (
              <PostFeed posts={mixPosts} userId={me.id} onChange={loadPosts} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
