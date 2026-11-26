"use client";

import { Bookmark, BookmarkCheck, Building2, CalendarClock, Film, LayoutGrid, Languages, Plus, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Tag } from "@/components/app/kit";
import { Avatar } from "@/components/providers";
import { coverOf, PostFeed } from "../../explore/Explore";
import { PostGrid, ReelGrid } from "../../PostGrid";
import { Highlights, hy, HybridHeader, HybridTabs, RolePill, Stat, type Trust } from "../../ProfileHybrid";
import { ViewToggle, type PostView } from "../../ProfileLayout";
import { istDate } from "@/lib/format";
import { HybridPanel } from "./HybridPanels";
import { ClaimNote, fbCard, Intro, NoPosts, PROFILE_TABS, short, Times } from "./parts";
import type { DentistView } from "./useDentistProfile";

const TABS = PROFILE_TABS.map(([t, label, Icon]) => [t, label, t === "posts" ? LayoutGrid : Icon] as const);

/**
 * Layout 3, Instagram + Facebook refined: one header (photo in its verification ring, Book as the one primary action,
 * counts, bio, treatments as highlights), a sticky labelled tab bar, and on wide screens a side column with the next
 * open times (book straight from them) and Intro beside the posts.
 */
export function HybridLayout({ v }: { v: DentistView }) {
  const { me, p, avail, c, posts, reload, stats, tab, pickTab, saved, save, followed, follow, bookLabel } = v;
  const [view, setView] = useState<PostView>("grid");
  const [kind, setKind] = useState<"posts" | "reels">("posts");
  const trust: Trust = p.verification.status === "verified" ? "verified" : null;
  const SaveIcon = saved ? BookmarkCheck : Bookmark;
  const reels = posts.filter((x) => x.kind === "video");
  const shown = kind === "reels" ? reels : posts;
  // the side column's times: the next day that has any (a live calendar); a request-only clinic says how it works
  const nextDay = avail.mode === "live" && avail.slots.length ? { ...avail, slots: avail.slots.filter((x) => istDate(x) === istDate(avail.slots[0])) } : avail;

  return (
    <div className="grid grid-cols-1 gap-4">
      <HybridHeader
        trust={trust}
        cover={p.cover}
        photo={<Avatar p={p} className="size-[112px] !rounded-full !border-0 sm:size-[144px]" />}
        title={<h1 className="text-[28px] font-bold leading-tight tracking-[-0.01em] text-ink sm:text-[30px]">{p.name}</h1>}
        badges={<Tag tone="muted">Demo</Tag>}
        role={<RolePill icon={Stethoscope} label="Dentist" detail={p.specialty} />}
        headline={`${c.name}, ${c.city}`} // the specialty is beside the role pill above
        actions={
          <>
            <Link href={`/book/${p.id}`} className={`${hy.primary} flex-1 sm:flex-none`}>
              <CalendarClock aria-hidden className="size-[18px]" strokeWidth={2} /> <span className="sm:hidden">{avail.mode === "live" ? "Book" : "Request"}</span>
              <span className="hidden sm:inline">{bookLabel}</span>
            </Link>
            <button type="button" onClick={follow} aria-pressed={followed} className={`${hy.secondary} flex-1 sm:flex-none`}>
              {followed ? (
                "Following"
              ) : (
                <>
                  <Plus aria-hidden className="size-[18px]" strokeWidth={2.25} /> Follow
                </>
              )}
            </button>
            <button type="button" onClick={save} aria-pressed={saved} aria-label={saved ? "Saved" : "Save"} title={saved ? "Saved" : "Save"} className={hy.icon}>
              <SaveIcon aria-hidden className="size-5" strokeWidth={1.9} />
            </button>
          </>
        }
        stats={stats.map(([n, label]) => (
          <Stat key={label} n={n} label={label} onClick={label.startsWith("review") ? () => pickTab("reviews") : label.startsWith("post") ? () => pickTab("posts") : undefined} />
        ))}
        bio={
          <>
            <p className="line-clamp-3">{p.bio}</p>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-ink-3">
              <span className="inline-flex items-center gap-1.5">
                <Languages aria-hidden className="size-4" strokeWidth={1.75} /> {p.languages.join(", ")}
              </span>
              <Link href={`/clinics/${c.id}`} className={`inline-flex items-center gap-1.5 rounded font-medium text-[var(--accent)] hover:underline ${hy.focus}`}>
                <Building2 aria-hidden className="size-4" strokeWidth={1.75} /> {c.name}
              </Link>
            </p>
          </>
        }
        highlights={
          p.serviceFees.length > 0 && (
            <Highlights
              label="Treatments"
              items={p.serviceFees.map((f) => ({
                key: f.service,
                name: f.service,
                onClick: () => pickTab("book"),
                face: <span className={`grid size-full place-items-center bg-gradient-to-br ${coverOf(f.service)} to-[var(--surface-elevated)]`}>{short(f.service)}</span>,
              }))}
            />
          )
        }
        tabs={<HybridTabs tabs={TABS} value={tab} onChange={pickTab} right={tab === "posts" && posts.length > 0 ? <ViewToggle value={view} onChange={setView} /> : undefined} />}
      />
      <ClaimNote v={v} />

      {tab === "posts" ? (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          {/* the side column, on wide screens: the next open times first, they're what people come for */}
          <div className="hidden gap-4 lg:sticky lg:top-[152px] lg:grid">
            <section aria-label="Next open times" className={`grid gap-3 ${hy.card}`}>
              <h2 className="text-[17px] font-semibold text-ink">{avail.mode === "live" ? "Next open times" : "Appointments"}</h2>
              {/* just the next day with times here; "See all times" has the rest */}
              <Times p={p} avail={nextDay} />
            </section>
            <Intro v={v} bio={false} />
          </div>
          <div className="grid min-w-0 gap-3">
            {/* phones: the grid/list switch, which the tab bar holds from tablets up */}
            <div className="flex justify-end sm:hidden">
              <ViewToggle value={view} onChange={setView} />
            </div>
            {/* the row under the profile: Posts and Reels */}
            <div role="tablist" aria-label="Posts or reels" className="grid grid-cols-2 border-t border-line">
              {(
                [
                  ["posts", "Posts", LayoutGrid],
                  ["reels", "Reels", Film],
                ] as const
              ).map(([k, label, Icon]) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={kind === k}
                  onClick={() => setKind(k)}
                  className={`-mt-px flex min-h-12 items-center justify-center gap-2 border-t-2 text-[14px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)] ${
                    kind === k ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink"
                  }`}
                >
                  <Icon aria-hidden className="size-4" strokeWidth={1.9} /> {label}
                  <span className="font-normal text-ink-3">{k === "posts" ? posts.length : reels.length}</span>
                </button>
              ))}
            </div>
            <div key={`${kind}-${view}`} className="fmd-enter">
              {!shown.length ? (
                <div className={fbCard}>
                  {kind === "reels" ? (
                    <div className="grid justify-items-center gap-3 py-12 text-center">
                      <span className="grid size-16 place-items-center rounded-full border-2 border-ink text-ink">
                        <Film aria-hidden className="size-7" strokeWidth={1.5} />
                      </span>
                      <p className="text-[20px] font-semibold text-ink">No reels yet</p>
                      <p className="text-[14.5px] text-ink-3">When {p.name} shares a short video, it shows here.</p>
                    </div>
                  ) : (
                    <NoPosts name={p.name} />
                  )}
                </div>
              ) : view === "list" ? (
                <PostFeed posts={shown} userId={me?.id ?? null} onChange={reload} />
              ) : kind === "reels" ? (
                <ReelGrid posts={shown} />
              ) : (
                <PostGrid posts={shown} square />
              )}
            </div>
          </div>
        </div>
      ) : (
        <HybridPanel v={v} />
      )}
    </div>
  );
}
