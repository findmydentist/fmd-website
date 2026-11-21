"use client";

import { Bookmark, Clapperboard, CreditCard, Grid3x3, Lock, Settings, SlidersHorizontal, Stethoscope, UserPlus, X, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/app/kit";
import { fmtPhone, initials } from "@/lib/fmd";
import { coverOf, Ring } from "../../explore/Explore";
import { GetVerified, HIGHLIGHTS, OwnGrid, RoleTags, SavedPanel, VerifiedTick, VerifyBadges } from "./parts";
import type { AccountView, Grid } from "./useAccountProfile";

/** Layout 1, Instagram style: round photo beside the name and counts, a short bio, suggestions, highlights, and a square grid of posts, videos or saves. */

/** "Shortcuts for you" cards: the account's other pages, each a tap away (and dismissable) */
const SUGGESTIONS: { id: string; href: string; title: string; text: string; action: string; Icon: LucideIcon }[] = [
  { id: "membership", href: "/membership", title: "Membership", text: "Your plan, renewal, payments and receipts.", action: "Manage", Icon: CreditCard },
  { id: "personalise", href: "/account/personalisation", title: "Personalise", text: "Choose what Explore and suggestions show you.", action: "Set up", Icon: SlidersHorizontal },
  { id: "privacy", href: "/account/privacy", title: "Privacy", text: "Consents, messages, your data, or deleting it.", action: "Review", Icon: Lock },
  { id: "saved", href: "/saved", title: "Saved", text: "Dentists, posts and jobs you've kept.", action: "Open", Icon: Bookmark },
  { id: "dentist", href: "/account/dentist", title: "Dentist profile", text: "Are you a dentist? Get verified so patients find you.", action: "Open", Icon: Stethoscope },
];
const DISMISSED_KEY = "fmd-demo:dismissed-suggestions";

export function InstaLayout({ v }: { v: AccountView }) {
  const { me, mine, savedPosts, savedDentists, follows, accountType, certificate, seen, openHighlight, openFollowing } = v;
  const [grid, setGrid] = useState<Grid>("posts");
  const [showSuggest, setShowSuggest] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is only readable after mounting
      setDismissed(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]"));
    } catch {
      // storage blocked: show them all
    }
  }, []);
  const dismiss = (id: string) =>
    setDismissed((d) => {
      const next = [...d, id];
      try {
        localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
      } catch {
        // dismissed for this visit only
      }
      return next;
    });
  const shortcuts = SUGGESTIONS.filter((x) => !dismissed.includes(x.id));

  const instaStat = "text-center text-[13px] leading-tight text-ink-2 hover:opacity-70 sm:text-left sm:text-[15px]";
  const instaNum = "block text-[16px] font-semibold text-ink sm:inline sm:text-[15px]";
  const instaActions = (
    <>
      <ButtonLink href="/account/settings" variant="secondary" size="sm">
        Edit profile
      </ButtonLink>
      <ButtonLink href="/saved" variant="secondary" size="sm">
        Saved items
      </ButtonLink>
      <Button variant="secondary" size="sm" aria-pressed={showSuggest} aria-label={showSuggest ? "Hide suggestions" : "Show suggestions"} title="Suggested for you" onClick={() => setShowSuggest((v) => !v)} className="!px-3">
        <UserPlus className="size-4" strokeWidth={2} />
      </Button>
      <Link href="/account/settings" aria-label="Settings" title="Settings" className="grid size-9 place-items-center rounded-full text-ink hover:bg-[var(--surface-glass)]">
        <Settings className="size-[22px]" strokeWidth={1.75} />
      </Link>
    </>
  );
  return (
    <div className="mx-auto grid w-full max-w-[935px] grid-cols-1 gap-6">
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-5 sm:gap-12 sm:px-8">
        <Ring round>
          <span className="grid size-20 place-items-center rounded-full bg-[var(--surface-elevated)] text-[24px] font-semibold text-ink sm:size-36 sm:text-[44px]">{initials(me.full_name)}</span>
        </Ring>
        <div className="grid gap-3 sm:gap-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="flex items-center gap-2 text-[20px] font-medium text-ink sm:text-[22px]">
              {me.full_name}
              <VerifiedTick me={me} />
            </p>
            <VerifyBadges v={v} />
            <div className="hidden items-center gap-2 sm:flex">{instaActions}</div>
          </div>
          <RoleTags me={me} accountType={accountType} />
          <div className="flex justify-between gap-3 sm:justify-start sm:gap-10">
            <a href="#saved" onClick={() => setGrid("saved")} className={instaStat}>
              <span className={instaNum}>{savedPosts?.length ?? "–"}</span> saved posts
            </a>
            <Link href="/saved" className={instaStat}>
              <span className={instaNum}>{savedDentists}</span> saved dentists
            </Link>
            <button type="button" onClick={openFollowing} className={instaStat}>
              <span className={instaNum}>{follows.length}</span> following
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-0.5 text-[14px] text-ink-2 sm:px-8">
        {me.dentist_profile?.specialisation && <p className="font-semibold text-ink">{me.dentist_profile.specialisation}</p>}
        <p>{fmtPhone(me.phone)}</p>
        {me.email && <p className="break-all">{me.email}</p>}
        {me.city && <p>{me.city}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2 sm:hidden">{instaActions}</div>
      </div>

      <GetVerified me={me} accountType={accountType} certificate={certificate} />

      {showSuggest && shortcuts.length > 0 && (
        <section aria-label="Suggested for you" className="fmd-enter grid gap-3 sm:px-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-ink">Suggested for you</h2>
            <Link href="/account/settings" className="text-[13.5px] font-semibold text-sky-400 hover:text-sky-300">
              See all
            </Link>
          </div>
          <ul className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
            {shortcuts.map(({ id, href, title, text, action, Icon }) => (
              <li key={id} className="relative grid w-[164px] shrink-0 justify-items-center gap-2 rounded-xl border border-line bg-[var(--surface)] px-3 pb-3 pt-5 text-center">
                <button type="button" onClick={() => dismiss(id)} aria-label={`Dismiss ${title}`} className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full text-ink-3 hover:bg-white/[0.06] hover:text-ink">
                  <X className="size-4" strokeWidth={2} />
                </button>
                <span className={`grid size-16 place-items-center rounded-full bg-gradient-to-br ${coverOf(title)} to-[var(--surface-elevated)] text-ink`}>
                  <Icon className="size-7" strokeWidth={1.5} />
                </span>
                <p className="text-[14px] font-semibold text-ink">{id === "dentist" && me.dentist_profile ? "Your dentist profile" : title}</p>
                <p className="line-clamp-2 min-h-[2lh] text-[12px] leading-snug text-ink-3">{text}</p>
                <Link href={href} className="mt-1 w-full rounded-lg bg-sky-600 py-1.5 text-[13.5px] font-semibold text-white hover:bg-sky-500">
                  {id === "dentist" ? (me.dentist_profile ? "Edit" : "Set up") : action}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ul aria-label="Highlights" className="-mx-4 flex gap-5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-8">
        {HIGHLIGHTS.map((h, i) => (
          <li key={h.id} className="shrink-0">
            <button type="button" onClick={() => openHighlight(i)} className="grid w-[76px] justify-items-center gap-1.5 text-center" aria-label={`Highlight: ${h.name}`}>
              <span className={`block rounded-full border p-[3px] ${seen.includes(h.id) ? "border-line" : "border-line-strong"}`}>
                <span className="relative block size-16 overflow-hidden rounded-full bg-[var(--surface-elevated)]">
                  <Image src={h.photo!} alt="" fill sizes="64px" className="object-cover object-[center_20%]" />
                </span>
              </span>
              <span className="w-full truncate text-[12px] font-medium text-ink-2">{h.name}</span>
            </button>
          </li>
        ))}
      </ul>

      <section id="saved" aria-label="Your posts and saves" className="scroll-mt-24">
        <div role="tablist" aria-label="Profile" className="grid grid-cols-3 border-t border-line">
          {(
            [
              ["posts", "Posts", Grid3x3],
              ["reels", "Reels", Clapperboard],
              ["saved", "Saved", Bookmark],
            ] as const
          ).map(([t, label, Icon]) => (
            <button
              key={t}
              role="tab"
              aria-selected={grid === t}
              onClick={() => setGrid(t)}
              className={`-mt-px flex h-12 items-center justify-center gap-1.5 border-t text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors ${grid === t ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}
            >
              <Icon className="size-4" strokeWidth={1.75} /> {label}
            </button>
          ))}
        </div>
        <div key={grid} role="tabpanel" className="fmd-enter">
          {grid === "saved" ? <SavedPanel posts={savedPosts} insta /> : <OwnGrid me={me} posts={mine} reels={grid === "reels"} insta />}
        </div>
      </section>
    </div>
  );
}
