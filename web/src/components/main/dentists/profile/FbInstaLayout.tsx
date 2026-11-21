"use client";

import { BadgeCheck, Bookmark, BookmarkCheck, Building2, CalendarClock, Grid3x3, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Tag } from "@/components/app/kit";
import { Avatar } from "@/components/providers";
import { coverOf, PostFeed } from "../../explore/Explore";
import { PostGrid } from "../../PostGrid";
import { ViewToggle, type PostView } from "../../ProfileLayout";
import { ClaimNote, fbCard, fbGrey, Intro, NoPosts, PROFILE_TABS, short, TabBody, Treatments } from "./parts";
import type { DentistView } from "./useDentistProfile";

/**
 * Layout 2, Facebook + Instagram: Facebook's cover, tab bar and Intro column; Instagram's ringed photo, counts, bio,
 * treatments as highlights and square post grid, or Facebook's full posts with the grid/list switch.
 */
export function FbInstaLayout({ v }: { v: DentistView }) {
  const { me, p, avail, c, posts, reload, stats, tab, pickTab, saved, save, followed, follow, bookLabel } = v;
  const [mixView, setMixView] = useState<PostView>("grid");
  const tick = p.verification.status === "verified" && <BadgeCheck className="size-5 shrink-0 text-sky-400" strokeWidth={2} aria-label="Verified by FMD" />;
  const SaveIcon = saved ? BookmarkCheck : Bookmark;

  return (
    <div className="grid grid-cols-1 gap-4">
      <header className="-mx-4 overflow-hidden bg-[var(--surface)] sm:mx-0 sm:rounded-2xl sm:border sm:border-line">
        <div aria-hidden className={`h-[150px] bg-gradient-to-br ${coverOf(p.specialty)} via-violet-500/20 to-pink-500/15 sm:h-[240px]`} />
        <div className="px-4 pb-4 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
            <span className="relative z-10 -mt-[60px] block w-fit rounded-full bg-[linear-gradient(135deg,#60a5fa,#8b5cf6,#ec4899)] p-[3px] sm:-mt-[72px]">
              <span className="block rounded-full bg-[var(--surface)] p-[3px]">
                <Avatar p={p} className="size-[112px] !rounded-full !border-0 sm:size-[136px]" />
              </span>
            </span>
            <div className="grid min-w-0 flex-1 gap-2 sm:pb-1">
              <h1 className="flex flex-wrap items-center gap-2 text-[24px] font-bold leading-tight text-ink sm:text-[28px]">
                {p.name}
                {tick}
                <Tag tone="muted">Demo</Tag>
              </h1>
              <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[14px] text-ink-3 sm:text-[15px]">
                {stats.map(([n, label]) => (
                  <li key={label}>
                    <b className="font-semibold text-ink">{n}</b> {label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2 sm:pb-1">
              <Link href={`/book/${p.id}`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1877f2] px-3 text-[14.5px] font-semibold text-white hover:bg-[#166fe5] sm:flex-none">
                <CalendarClock className="size-4" strokeWidth={2} /> <span className="sm:hidden">{avail.mode === "live" ? "Book" : "Request"}</span>
                <span className="hidden sm:inline">{bookLabel}</span>
              </Link>
              <button type="button" onClick={follow} aria-pressed={followed} className={`${fbGrey} flex-1 sm:flex-none`}>
                {followed ? "Following" : (<><Plus className="size-4" strokeWidth={2.5} /> Follow</>)}
              </button>
              <button type="button" onClick={save} aria-pressed={saved} aria-label={saved ? "Saved" : "Save"} title={saved ? "Saved" : "Save"} className={fbGrey}>
                <SaveIcon className="size-4" strokeWidth={2} />
              </button>
            </div>
          </div>
          {/* the bio, as on Instagram */}
          <div className="mt-3 grid gap-1 text-[14.5px] text-ink-2">
            <p className="font-semibold text-ink">{p.specialty}</p>
            <p className="line-clamp-2">{p.bio}</p>
            <Link href={`/clinics/${c.id}`} className="flex w-fit items-center gap-1.5 font-medium text-sky-400 hover:underline">
              <Building2 className="size-4" strokeWidth={1.75} /> {c.name}, {c.city}
            </Link>
          </div>
          {/* treatments as highlights */}
          {p.serviceFees.length > 0 && (
            <ul aria-label="Treatments" className="-mx-4 mt-4 flex gap-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
              {p.serviceFees.map((f) => (
                <li key={f.service} className="shrink-0">
                  <button type="button" onClick={() => pickTab("book")} className="grid w-[72px] justify-items-center gap-1.5 text-center">
                    <span className="block rounded-full bg-[linear-gradient(135deg,#60a5fa,#8b5cf6,#ec4899)] p-[2.5px]">
                      <span className="block rounded-full bg-[var(--surface)] p-[2.5px]">
                        <span className={`grid size-[60px] place-items-center rounded-full bg-gradient-to-br ${coverOf(f.service)} to-[var(--surface-elevated)] text-[15px] font-semibold text-ink`}>{short(f.service)}</span>
                      </span>
                    </span>
                    <span className="w-full truncate text-[12px] font-medium text-ink-2">{f.service}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* the tab bar: Facebook's place, Instagram's icons */}
        <div className="flex items-center justify-between gap-2 border-t border-line px-2 sm:px-6">
          <div role="tablist" aria-label="Profile" className="flex overflow-x-auto [scrollbar-width:none]">
            {PROFILE_TABS.map(([t, label, Icon]) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                aria-label={label}
                onClick={() => pickTab(t)}
                className={`relative flex h-[50px] shrink-0 items-center gap-1.5 px-3 text-[14.5px] font-semibold transition-colors sm:px-4 ${tab === t ? "text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-full after:bg-[linear-gradient(90deg,#60a5fa,#8b5cf6)]" : "text-ink-3 hover:text-ink"}`}
              >
                {t === "posts" ? <Grid3x3 className="size-[18px] sm:size-4" strokeWidth={1.9} /> : <Icon className="size-[18px] sm:size-4" strokeWidth={1.9} />} <span className="sr-only sm:not-sr-only">{label}</span>
              </button>
            ))}
          </div>
          {tab === "posts" && posts.length > 0 && <ViewToggle value={mixView} onChange={setMixView} />}
        </div>
      </header>
      <ClaimNote v={v} />
      {tab === "posts" ? (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          {/* Facebook's left column */}
          <div className="hidden gap-4 lg:sticky lg:top-24 lg:grid">
            <Intro v={v} />
            <Treatments v={v} />
          </div>
          <div key={mixView} className="fmd-enter min-w-0">
            {!posts.length ? (
              <div className={fbCard}>
                <NoPosts name={p.name} insta={false} />
              </div>
            ) : mixView === "grid" ? (
              <PostGrid posts={posts} square />
            ) : (
              <PostFeed posts={posts} userId={me?.id ?? null} onChange={reload} />
            )}
          </div>
        </div>
      ) : (
        <TabBody v={v} insta={false} />
      )}
    </div>
  );
}
