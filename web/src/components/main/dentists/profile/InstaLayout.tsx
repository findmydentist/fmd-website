"use client";

import { BadgeCheck, Bookmark, BookmarkCheck, Building2, Grid3x3, Languages } from "lucide-react";
import Link from "next/link";
import { Button, ButtonLink, Tag } from "@/components/app/kit";
import { Avatar } from "@/components/providers";
import { coverOf, Ring } from "../../explore/Explore";
import { ClaimNote, PROFILE_TABS, short, TabBody, Trust } from "./parts";
import type { DentistView } from "./useDentistProfile";

/** Layout 1, Instagram style: round photo beside the name and counts, a short bio, treatments as highlights, and an icon tab bar over a square post grid. */
export function InstaLayout({ v }: { v: DentistView }) {
  const { p, c, stats, tab, pickTab, saved, save, followed, follow, bookLabel } = v;
  const tick = p.verification.status === "verified" && <BadgeCheck className="size-5 shrink-0 text-sky-400" strokeWidth={2} aria-label="Verified by FMD" />;
  const SaveIcon = saved ? BookmarkCheck : Bookmark;

  /** Book, Follow and Save: in the card's top corner on wide screens, under the details on phones. */
  const actions = (
    <>
      <ButtonLink href={`/book/${p.id}`} size="sm" className="col-span-2">
        {bookLabel}
      </ButtonLink>
      <Button variant="secondary" size="sm" onClick={follow} aria-pressed={followed}>
        {followed ? "Following" : "Follow"}
      </Button>
      <Button variant="secondary" size="sm" onClick={save} aria-pressed={saved}>
        <SaveIcon className="size-4" strokeWidth={1.75} />
        {saved ? "Saved" : "Save"}
      </Button>
    </>
  );

  return (
    <div className="grid grid-cols-1 gap-6">
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-5 sm:gap-12 sm:px-8">
        <Ring round>
          <Avatar p={p} className="size-20 !rounded-full !border-0 sm:size-36" />
        </Ring>
        <div className="grid gap-3 sm:gap-4">
          <h1 className="flex flex-wrap items-center gap-2 text-[20px] font-medium text-ink sm:text-[22px]">
            {p.name}
            {tick}
            <Tag tone="muted">Demo</Tag>
          </h1>
          <ul className="flex gap-6 text-[14px] text-ink-2 sm:gap-10 sm:text-[15px]">
            {stats.map(([n, label]) => (
              <li key={label}>
                <span className="font-semibold text-ink">{n}</span> {label}
              </li>
            ))}
          </ul>
          <div className="hidden flex-wrap gap-2 sm:flex">{actions}</div>
        </div>
      </header>
      <div className="grid gap-1.5 text-[14px] text-ink-2 sm:px-8">
        <p className="font-semibold text-ink">{p.specialty}</p>
        <Trust p={p} />
        <p className="flex items-center gap-2">
          <Languages className="size-4 text-ink-3" strokeWidth={1.75} /> Consults in {p.languages.join(", ")}
        </p>
        <Link href={`/clinics/${c.id}`} className="flex w-fit items-center gap-2 font-medium text-sky-400 hover:underline">
          <Building2 className="size-4" strokeWidth={1.75} /> {c.name}, {c.city}
        </Link>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">{actions}</div>
        {!p.claimed && (
          <div className="mt-2">
            <ClaimNote v={v} />
          </div>
        )}
      </div>
      {p.serviceFees.length > 0 && (
        <ul aria-label="Treatments" className="-mx-4 flex gap-5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-8">
          {p.serviceFees.map((f) => (
            <li key={f.service} className="shrink-0">
              <button type="button" onClick={() => pickTab("book")} className="grid w-[76px] justify-items-center gap-1.5 text-center">
                <span className="grid size-16 place-items-center rounded-full border border-line-strong bg-[var(--surface-glass)] p-[3px]">
                  <span className={`grid size-full place-items-center rounded-full bg-gradient-to-br ${coverOf(f.service)} to-transparent text-[15px] font-semibold text-ink`}>{short(f.service)}</span>
                </span>
                <span className="w-full truncate text-[12px] text-ink-2">{f.service}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div>
        <div role="tablist" aria-label="Profile" className="grid grid-cols-5 border-t border-line">
          {PROFILE_TABS.map(([t, label, Icon]) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              aria-label={label}
              onClick={() => pickTab(t)}
              className={`-mt-px flex h-12 items-center justify-center gap-1.5 border-t text-[12px] font-semibold uppercase tracking-[0.08em] ${tab === t ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}
            >
              {t === "posts" ? <Grid3x3 className="size-4" strokeWidth={1.75} /> : <Icon className="size-4" strokeWidth={1.75} />}
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>
        <div className={tab === "posts" ? "" : "pt-5"}><TabBody v={v} insta /></div>
      </div>
    </div>
  );
}
