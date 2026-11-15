"use client";

import { ArrowLeft, BadgeCheck, BarChart3, Bookmark, BookmarkCheck, Building2, CalendarClock, Camera, Clapperboard, Clock3, ExternalLink, GraduationCap, Grid3x3, Heart, Info, Languages, LayoutGrid, MapPin, MessageCircle, MessageSquare, PhoneOff, Plus, SquarePlay, Star, ThumbsUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { Button, ButtonLink, Panel, Tag } from "@/components/app/kit";
import { Field, fieldCls, Sheet } from "@/components/app/Sheet";
import { Notice } from "@/components/Page";
import { Avatar, Verification } from "@/components/providers";
import { SponsoredBadge } from "@/components/ui";
import { dayLabel, feeRange, istDate, noonOf, timeLabel } from "@/lib/format";
import type { Me } from "@/lib/fmd";
import { useMe } from "@/lib/me";
import { getAvailability, getClinicPage, getClaims, getProvider, submitClaim, type Availability, type Claim, type ClinicPage, type ProviderProfile } from "@/sample/providers";
import { getSaved, toggleSaved } from "@/sample/saved";
import { feed, following, toggleFollow, type FeedItem } from "@/sample/content";
import { dentistReviews } from "@/sample/reviews";
import { coverOf, PostCard, Ring } from "../explore/Explore";
import { LayoutPicker, useProfileLayout } from "../ProfileLayout";
import { ReviewsSection } from "../trust/Trust";
import { DentistCard } from "./Search";
import { track } from "@/lib/analytics";

function Back() {
  return (
    <Link href="/dentists" className="inline-flex w-fit items-center gap-1.5 text-[14px] text-ink-3 hover:text-ink">
      <ArrowLeft className="size-4" strokeWidth={1.5} /> Find a dentist
    </Link>
  );
}

function NotFound({ what }: { what: string }) {
  return (
    <Panel className="grid justify-items-start gap-3 p-6">
      <h1 className="text-[19px] font-medium text-ink">We couldn&apos;t find that {what}</h1>
      <p className="text-[14.5px] text-ink-3">The link may be old, or the profile was removed.</p>
      <ButtonLink href="/dentists" variant="secondary">
        Find a dentist
      </ButtonLink>
    </Panel>
  );
}

function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Panel as="section" className={`grid gap-3 p-5 sm:p-6 ${className}`}>
      <h2 className="text-[17px] font-medium text-ink">{title}</h2>
      {children}
    </Panel>
  );
}

/* ---------------- /dentists/[id] ---------------- */

type ProfileTab = "posts" | "about" | "reviews" | "book" | "clinic";
const PROFILE_TABS: [ProfileTab, string, typeof LayoutGrid][] = [
  ["posts", "Posts", LayoutGrid],
  ["about", "About", Info],
  ["reviews", "Reviews", Star],
  ["book", "Book & fees", CalendarClock],
  ["clinic", "Clinic", Building2],
];

export function ProviderPage() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const router = useRouter();
  const [p, setP] = useState<ProviderProfile | null | undefined>(undefined);
  const [avail, setAvail] = useState<Availability | null>(null);
  const [saved, setSaved] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [picked, setPicked] = useState<ProfileTab | null>(null);
  const [layout, pickLayout] = useProfileLayout();
  useEffect(() => {
    getProvider(id).then(setP);
    track("profile_viewed", { dentist_id: id });
    getAvailability(id).then(setAvail);
  }, [id]);
  const userId = me === undefined ? undefined : (me?.id ?? null);
  useEffect(() => {
    if (userId === undefined) return;
    feed(userId, "for_you").then((l) => setPosts(l.filter((x) => x.author.id === id)));
    dentistReviews(userId, id).then((r) => setReviewCount(r.count));
    if (!userId) return;
    getSaved(userId, "dentist").then((l) => setSaved(l.includes(id)));
    following(userId).then((l) => setFollowed(l.some((a) => a.id === id)));
    getClaims(userId).then((l) => setClaim(l.find((c) => c.provider_id === id) ?? null));
  }, [userId, id]);

  if (p === undefined || !avail) return <div className="app-panel h-64 animate-pulse" aria-busy />;
  if (p === null) return <NotFound what="dentist" />;

  const signIn = () => router.push(`/login?next=${encodeURIComponent(`/dentists/${id}`)}`);
  const save = async () => (me ? setSaved(await toggleSaved(me.id, "dentist", id)) : signIn());
  const follow = async () => (me ? setFollowed(await toggleFollow(me.id, id)) : signIn());
  const c = p.clinicDetails;
  const tab = picked ?? (posts.length ? "posts" : "book");
  const stats: [number | string, string][] = [
    [posts.length, posts.length === 1 ? "post" : "posts"],
    [reviewCount ?? "–", reviewCount === 1 ? "review" : "reviews"],
    ...(p.experienceYears ? [[p.experienceYears, "yrs exp."] as [number, string]] : []),
  ];

  const reload = () => userId !== undefined && feed(userId, "for_you").then((l) => setPosts(l.filter((x) => x.author.id === id)));
  const bookLabel = avail.mode === "live" ? "Book appointment" : "Request appointment";
  const tick = p.verification.status === "verified" && <BadgeCheck className="size-5 shrink-0 text-sky-400" strokeWidth={2} aria-label="Verified by FMD" />;
  const short = (x: string) => x.split(/\s+/).map((w) => w[0]).slice(0, 2).join("");
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

  /* ---- the pieces every layout shares ---- */
  const claimNote = !p.claimed && (
    <div className="rounded-2xl border border-line px-4 py-3 text-[14px] text-ink-2">
      Listed by FMD from public information; this dentist hasn&apos;t joined FMD yet.{" "}
      {claim ? (
        <Tag tone="accent">Your claim is being reviewed</Tag>
      ) : (
        <button type="button" onClick={() => setClaiming(true)} className="font-medium text-ink underline underline-offset-4">
          Is this you? Claim this profile
        </button>
      )}
    </div>
  );
  const trust = (
    <>
      <div className="flex flex-wrap gap-1.5">
        <Verification v={p.verification} />
        {p.sponsored && <SponsoredBadge />}
      </div>
      {/* say what was checked, not just "verified" (PDR §4.8) */}
      <p className="text-[12.5px] text-ink-3">{p.verification.checks}</p>
      {p.sponsored && <p className="text-[12.5px] text-ink-3">Sponsored by {p.sponsored.sponsor}: a paid placement, not a clinical endorsement.</p>}
    </>
  );
  const noPosts = (insta: boolean) => (
    <div className="grid justify-items-center gap-3 py-14 text-center">
      <span className={`grid size-16 place-items-center ${insta ? "rounded-full border-2 border-ink text-ink" : "rounded-3xl bg-sky-500/15 text-sky-300"}`}>
        {insta ? <Camera className="size-7" strokeWidth={1.5} /> : <LayoutGrid className="size-7" strokeWidth={1.5} />}
      </span>
      <p className="text-[20px] font-semibold text-ink">No posts yet</p>
      <p className="text-[14px] text-ink-3">When {p.name} shares dental tips on FMD, they&apos;ll show up here.</p>
    </div>
  );
  const about = (
    <Card title="About">
      <p className="text-[14.5px] text-ink-2">{p.bio}</p>
      <div>
        <p className="text-[13.5px] text-ink-3">Qualifications</p>
        <p className="text-[14.5px] text-ink">{p.qualifications.join(", ")}</p>
      </div>
      <p className="flex items-center gap-2 text-[14px] text-ink-2">
        <Languages className="size-4 text-ink-3" strokeWidth={1.75} /> Consults in {p.languages.join(", ")}
      </p>
    </Card>
  );
  const times = (
    <Card title={avail.mode === "live" ? "Next open times" : "Appointments"}>
      <Times p={p} avail={avail} />
    </Card>
  );
  const fees = (
    <Card title="Treatments and fees">
      <ul className="divide-y divide-[var(--border)] rounded-2xl border border-line text-[14px]">
        <li className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
          <span className="text-ink">Consultation</span>
          <span className="text-ink-2">{p.fee ? feeRange(p.fee) : "Confirmed by the clinic"}</span>
        </li>
        {p.serviceFees.map((f) => (
          <li key={f.service} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
            <span className="text-ink">{f.service}</span>
            <span className="text-ink-2">{feeRange(f)}</span>
          </li>
        ))}
      </ul>
      <p className="text-[12.5px] text-ink-3">Typical ranges (demo estimates), not quotes. Your dentist confirms the cost after examining you.</p>
    </Card>
  );
  const clinic = (
    <Card title="Clinic">
      <div className="grid gap-2 text-[14px] text-ink-2">
        <Link href={`/clinics/${c.id}`} className="flex items-center gap-2 font-medium text-ink hover:underline">
          <Building2 className="size-4 text-ink-3" strokeWidth={1.75} /> {c.name}
        </Link>
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-ink-3" strokeWidth={1.75} /> {c.address}, {c.city}
        </p>
        <p className="flex items-center gap-2">
          <Clock3 className="size-4 text-ink-3" strokeWidth={1.75} /> {c.hours}
        </p>
        <p className="flex items-center gap-2 text-ink-3">
          <PhoneOff className="size-4" strokeWidth={1.75} /> Demo clinic: no phone number
        </p>
      </div>
      {c.facilities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {c.facilities.map((x) => (
            <Tag key={x} tone="muted">
              {x}
            </Tag>
          ))}
        </div>
      )}
      <a href={c.mapUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-[14px] font-medium text-ink hover:underline">
        Open in Google Maps <ExternalLink className="size-3.5" strokeWidth={1.75} />
      </a>
    </Card>
  );
  /** what the open tab shows; `insta` is the square, edge-to-edge post grid */
  const body = (insta: boolean) => (
    <div key={tab} role="tabpanel" className="fmd-enter grid gap-5">
      {tab === "posts" && (posts.length ? <PostGrid posts={posts} square={insta} /> : noPosts(insta))}
      {tab === "about" && about}
      {tab === "reviews" && <ReviewsSection dentistId={p.id} />}
      {tab === "book" && (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          {times}
          {fees}
        </div>
      )}
      {tab === "clinic" && clinic}
    </div>
  );

  /* ---- layout 1: Instagram style ---- */
  const insta = (
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
        {trust}
        <p className="flex items-center gap-2">
          <Languages className="size-4 text-ink-3" strokeWidth={1.75} /> Consults in {p.languages.join(", ")}
        </p>
        <Link href={`/clinics/${c.id}`} className="flex w-fit items-center gap-2 font-medium text-sky-400 hover:underline">
          <Building2 className="size-4" strokeWidth={1.75} /> {c.name}, {c.city}
        </Link>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">{actions}</div>
        {claimNote && <div className="mt-2">{claimNote}</div>}
      </div>
      {p.serviceFees.length > 0 && (
        <ul aria-label="Treatments" className="-mx-4 flex gap-5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-8">
          {p.serviceFees.map((f) => (
            <li key={f.service} className="shrink-0">
              <button type="button" onClick={() => setPicked("book")} className="grid w-[76px] justify-items-center gap-1.5 text-center">
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
              onClick={() => setPicked(t)}
              className={`-mt-px flex h-12 items-center justify-center gap-1.5 border-t text-[12px] font-semibold uppercase tracking-[0.08em] ${tab === t ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}
            >
              {t === "posts" ? <Grid3x3 className="size-4" strokeWidth={1.75} /> : <Icon className="size-4" strokeWidth={1.75} />}
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>
        <div className={tab === "posts" ? "" : "pt-5"}>{body(true)}</div>
      </div>
    </div>
  );

  /* ---- layout 5: Instagram's structure, rearranged: photo on the right, square shapes, counts and buttons in rows, icon-only tabs ---- */
  const insta2 = (
    <div className="grid grid-cols-1 gap-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5 sm:gap-10 sm:px-8">
        <div className="grid min-w-0 content-start gap-2 text-[14px] text-ink-2">
          <h1 className="flex flex-wrap items-center gap-2 text-[22px] font-semibold text-ink sm:text-[26px]">
            {p.name}
            {tick}
            <Tag tone="muted">Demo</Tag>
          </h1>
          <p className="font-semibold text-ink">{p.specialty}</p>
          {trust}
          <p className="flex items-center gap-1.5">
            <Languages className="size-3.5 text-ink-3" strokeWidth={2} /> {p.languages.join(", ")}
          </p>
          <Link href={`/clinics/${c.id}`} className="flex w-fit items-center gap-1.5 font-medium text-sky-400 hover:underline">
            <MapPin className="size-3.5" strokeWidth={2} /> {c.name}, {c.city}
          </Link>
        </div>
        <Ring>
          <Avatar p={p} className="size-20 !border-0 sm:size-32" />
        </Ring>
      </header>
      <ul className="grid grid-cols-3 divide-x divide-[var(--border)] rounded-2xl border border-line py-3 sm:mx-8">
        {stats.map(([n, label]) => (
          <li key={label} className="grid justify-items-center text-[12.5px] text-ink-3">
            <span className="text-[18px] font-semibold text-ink">{n}</span> {label}
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 sm:px-8">
        <Link href={`/book/${p.id}`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-sky-600 text-[14px] font-semibold text-white hover:bg-sky-500">
          <CalendarClock className="size-4" strokeWidth={2} /> {avail.mode === "live" ? "Book" : "Request"}
        </Link>
        <button type="button" onClick={follow} aria-pressed={followed} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white/[0.08] text-[14px] font-semibold text-ink hover:bg-white/[0.12]">
          {followed ? "Following" : (<><Plus className="size-4" strokeWidth={2.5} /> Follow</>)}
        </button>
        <button type="button" onClick={save} aria-pressed={saved} aria-label={saved ? "Saved" : "Save"} title={saved ? "Saved" : "Save"} className={`grid size-9 place-items-center rounded-xl hover:bg-white/[0.12] ${saved ? "bg-sky-500/20 text-sky-300" : "bg-white/[0.08] text-ink"}`}>
          <SaveIcon className="size-4" strokeWidth={2} />
        </button>
      </div>
      {claimNote && <div className="sm:px-8">{claimNote}</div>}
      {p.serviceFees.length > 0 && (
        <ul aria-label="Treatments" className="-mx-4 flex gap-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-8">
          {p.serviceFees.map((f) => (
            <li key={f.service} className="shrink-0">
              <button type="button" onClick={() => setPicked("book")} className="grid w-[76px] justify-items-center gap-1.5 text-center">
                <span className="block rounded-[32%] border-2 border-sky-500/60 p-[3px]">
                  <span className={`grid size-16 place-items-center rounded-[28%] bg-gradient-to-br ${coverOf(f.service)} to-transparent text-[15px] font-semibold text-ink`}>{short(f.service)}</span>
                </span>
                <span className="w-full truncate text-[12px] font-medium text-ink-2">{f.service}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div>
        <div role="tablist" aria-label="Profile" className="grid grid-cols-5 border-b border-line">
          {PROFILE_TABS.map(([t, label, Icon]) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              aria-label={label}
              title={label}
              onClick={() => setPicked(t)}
              className={`-mb-px grid h-12 place-items-center border-b-2 transition-colors ${tab === t ? "border-sky-400 text-sky-300" : "border-transparent text-ink-3 hover:text-ink"}`}
            >
              <Icon className="size-[22px]" strokeWidth={tab === t ? 2.1 : 1.75} />
            </button>
          ))}
        </div>
        <div className={tab === "posts" ? "pt-1" : "pt-5"}>{body(true)}</div>
      </div>
    </div>
  );

  /* ---- layout 2: cards ---- */
  const cards = (
    <div className="grid grid-cols-1 gap-6">
      <header className="overflow-hidden rounded-3xl border border-line bg-[var(--surface)]">
        <div aria-hidden className={`h-24 bg-gradient-to-r ${coverOf(p.specialty)} to-transparent sm:h-32`} />
        <div className="grid gap-4 px-4 pb-5 sm:px-6">
          <div className="-mt-10 flex items-end justify-between gap-3 sm:-mt-14">
            <Avatar p={p} className="size-20 !rounded-[30%] !border-4 !border-[var(--surface)] sm:size-28" />
            <div className="hidden flex-wrap justify-end gap-2 sm:flex">{actions}</div>
          </div>
          <div className="grid gap-2 text-[14px] text-ink-2">
            <h1 className="flex flex-wrap items-center gap-2 text-[21px] font-semibold text-ink sm:text-[24px]">
              {p.name}
              {tick}
              <Tag tone="muted">Demo</Tag>
            </h1>
            <p className="font-semibold text-ink">{p.specialty}</p>
            {trust}
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <Languages className="size-4 text-ink-3" strokeWidth={1.75} /> Consults in {p.languages.join(", ")}
              </span>
              <Link href={`/clinics/${c.id}`} className="inline-flex items-center gap-1.5 font-medium text-sky-400 hover:underline">
                <Building2 className="size-4" strokeWidth={1.75} /> {c.name}, {c.city}
              </Link>
            </p>
          </div>
          <ul className="grid grid-cols-3 gap-2 sm:max-w-[480px]">
            {stats.map(([n, label]) => (
              <li key={label} className="grid gap-0.5 rounded-2xl bg-white/[0.04] px-3 py-2.5 text-[12.5px] leading-tight text-ink-3">
                <span className="text-[18px] font-semibold text-ink">{n}</span> {label}
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2 sm:hidden">{actions}</div>
        </div>
      </header>
      {claimNote}
      {p.serviceFees.length > 0 && (
        <ul aria-label="Treatments" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          {p.serviceFees.map((f) => (
            <li key={f.service} className="shrink-0">
              <button type="button" onClick={() => setPicked("book")} className="flex h-11 items-center gap-2.5 rounded-xl border border-line bg-[var(--surface)] pl-1.5 pr-3.5 text-[13.5px] text-ink-2 hover:border-line-strong hover:text-ink">
                <span className={`grid size-8 place-items-center rounded-lg bg-gradient-to-br ${coverOf(f.service)} to-transparent text-[11.5px] font-semibold text-ink`}>{short(f.service)}</span>
                {f.service}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div>
        <div role="tablist" aria-label="Profile" className="mb-4 grid grid-cols-5 gap-1 rounded-2xl border border-line bg-[var(--surface-glass)] p-1">
          {PROFILE_TABS.map(([t, label, Icon]) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              aria-label={label}
              onClick={() => setPicked(t)}
              className={`flex h-10 items-center justify-center gap-1.5 rounded-xl text-[13px] font-medium transition-colors ${tab === t ? "bg-sky-500/20 text-sky-200" : "text-ink-3 hover:bg-white/[0.05] hover:text-ink"}`}
            >
              <Icon className="size-4" strokeWidth={1.75} />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>
        {body(false)}
      </div>
    </div>
  );

  /* ---- layout 3: LinkedIn style: a top card, then each part as its own section, and a side column ---- */
  const liCard = "rounded-xl border border-line bg-[var(--surface)]";
  const liPill = "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-colors";
  const liTitle = "text-[19px] font-semibold text-ink";
  const linkedin = (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid min-w-0 grid-cols-1 gap-3">
        <header className={`overflow-hidden ${liCard}`}>
          <div aria-hidden className={`h-28 bg-gradient-to-r ${coverOf(p.specialty)} to-transparent sm:h-44`} />
          <div className="px-4 pb-5 sm:px-6">
            <Avatar p={p} className="relative z-10 -mt-14 size-28 !rounded-full !border-4 !border-[var(--surface)] sm:-mt-24 sm:size-40" />
            <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="grid min-w-0 content-start gap-1.5">
                <h1 className="flex flex-wrap items-center gap-2 text-[22px] font-semibold text-ink sm:text-[24px]">
                  {p.name}
                  {tick}
                  <Tag tone="muted">Demo</Tag>
                </h1>
                <p className="text-[15px] text-ink">
                  {p.specialty} · {p.qualifications.join(", ")}
                </p>
                <p className="text-[13.5px] text-ink-3">
                  {c.city} ·{" "}
                  <a href="#clinic-info" className="font-semibold text-sky-400 hover:underline">
                    Contact info
                  </a>
                </p>
                <p className="text-[13.5px] font-semibold text-sky-400">
                  <a href="#reviews" className="hover:underline">
                    {reviewCount ?? "–"} reviews
                  </a>
                  {" · "}
                  <a href="#activity" className="hover:underline">
                    {posts.length} posts
                  </a>
                  {p.experienceYears ? ` · ${p.experienceYears} years' experience` : ""}
                </p>
                <div className="mt-1 grid gap-1.5">{trust}</div>
              </div>
              <Link href={`/clinics/${c.id}`} className="flex h-fit items-center gap-2.5 text-[14px] font-semibold text-ink hover:underline sm:max-w-[220px]">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-sky-500/20 text-sky-200">
                  <Building2 className="size-5" strokeWidth={1.75} />
                </span>
                <span className="truncate">{c.name}</span>
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/book/${p.id}`} className={`${liPill} bg-sky-600 text-white hover:bg-sky-500`}>
                {bookLabel}
              </Link>
              <button type="button" onClick={follow} aria-pressed={followed} className={`${liPill} border border-sky-500 text-sky-300 hover:bg-sky-500/10`}>
                {followed ? "Following" : (<><Plus className="size-4" strokeWidth={2.5} /> Follow</>)}
              </button>
              <button type="button" onClick={save} aria-pressed={saved} className={`${liPill} border border-line-strong text-ink-2 hover:bg-white/[0.06] hover:text-ink`}>
                <SaveIcon className="size-4" strokeWidth={2} /> {saved ? "Saved" : "Save"}
              </button>
            </div>
          </div>
        </header>
        {claimNote}
        <section className={`grid gap-3 p-4 sm:p-6 ${liCard}`}>
          <h2 className={liTitle}>About</h2>
          <p className="text-[14.5px] text-ink-2">{p.bio}</p>
          <p className="flex items-center gap-2 text-[14px] text-ink-2">
            <Languages className="size-4 text-ink-3" strokeWidth={1.75} /> Consults in {p.languages.join(", ")}
          </p>
        </section>
        {p.serviceFees.length > 0 && (
          <section className={`grid gap-3 p-4 sm:p-6 ${liCard}`}>
            <h2 className={liTitle}>Treatments</h2>
            <ul className="divide-y divide-[var(--border)]">
              <li className="flex justify-between gap-3 py-2.5 text-[14px]">
                <span className="text-ink">Consultation</span>
                <span className="text-ink-2">{p.fee ? feeRange(p.fee) : "Confirmed by the clinic"}</span>
              </li>
              {p.serviceFees.map((f) => (
                <li key={f.service} className="flex justify-between gap-3 py-2.5 text-[14px]">
                  <span className="flex items-center gap-3 text-ink">
                    <span className={`grid size-9 place-items-center rounded-md bg-gradient-to-br ${coverOf(f.service)} to-transparent text-[11.5px] font-semibold`}>{short(f.service)}</span>
                    {f.service}
                  </span>
                  <span className="self-center text-ink-2">{feeRange(f)}</span>
                </li>
              ))}
            </ul>
            <p className="text-[12.5px] text-ink-3">Typical ranges (demo estimates), not quotes.</p>
          </section>
        )}
        <section className={`grid gap-3 p-4 sm:p-6 ${liCard}`}>
          <h2 className={liTitle}>Education</h2>
          <ul className="grid gap-3">
            {p.qualifications.map((q) => (
              <li key={q} className="flex items-center gap-3 text-[14.5px] text-ink">
                <span className="grid size-11 place-items-center rounded-md bg-white/[0.07] text-ink-2">
                  <GraduationCap className="size-5" strokeWidth={1.75} />
                </span>
                {q}
              </li>
            ))}
          </ul>
        </section>
        <section id="activity" className={`scroll-mt-24 grid gap-3 p-4 sm:p-6 ${liCard}`}>
          <h2 className={liTitle}>Activity</h2>
          {posts.length ? <PostGrid posts={posts} /> : <p className="text-[14px] text-ink-3">{p.name} hasn&apos;t posted yet.</p>}
        </section>
        <section id="reviews" className={`scroll-mt-24 grid gap-3 p-4 sm:p-6 ${liCard}`}>
          <h2 className={liTitle}>Reviews</h2>
          <ReviewsSection dentistId={p.id} />
        </section>
      </div>
      <aside id="clinic-info" className="grid scroll-mt-24 gap-3">
        {times}
        {clinic}
      </aside>
    </div>
  );

  /* ---- layout 4: Facebook style: wide cover, big round photo, a tab bar, Intro on the left and posts on the right ---- */
  const fbCard = "rounded-xl border border-line bg-[var(--surface)] p-4";
  const fbGrey = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white/[0.1] px-3 text-[14.5px] font-semibold text-ink hover:bg-white/[0.15]";
  const intro = (
    <section className={`grid gap-3 ${fbCard}`}>
      <h2 className="text-[20px] font-bold text-ink">Intro</h2>
      <p className="text-center text-[15px] text-ink">{p.bio}</p>
      <ul className="grid gap-3 text-[15px] text-ink-2">
        <li className="flex items-center gap-3">
          <Building2 className="size-5 shrink-0 text-ink-3" strokeWidth={1.75} />
          <span>
            Works at{" "}
            <Link href={`/clinics/${c.id}`} className="font-semibold text-ink hover:underline">
              {c.name}
            </Link>
          </span>
        </li>
        <li className="flex items-center gap-3">
          <GraduationCap className="size-5 shrink-0 text-ink-3" strokeWidth={1.75} /> <span>Studied <b className="font-semibold text-ink">{p.qualifications.join(", ")}</b></span>
        </li>
        <li className="flex items-center gap-3">
          <MapPin className="size-5 shrink-0 text-ink-3" strokeWidth={1.75} /> <span>Practises in <b className="font-semibold text-ink">{c.city}</b></span>
        </li>
        <li className="flex items-center gap-3">
          <Languages className="size-5 shrink-0 text-ink-3" strokeWidth={1.75} /> Speaks {p.languages.join(", ")}
        </li>
        {p.experienceYears && (
          <li className="flex items-center gap-3">
            <Clock3 className="size-5 shrink-0 text-ink-3" strokeWidth={1.75} /> {p.experienceYears} years&apos; experience
          </li>
        )}
      </ul>
      <div className="grid gap-1.5">{trust}</div>
    </section>
  );
  const fbTreatments = p.serviceFees.length > 0 && (
    <section className={`grid gap-3 ${fbCard}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-bold text-ink">Treatments</h2>
        <button type="button" onClick={() => setPicked("book")} className="rounded-md px-2 py-1 text-[15px] text-[#4599ff] hover:bg-white/[0.06]">
          See fees
        </button>
      </div>
      <ul className="grid grid-cols-3 gap-2">
        {p.serviceFees.map((f) => (
          <li key={f.service}>
            <button type="button" onClick={() => setPicked("book")} className="grid w-full gap-1 text-left text-[13px] font-semibold leading-tight text-ink hover:underline">
              <span className={`grid aspect-square place-items-center rounded-lg bg-gradient-to-br ${coverOf(f.service)} to-[var(--surface-elevated)] text-[20px]`}>{short(f.service)}</span>
              <span className="line-clamp-2">{f.service}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
  const facebook = (
    <div className="grid grid-cols-1 gap-4">
      <header className="-mx-4 overflow-hidden bg-[var(--surface)] sm:mx-0 sm:rounded-xl sm:border sm:border-line">
        <div aria-hidden className={`h-[180px] bg-gradient-to-br ${coverOf(p.specialty)} to-indigo-500/10 sm:h-[300px] sm:rounded-b-xl`} />
        <div className="px-4 sm:px-8">
          <div className="flex flex-col items-center gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:gap-5">
            <Avatar p={p} className="relative z-10 -mt-[84px] size-[168px] !rounded-full !border-4 !border-[var(--surface)] sm:-mt-[42px]" />
            <div className="grid min-w-0 flex-1 justify-items-center gap-1 pb-1 sm:justify-items-start">
              <h1 className="flex flex-wrap items-center justify-center gap-2 text-[30px] font-bold leading-tight text-ink sm:justify-start">
                {p.name}
                {tick}
              </h1>
              <p className="text-[15px] font-semibold text-ink-3">
                {p.specialty} · {posts.length} posts · {reviewCount ?? "–"} reviews
              </p>
              <Tag tone="muted">Demo</Tag>
            </div>
            <div className="flex w-full flex-wrap justify-center gap-2 pb-1 sm:w-auto">
              <Link href={`/book/${p.id}`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1877f2] px-3 text-[14.5px] font-semibold text-white hover:bg-[#166fe5] sm:flex-none">
                <CalendarClock className="size-4" strokeWidth={2} /> <span className="sm:hidden">{avail.mode === "live" ? "Book" : "Request"}</span>
                <span className="hidden sm:inline">{bookLabel}</span>
              </Link>
              <button type="button" onClick={follow} aria-pressed={followed} className={`${fbGrey} flex-1 sm:flex-none`}>
                {followed ? "Following" : (<><Plus className="size-4" strokeWidth={2.5} /> Follow</>)}
              </button>
              <button type="button" onClick={save} aria-pressed={saved} aria-label={saved ? "Saved" : "Save"} className={fbGrey}>
                <SaveIcon className="size-4" strokeWidth={2} />
              </button>
            </div>
          </div>
          <div role="tablist" aria-label="Profile" className="-mx-1 flex overflow-x-auto [scrollbar-width:none]">
            {PROFILE_TABS.map(([t, label]) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setPicked(t)}
                className={`relative h-[52px] shrink-0 rounded-lg px-4 text-[15px] font-semibold transition-colors ${tab === t ? "text-[#4599ff] after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:bg-[#4599ff]" : "text-ink-3 hover:bg-white/[0.06]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>
      {claimNote}
      {tab === "posts" ? (
        <div key="posts" className="fmd-enter grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="grid gap-4 lg:sticky lg:top-24">
            {intro}
            {fbTreatments}
          </div>
          <div className="grid min-w-0 gap-4">
            <div className={`flex items-center justify-between ${fbCard}`}>
              <h2 className="text-[20px] font-bold text-ink">Posts</h2>
              <Link href="/explore" className={fbGrey}>
                Explore
              </Link>
            </div>
            {posts.length ? (
              posts.map((x) => (
                <div key={x.id} className={fbCard}>
                  <PostCard p={x} userId={me?.id ?? null} onChange={reload} />
                </div>
              ))
            ) : (
              <div className={fbCard}>{noPosts(false)}</div>
            )}
          </div>
        </div>
      ) : (
        body(false)
      )}
    </div>
  );

  return (
    <div className={`mx-auto grid w-full grid-cols-1 gap-4 ${layout === "linkedin" || layout === "facebook" ? "max-w-[1128px]" : "max-w-[935px]"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Back />
        <LayoutPicker value={layout} onChange={pickLayout} />
      </div>
      <div key={layout} className="fmd-enter">
        {layout === "insta" ? insta : layout === "insta2" ? insta2 : layout === "cards" ? cards : layout === "facebook" ? facebook : linkedin}
      </div>
      {claiming && <ClaimSheet me={me ?? null} p={p} onClose={() => setClaiming(false)} onDone={(c) => (setClaim(c), setClaiming(false))} />}
    </div>
  );
}

/** Post covers as rounded tiles, 2 across on phones and 3 on wider screens; hover shows the counts. Also the account page's tabs. */
export function PostGrid({ posts, square = false }: { posts: FeedItem[]; square?: boolean }) {
  // the profile page's Instagram-style layout: 3 across, square, edge to edge
  if (square)
    return (
      <ul className="grid grid-cols-3 gap-1">
        {posts.map((x) => (
          <li key={x.id}>
            <Link href={`/explore/${x.id}`} className={`group relative grid aspect-square content-center justify-items-center gap-2 overflow-hidden bg-gradient-to-br ${coverOf(x.topic)} to-transparent p-2 text-center sm:p-4`}>
              {x.media && x.kind === "image" && (
                <span className="relative block h-10 w-14 overflow-hidden rounded-md sm:h-16 sm:w-20">
                  <Image src={x.media.src} alt="" fill sizes="80px" className="object-cover" />
                </span>
              )}
              <span className="line-clamp-3 text-[11.5px] font-semibold leading-tight text-ink sm:text-[15px]">{x.title}</span>
              {x.kind === "video" && <Clapperboard aria-label="Video" className="absolute right-2 top-2 size-4 text-ink" strokeWidth={1.75} />}
              {x.kind === "poll" && <BarChart3 aria-label="Poll" className="absolute right-2 top-2 size-4 text-ink" strokeWidth={1.75} />}
              <span className="absolute inset-0 hidden items-center justify-center gap-5 bg-black/55 text-[15px] font-semibold text-white group-hover:flex">
                <span className="flex items-center gap-1.5">
                  <Heart className="size-5 fill-white" strokeWidth={0} /> {x.likes}
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="size-5 -scale-x-100 fill-white" strokeWidth={0} /> {x.comments}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    );
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {posts.map((x) => (
        <li key={x.id}>
          <Link href={`/explore/${x.id}`} className={`group relative grid aspect-[4/5] content-end gap-2 overflow-hidden rounded-2xl border border-line bg-gradient-to-tr ${coverOf(x.topic)} to-transparent p-3 sm:p-4`}>
            {x.media && x.kind === "image" && (
              <span className="relative block h-12 w-16 overflow-hidden rounded-lg sm:h-16 sm:w-20">
                <Image src={x.media.src} alt="" fill sizes="80px" className="object-cover" />
              </span>
            )}
            <span className="line-clamp-3 text-[13px] font-semibold leading-tight text-ink sm:text-[15px]">{x.title}</span>
            {x.kind === "video" && <SquarePlay aria-label="Video" className="absolute left-3 top-3 size-[18px] text-ink" strokeWidth={1.75} />}
            {x.kind === "poll" && <BarChart3 aria-label="Poll" className="absolute left-3 top-3 size-[18px] text-ink" strokeWidth={1.75} />}
            <span className="absolute inset-x-2 top-2 hidden justify-end gap-1.5 text-[12.5px] font-semibold text-white group-hover:flex">
              <span className="flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 backdrop-blur">
                <ThumbsUp className="size-3.5" strokeWidth={2} /> {x.likes}
              </span>
              <span className="flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 backdrop-blur">
                <MessageSquare className="size-3.5" strokeWidth={2} /> {x.comments}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** A few open times to tap straight into booking, or how a clinic without a connected calendar works. */
function Times({ p, avail }: { p: ProviderProfile; avail: Availability }) {
  if (avail.mode === "request")
    return (
      <>
        <p className="text-[14px] text-ink-2">This clinic hasn&apos;t connected its calendar. Ask for a day and part of the day, and the clinic confirms an exact time, usually within a day.</p>
        <ButtonLink href={`/book/${p.id}`} variant="secondary">
          Request an appointment
        </ButtonLink>
      </>
    );
  if (!avail.slots.length) return <p className="text-[14px] text-ink-2">No open times this week. Check back soon, or ask FMD Edge to help.</p>;
  const days = [...new Set(avail.slots.map(istDate))].slice(0, 3);
  return (
    <>
      {days.map((d) => (
        <div key={d}>
          <p className="mb-1.5 text-[13px] text-ink-3">{dayLabel(noonOf(d))}</p>
          <div className="flex flex-wrap gap-1.5">
            {avail.slots
              .filter((t) => istDate(t) === d)
              .slice(0, 6)
              .map((t) => (
                <Link
                  key={t}
                  href={`/book/${p.id}?slot=${t}`}
                  className="inline-flex h-9 items-center rounded-full border border-line px-3.5 text-[13.5px] text-ink hover:border-[var(--accent)]"
                  aria-label={`Book ${dayLabel(t)} at ${timeLabel(t)}`}
                >
                  {timeLabel(t)}
                </Link>
              ))}
          </div>
        </div>
      ))}
      <p className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
        <CalendarClock className="size-3.5" strokeWidth={1.75} /> Live from the clinic&apos;s calendar (demo)
      </p>
      <ButtonLink href={`/book/${p.id}`} variant="secondary">
        See all times
      </ButtonLink>
    </>
  );
}

/* ---------------- claim a profile ---------------- */

function ClaimSheet({ me, p, onClose, onDone }: { me: Me | null; p: ProviderProfile; onClose: () => void; onDone: (c: Claim) => void }) {
  const reg = me?.dentist_profile;
  const [f, setF] = useState({ full_name: me?.full_name ?? "", council: reg?.council ?? "", registration_no: reg?.registration_no ?? "", confirm: false });
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileId = useId();

  if (!me)
    return (
      <Sheet title="Claim this profile" onClose={onClose}>
        <div className="grid gap-4">
          <p className="text-[14.5px] text-ink-2">Log in or create an account first, so FMD knows who&apos;s asking.</p>
          <ButtonLink href={`/login?next=${encodeURIComponent(`/dentists/${p.id}`)}`}>Log in to claim</ButtonLink>
        </div>
      </Sheet>
    );

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      onDone(await submitClaim(me.id, p.id, f, file));
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title={`Claim ${p.name}'s profile`} onClose={onClose}>
      <form onSubmit={send} className="grid gap-4">
        <p className="text-[14px] text-ink-2">FMD checks your registration before the profile becomes yours. Only FMD&apos;s verification team sees your certificate.</p>
        {err && <Notice kind="error">{err}</Notice>}
        <Field label="Your full name">
          <input className={fieldCls} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} maxLength={200} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Dental council">
            <input className={fieldCls} value={f.council} onChange={(e) => setF({ ...f, council: e.target.value })} maxLength={100} required />
          </Field>
          <Field label="Registration number">
            <input className={fieldCls} value={f.registration_no} onChange={(e) => setF({ ...f, registration_no: e.target.value })} maxLength={50} required />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor={fileId}
            className="inline-flex h-9 cursor-pointer items-center rounded-full border border-line bg-[var(--button-secondary)] px-4 text-[13px] font-semibold text-ink hover:border-line-strong focus-within:border-[var(--accent)]"
          >
            {file ? "Replace certificate" : "Upload registration certificate"}
          </label>
          <input id={fileId} type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {file && <span className="break-all text-[13.5px] text-ink-2">{file.name}</span>}
        </div>
        <label className="flex items-start gap-2.5 text-[14px] text-ink">
          <input type="checkbox" checked={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.checked })} className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]" />
          I am {p.name}, and the details I&apos;ve given are true.
        </label>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send claim"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

/* ---------------- /clinics/[id] ---------------- */

export function ClinicView() {
  const { id } = useParams<{ id: string }>();
  const [c, setC] = useState<ClinicPage | null | undefined>(undefined);
  useEffect(() => {
    getClinicPage(id).then(setC);
  }, [id]);
  if (c === undefined) return <div className="app-panel h-64 animate-pulse" aria-busy />;
  if (c === null) return <NotFound what="clinic" />;
  return (
    <div className="grid gap-5">
      <Back />
      <Panel className="grid gap-3 p-5 sm:p-6">
        <h1 className="flex flex-wrap items-center gap-3 text-[22px] font-medium text-ink">
          {c.name} <Tag tone="muted">Demo</Tag>
        </h1>
        <div className="grid gap-1.5 text-[14px] text-ink-2">
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-ink-3" strokeWidth={1.75} /> {c.address}, {c.city}
          </p>
          <p className="flex items-center gap-2">
            <Clock3 className="size-4 text-ink-3" strokeWidth={1.75} /> {c.hours}
          </p>
          <p className="flex items-center gap-2">
            <CalendarClock className="size-4 text-ink-3" strokeWidth={1.75} />
            {c.live ? "Book online: this clinic's calendar is connected." : "This clinic confirms a time after you ask."}
          </p>
        </div>
        {c.facilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {c.facilities.map((x) => (
              <Tag key={x} tone="muted">
                {x}
              </Tag>
            ))}
          </div>
        )}
        <a href={c.mapUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-[14px] font-medium text-ink hover:underline">
          Open in Google Maps <ExternalLink className="size-3.5" strokeWidth={1.75} />
        </a>
      </Panel>
      <section className="grid gap-3">
        <h2 className="text-[17px] font-medium text-ink">Dentists at this clinic</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {c.dentists.map((d) => (
            <DentistCard key={d.id} p={d} />
          ))}
        </div>
      </section>
      <Card title="Treatments offered">
        <div className="flex flex-wrap gap-1.5">
          {c.services.map((s) => (
            <Tag key={s} tone="muted">
              {s}
            </Tag>
          ))}
        </div>
      </Card>
    </div>
  );
}
