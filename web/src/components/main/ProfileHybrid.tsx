"use client";

import { BadgeCheck, Clock3, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Cover } from "./CoverPhoto";

/**
 * Layout 3 (Instagram + Facebook, refined), shared by both profiles: a cover picture, the photo in a ring that says how
 * far FMD's checks have got, one primary action, counts, a short bio, highlights, and a sticky tab bar with labels.
 * The site's blue for the actions, 44 px targets, visible focus.
 */

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400";
export const hy = {
  primary: `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-[15px] font-semibold text-white transition-colors hover:bg-sky-500 ${focus}`,
  secondary: `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/[0.08] px-4 text-[15px] font-semibold text-ink transition-colors hover:bg-white/[0.13] ${focus}`,
  icon: `grid size-11 shrink-0 place-items-center rounded-xl bg-white/[0.08] text-ink transition-colors hover:bg-white/[0.13] ${focus}`,
  card: "rounded-2xl border border-line bg-[var(--surface)] p-5",
  focus,
};

export type Trust = "verified" | "pending" | null;

/** The photo's ring: blue and a "Verified" tag once FMD has checked the registration, amber dashed while it's in review. */
function TrustRing({ trust, children }: { trust: Trust; children: ReactNode }) {
  const ring = trust === "verified" ? "bg-sky-500" : trust === "pending" ? "bg-[repeating-conic-gradient(#fbbf24_0_12deg,transparent_12deg_20deg)]" : "bg-white/15";
  return (
    <span className="relative block w-fit">
      <span className={`block rounded-full p-[3px] ${ring}`}>
        <span className="block rounded-full bg-[var(--surface)] p-[3px]">{children}</span>
      </span>
      {trust && (
        <span
          className={`absolute -bottom-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border-2 border-[var(--surface)] px-2.5 py-0.5 text-[12px] font-semibold ${
            trust === "verified" ? "bg-emerald-600 text-white" : "bg-amber-300 text-[#2a1a00]"
          }`}
        >
          {trust === "verified" ? <BadgeCheck aria-hidden className="size-3.5" strokeWidth={2.25} /> : <Clock3 aria-hidden className="size-3.5" strokeWidth={2.25} />}
          {trust === "verified" ? "Verified" : "In review"}
        </span>
      )}
    </span>
  );
}

export function HybridHeader({
  photo,
  cover,
  coverEdit,
  trust,
  title,
  role,
  headline,
  badges,
  actions,
  stats,
  bio,
  highlights,
  tabs,
}: {
  photo: ReactNode;
  /** the wide picture behind the photo (none: a quiet default), and on your own profile its change controls */
  cover?: string | null;
  coverEdit?: ReactNode;
  trust: Trust;
  title: ReactNode;
  /** who they are on FMD (dentist, student, patient…), shown right under the name */
  role?: ReactNode;
  headline: ReactNode;
  badges?: ReactNode;
  actions: ReactNode;
  stats: ReactNode;
  bio?: ReactNode;
  highlights?: ReactNode;
  tabs: ReactNode;
}) {
  return (
    <>
      <header className="-mx-4 overflow-hidden bg-[var(--surface)] sm:mx-0 sm:rounded-2xl sm:border sm:border-line">
        {/* the cover: their picture, or a quiet default; 4 : 1 like LinkedIn's on wide screens */}
        <div className="relative h-[128px] sm:h-[220px]">
          <Cover src={cover}>{coverEdit}</Cover>
        </div>
        <div className="px-4 pb-5 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
            <div className="relative z-10 -mt-14 sm:-mt-20">
              <TrustRing trust={trust}>{photo}</TrustRing>
            </div>
            <div className="grid min-w-0 flex-1 gap-1.5 sm:pb-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {title}
                {badges}
              </div>
              {role && <div className="flex flex-wrap items-center gap-2">{role}</div>}
              <p className="text-[15px] text-ink-2">{headline}</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:pb-1">{actions}</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">{stats}</div>
          {bio && <div className="mt-3 grid max-w-[68ch] gap-1 text-[15px] leading-relaxed text-ink-2">{bio}</div>}
          {highlights && <div className="-mx-4 mt-5 px-4 sm:mx-0 sm:px-0">{highlights}</div>}
        </div>
      </header>
      {tabs}
    </>
  );
}

/** a count: the number, then what it counts; a button or link when it opens something */
export function Stat({ n, label, onClick, href }: { n: ReactNode; label: string; onClick?: () => void; href?: string }) {
  const body = (
    <>
      <b className="font-semibold tabular-nums text-ink">{n}</b> {label}
    </>
  );
  const cls = `inline-flex min-h-11 items-center gap-1 rounded-lg text-[15px] text-ink-3 transition-colors hover:text-ink sm:min-h-0 ${focus}`;
  if (href)
    return (
      <Link href={href} className={cls}>
        {body}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls}>
        {body}
      </button>
    );
  return <span className="inline-flex min-h-11 items-center gap-1 text-[15px] text-ink-3 sm:min-h-0">{body}</span>;
}

/** A row of round highlights; each opens something (a story, a tab). */
export function Highlights({ label, items }: { label: string; items: { key: string; name: string; face: ReactNode; onClick: () => void; seen?: boolean }[] }) {
  return (
    <ul aria-label={label} className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none]">
      {items.map((h) => (
        <li key={h.key} className="shrink-0">
          <button type="button" onClick={h.onClick} className={`grid w-[76px] justify-items-center gap-1.5 rounded-xl text-center ${focus}`} aria-label={h.name}>
            <span className={`block rounded-full p-[2px] ${h.seen ? "bg-white/15" : "bg-sky-500/80"}`}>
              <span className="block rounded-full bg-[var(--surface)] p-[2px]">
                <span className="relative grid size-16 place-items-center overflow-hidden rounded-full bg-[var(--surface-elevated)] text-[15px] font-semibold text-ink">{h.face}</span>
              </span>
            </span>
            <span className="w-full truncate text-[13px] text-ink-2">{h.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * The tab bar, kept in reach under the site's header while scrolling: solid, so nothing shows through it. On phones the
 * tabs share the width equally, icon over a short label, so all of them fit (none cut off at the edge); from tablets
 * up, a row of icon + label. `right` (the grid/list switch) sits at its end from tablets up; on phones the page shows it
 * by the content instead.
 */
export function HybridTabs<T extends string>({ tabs, value, onChange, right }: { tabs: readonly (readonly [T, string, LucideIcon])[]; value: T; onChange: (t: T) => void; right?: ReactNode }) {
  // pinned under the header yet? only then, on phones, a plain strip fills the space above it (behind the floating
  // header), so the page doesn't show around the header; before that, the strip would cover the profile card
  const bar = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    let frame = 0;
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setStuck(el.getBoundingClientRect().top <= parseFloat(getComputedStyle(el).top) + 0.5));
    };
    check();
    addEventListener("scroll", check, { passive: true });
    addEventListener("resize", check);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", check);
      removeEventListener("resize", check);
    };
  }, []);
  return (
    <div
      ref={bar}
      data-stuck={stuck}
      className="sticky top-[76px] z-20 -mx-4 border-b border-line bg-[var(--background)] px-1 before:absolute before:inset-x-0 before:-top-[76px] before:hidden before:h-[76px] before:bg-[var(--background)] data-[stuck=true]:max-sm:before:block sm:top-[84px] sm:mx-0 sm:rounded-xl sm:border sm:bg-[var(--surface)] sm:px-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div role="tablist" aria-label="Profile" className="grid min-w-0 flex-1 grid-flow-col auto-cols-fr sm:flex sm:flex-none">
          {tabs.map(([t, label, Icon]) => {
            const on = value === t;
            return (
              <button
                key={t}
                role="tab"
                aria-selected={on}
                onClick={() => onChange(t)}
                className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-[11.5px] font-semibold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400/70 sm:min-h-12 sm:flex-row sm:gap-2 sm:px-3.5 sm:text-[14.5px] ${
                  on ? "text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-sky-500 sm:after:inset-x-3" : "text-ink-3 hover:text-ink"
                }`}
              >
                <Icon aria-hidden className={`size-5 shrink-0 sm:size-4 ${on ? "text-sky-400" : ""}`} strokeWidth={1.9} />
                <span className="max-w-full truncate whitespace-nowrap">{label}</span>
              </button>
            );
          })}
        </div>
        {right && <div className="hidden sm:block">{right}</div>}
      </div>
    </div>
  );
}

/** A role, plainly visible: an icon and the role in a tinted pill, and an optional detail after it (a specialty). */
export function RolePill({ icon: Icon, label, detail, tone = "border-sky-400/40 bg-sky-500/15 text-sky-200" }: { icon: LucideIcon; label: string; detail?: string; tone?: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13.5px] font-semibold ${tone}`}>
        <Icon aria-hidden className="size-4" strokeWidth={2} /> {label}
      </span>
      {detail && <span className="text-[14px] font-medium text-ink-2">{detail}</span>}
    </span>
  );
}
