"use client";

import { ArrowLeft, BadgeCheck, Bookmark, Briefcase, Building2, Camera, Check, Clapperboard, GraduationCap, Grid3x3, HeartPulse, LayoutGrid, MapPin, Shapes, SquarePlay, ChevronDown, ChevronRight, CreditCard, ArrowRight, Eye, Pencil, Lock, LogOut, Mail, Monitor, Settings, ShieldCheck, SlidersHorizontal, Smartphone, Stethoscope, UserPlus, UserRound, X, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button, ButtonLink, Panel, Tag } from "@/components/app/kit";
import { Field, fieldCls, Sheet } from "@/components/app/Sheet";
import { OtpStep, PasswordInput, useRun } from "@/components/auth/AuthForms";
import { Notice } from "@/components/Page";
import { account, deviceName, fmtPhone, initials, type Me, type Session } from "@/lib/fmd";
import { authChanged, logout, useRequireMe } from "@/lib/me";
import { ACCOUNT_TYPES, getAccountType, type AccountType } from "@/sample/onboarding";
import { getDocument } from "@/sample/dentist";
import { feed, following, getPost, type Author, type FeedItem } from "@/sample/content";
import { getSaved } from "@/sample/saved";
import { PostGrid } from "../dentists/Profile";
import { coverOf, PostCard, PostFeed, Ring } from "../explore/Explore";
import { PostsSkeleton } from "../Skeletons";
import { StoryAvatar, StoryViewer, useSeen, type Story } from "../explore/Stories";
import { STATUS, VerifyStatus } from "./Dentist";
import { LayoutPicker, useProfileLayout } from "../ProfileLayout";

/* ---------------- formatting ---------------- */

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const rtf = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });
function ago(iso: string) {
  const s = (Date.parse(iso) - Date.now()) / 1000;
  const a = Math.abs(s);
  if (a < 60) return "just now";
  if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}
const METHOD: Record<string, string> = { signup: "signed up", password: "password", otp: "OTP", mfa: "password and code" };

const submit = (fn: () => void) => (e: FormEvent) => {
  e.preventDefault();
  fn();
};

/* ---------------- /account: the profile ---------------- */

/** "Shortcuts for you" cards: the account's other pages, each a tap away (and dismissable) */
const SUGGESTIONS: { id: string; href: string; title: string; text: string; action: string; Icon: LucideIcon }[] = [
  { id: "membership", href: "/membership", title: "Membership", text: "Your plan, renewal, payments and receipts.", action: "Manage", Icon: CreditCard },
  { id: "personalise", href: "/account/personalisation", title: "Personalise", text: "Choose what Explore and suggestions show you.", action: "Set up", Icon: SlidersHorizontal },
  { id: "privacy", href: "/account/privacy", title: "Privacy", text: "Consents, messages, your data, or deleting it.", action: "Review", Icon: Lock },
  { id: "saved", href: "/saved", title: "Saved", text: "Dentists, posts and jobs you've kept.", action: "Open", Icon: Bookmark },
  { id: "dentist", href: "/account/dentist", title: "Dentist profile", text: "Are you a dentist? Get verified so patients find you.", action: "Open", Icon: Stethoscope },
];
const DISMISSED_KEY = "fmd-demo:dismissed-suggestions";

/** Demo highlights: little saved stories from a patient's dental year, opened in the story viewer. */
const HIGHLIGHTS: Story[] = [
  {
    id: "hl-checkups",
    name: "Check-ups",
    photo: "/img/tx-cleaning.png",
    slides: [
      { image: "/img/tx-cleaning.png", fit: "inset", tone: "from-emerald-500/40 via-teal-500/20", eyebrow: "March 2026", title: "Six-monthly check-up", text: "Scaling and polish at Demo Dental Studio. All clear, next visit in September. (Demo)" },
      { tone: "from-sky-500/40 via-indigo-500/20", eyebrow: "Tip from my dentist", title: "Floss once a day", text: "Brushing misses the gaps between teeth. Gentle flossing or interdental brushes reach them.", link: { href: "/explore", label: "More tips in Explore" } },
    ],
  },
  {
    id: "hl-aligners",
    name: "Aligners",
    photo: "/img/tx-aligners.png",
    slides: [
      { image: "/img/tx-aligners.png", fit: "inset", tone: "from-sky-500/40 via-blue-500/20", eyebrow: "Week 1", title: "First set of trays", text: "A bit tight for two days, then fine. 22 hours a day! (Demo)" },
      { image: "/img/tx-aligners.png", fit: "inset", tone: "from-violet-500/40 via-indigo-500/20", eyebrow: "Week 12", title: "Halfway there", text: "The gap at the front is nearly closed.", link: { href: "/dentists?specialty=Orthodontist", label: "Find orthodontists" } },
    ],
  },
  {
    id: "hl-whitening",
    name: "Whitening",
    photo: "/img/tx-whitening.png",
    slides: [
      { image: "/img/tx-whitening.png", fit: "inset", tone: "from-amber-500/40 via-rose-500/20", eyebrow: "Before the wedding", title: "In-clinic whitening", text: "Two shades brighter in one visit. Sensitivity for a day, then gone. (Demo)", link: { href: "/dentists?service=Teeth+Whitening", label: "Find whitening" } },
    ],
  },
  {
    id: "hl-implants",
    name: "Implants",
    photo: "/img/tx-implants.png",
    slides: [
      { image: "/img/tx-implants.png", fit: "inset", tone: "from-cyan-500/40 via-sky-500/20", eyebrow: "Reading up", title: "How implants work", text: "Assessment, placing the implant, healing, then the crown. It takes a few months. (Demo)", link: { href: "/dentists?service=Dental+Implants", label: "Find implant dentists" } },
    ],
  },
  {
    id: "hl-my-dentist",
    name: "My dentist",
    photo: "/dentists-pics/aditi-sharma.jpg",
    slides: [
      { image: "/dentists-pics/aditi-sharma.jpg", eyebrow: "Since 2024", title: "Dr. Aditi Sharma", text: "General Dentist at Demo Dental Studio, Koramangala. (Demo)", link: { href: "/dentists/aditi-sharma", label: "View profile" } },
    ],
  },
  {
    id: "hl-kids",
    name: "Kids",
    photo: "/dentists-pics/farah-khan.jpg",
    slides: [
      { image: "/dentists-pics/farah-khan.jpg", eyebrow: "First visit", title: "Aarav met the dentist!", text: "Dr. Farah Khan made it fun. No tears, one sticker. (Demo)", link: { href: "/dentists/farah-khan", label: "View profile" } },
    ],
  },
];

/** /account: a profile card (who you are, counts), shortcuts, highlights and what you've saved. Changes live in /account/settings. */
export function Account() {
  const me = useRequireMe();
  const [savedPosts, setSavedPosts] = useState<FeedItem[] | null>(null);
  // your own published posts (the reels are the videos among them), and which grid is showing
  const [mine, setMine] = useState<FeedItem[] | null>(null);
  const [grid, setGrid] = useState<"posts" | "reels" | "saved">("posts");
  const [savedDentists, setSavedDentists] = useState(0);
  // for the "Get verified" card: did they say they're a dentist, and have they sent their certificate?
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [certificate, setCertificate] = useState(false);
  const [follows, setFollows] = useState<Author[]>([]);
  const [showFollowing, setShowFollowing] = useState(false);
  const [watching, setWatching] = useState<{ list: Story[]; start: number } | null>(null);
  const [seen, markSeen] = useSeen();
  const [showSuggest, setShowSuggest] = useState(true);
  const [layout, pickLayout] = useProfileLayout();
  const [fbTab, setFbTab] = useState<"posts" | "about" | "photos" | "videos" | "saved">("posts");
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
  const userId = me?.id;
  // your posts and saves; again after a like or save on them (the Explore-style layout shows them as full posts)
  const loadPosts = useCallback(() => {
    if (!userId) return;
    getSaved(userId, "post")
      .then((ids) => Promise.all(ids.map((id) => getPost(userId, id))))
      .then((l) => setSavedPosts(l.filter((x): x is FeedItem => !!x)));
    feed(userId, "for_you").then((l) => setMine(l.filter((x) => x.author.id === `me-${userId}`)));
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    loadPosts();
    getSaved(userId, "dentist").then((l) => setSavedDentists(l.length));
    getAccountType(userId).then(setAccountType);
    getDocument(userId).then((d) => setCertificate(!!d));
    following(userId).then(setFollows);
  }, [userId, loadPosts]);
  if (!me) return <div className="app-panel h-40 animate-pulse" aria-busy />;

  const card = "rounded-xl border border-line bg-[var(--surface)]";
  const pill = "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-colors";
  const roleWords = [
    me.workspaces.some((w) => w.role === "owner") && "Clinic owner",
    (me.dentist_profile || accountType === "dentist") && "Dentist",
  ].filter(Boolean);
  const headline = [me.dentist_profile?.specialisation, ...roleWords].filter(Boolean).join(" · ") || "Patient on FindMyDentist";
  const clinic = me.workspaces[0];
  const sectionTitle = "text-[19px] font-semibold text-ink";

  const getVerifiedChip = (me.dentist_profile ? ["unverified", "rejected"].includes(me.dentist_profile.verification_status) : accountType === "dentist") && (
    <a href="#get-verified" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-sky-500/60 px-3 text-[13px] font-semibold text-sky-400 hover:bg-sky-500/10">
      <BadgeCheck className="size-4" strokeWidth={2} /> Get verified
    </a>
  );
  const status = (me.dentist_profile || accountType === "dentist") && <VerifyStatus status={me.dentist_profile?.verification_status ?? null} className="text-[14px]" />;
  const verifiedTick = me.dentist_profile?.verification_status === "verified" && <BadgeCheck className="size-5 text-sky-400" strokeWidth={2} aria-label="Verified dentist" />;
  const shortcuts = SUGGESTIONS.filter((x) => !dismissed.includes(x.id));
  const openHighlight = (i: number) => setWatching({ list: HIGHLIGHTS.map((x) => ({ ...x, name: `${me.full_name} · ${x.name}` })), start: i });
  const savedPanel = (insta: boolean) =>
    !savedPosts ? (
      <div className="aspect-[3/1] animate-pulse rounded-lg bg-[var(--surface-glass)]" aria-busy />
    ) : savedPosts.length ? (
      <PostGrid posts={savedPosts} square={insta} />
    ) : (
      <div className="grid justify-items-center gap-3 py-12 text-center">
        <span className={`grid size-16 place-items-center ${insta ? "rounded-full border-2 border-ink text-ink" : "rounded-3xl bg-sky-500/15 text-sky-300"}`}>
          <Bookmark className="size-7" strokeWidth={1.5} />
        </span>
        <p className="text-[20px] font-semibold text-ink">Save posts</p>
        <p className="text-[14px] text-ink-3">Tap the bookmark on a post in Explore to keep it here. Only you can see what you save.</p>
        <Link href="/explore" className="text-[14px] font-medium text-sky-400 hover:underline">
          Go to Explore
        </Link>
      </div>
    );
  const panel = (insta: boolean) => (
    <div key={grid} role="tabpanel" className="fmd-enter">
      {grid === "saved" ? savedPanel(insta) : <OwnGrid me={me} posts={mine} reels={grid === "reels"} insta={insta} />}
    </div>
  );

  /* ---- layout 1: Instagram style ---- */
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
  const insta = (
    <div className="mx-auto grid w-full max-w-[935px] grid-cols-1 gap-6">
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-5 sm:gap-12 sm:px-8">
        <Ring round>
          <span className="grid size-20 place-items-center rounded-full bg-[var(--surface-elevated)] text-[24px] font-semibold text-ink sm:size-36 sm:text-[44px]">{initials(me.full_name)}</span>
        </Ring>
        <div className="grid gap-3 sm:gap-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="flex items-center gap-2 text-[20px] font-medium text-ink sm:text-[22px]">
              {me.full_name}
              {verifiedTick}
            </p>
            {status}
            {getVerifiedChip}
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
            <button type="button" onClick={() => setShowFollowing(true)} className={instaStat}>
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
        {panel(true)}
      </section>
    </div>
  );

  /* ---- layout 6: Explore style: one narrow column like the feed, you as a post's author row, highlights as stories, your posts as full posts ---- */
  const chipBase = "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[13.5px] font-medium transition-colors";
  const feedPosts = grid === "saved" ? savedPosts : grid === "reels" ? (mine?.filter((x) => x.kind === "video") ?? null) : mine;
  const exploreStyle = (
    <div className="mx-auto grid w-full max-w-[470px] grid-cols-1 gap-4">
      <header className="flex items-center gap-3">
        <Ring>
          <span className="grid size-14 place-items-center bg-[var(--surface-elevated)] text-[17px] font-semibold text-ink">{initials(me.full_name)}</span>
        </Ring>
        <div className="min-w-0 flex-1 leading-tight">
          <h2 className="flex items-center gap-1 text-[17px] font-semibold text-ink">
            <span className="truncate">{me.full_name}</span>
            {verifiedTick}
          </h2>
          <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
            {headline}
            {me.city ? ` · ${me.city}` : ""}
          </p>
        </div>
        <Link href="/account/settings" className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-sky-600 px-3 text-[13px] font-semibold text-white hover:bg-sky-500">
          <Pencil className="size-3.5" strokeWidth={2.25} /> Edit
        </Link>
        <Link href="/account/settings" aria-label="Settings" title="Settings" className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-white/[0.06] hover:text-ink">
          <Settings className="size-[18px]" strokeWidth={1.75} />
        </Link>
      </header>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-ink-3">
        <button type="button" onClick={() => setGrid("saved")} className="hover:text-ink">
          <span className="font-semibold text-ink">{savedPosts?.length ?? "–"}</span> saved posts
        </button>
        <Link href="/saved" className="hover:text-ink">
          <span className="font-semibold text-ink">{savedDentists}</span> saved dentists
        </Link>
        <button type="button" onClick={() => setShowFollowing(true)} className="hover:text-ink">
          <span className="font-semibold text-ink">{follows.length}</span> following
        </button>
      </p>
      {(status || getVerifiedChip) && (
        <div className="flex flex-wrap items-center gap-3">
          {status}
          {getVerifiedChip}
        </div>
      )}
      <GetVerified me={me} accountType={accountType} certificate={certificate} />

      <ul aria-label="Highlights" className="-mx-4 flex gap-3.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {HIGHLIGHTS.map((h, i) => (
          <li key={h.id} className="shrink-0">
            <button type="button" onClick={() => openHighlight(i)} className="grid w-[74px] justify-items-center gap-1.5 text-center" aria-label={`Highlight: ${h.name}`}>
              <StoryAvatar name={h.name} photo={h.photo} size="size-16 text-[16px]" seen={seen.includes(h.id)} />
              <span className={`w-full truncate text-[11.5px] ${seen.includes(h.id) ? "text-ink-3" : "text-ink-2"}`}>{h.name}</span>
            </button>
          </li>
        ))}
      </ul>

      <div role="tablist" aria-label="Profile" className="flex gap-2 border-b border-line pb-4">
        {(
          [
            ["posts", "Posts", LayoutGrid],
            ["reels", "Videos", SquarePlay],
            ["saved", "Saved", Bookmark],
          ] as const
        ).map(([t, label, Icon]) => (
          <button key={t} role="tab" aria-selected={grid === t} onClick={() => setGrid(t)} className={`${chipBase} ${grid === t ? "bg-sky-500/20 text-sky-200" : "bg-white/[0.05] text-ink-2 hover:bg-white/[0.09] hover:text-ink"}`}>
            <Icon className="size-4" strokeWidth={1.75} /> {label}
          </button>
        ))}
      </div>
      <div key={grid} role="tabpanel">
        {!feedPosts ? (
          <PostsSkeleton />
        ) : feedPosts.length ? (
          <PostFeed posts={feedPosts} userId={me.id} onChange={loadPosts} />
        ) : grid === "saved" ? (
          savedPanel(false)
        ) : (
          <OwnGrid me={me} posts={[]} reels={grid === "reels"} />
        )}
      </div>
    </div>
  );

  /* ---- layout 5: Instagram's structure, rearranged: photo on the right, square shapes, stats and buttons in their own rows, icon-only tabs ---- */
  const insta2 = (
    <div className="mx-auto grid w-full max-w-[935px] grid-cols-1 gap-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5 sm:gap-10 sm:px-8">
        <div className="grid min-w-0 content-start gap-2">
          <p className="flex flex-wrap items-center gap-2 text-[22px] font-semibold text-ink sm:text-[26px]">
            {me.full_name}
            {verifiedTick}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {status}
            {getVerifiedChip}
          </div>
          <RoleTags me={me} accountType={accountType} />
          <div className="grid gap-0.5 text-[14px] text-ink-2">
            {me.dentist_profile?.specialisation && <p className="font-semibold text-ink">{me.dentist_profile.specialisation}</p>}
            <p className="flex items-center gap-1.5">
              <Smartphone className="size-3.5 text-ink-3" strokeWidth={2} /> {fmtPhone(me.phone)}
            </p>
            {me.email && (
              <p className="flex items-center gap-1.5 break-all">
                <Mail className="size-3.5 shrink-0 text-ink-3" strokeWidth={2} /> {me.email}
              </p>
            )}
            {me.city && (
              <p className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-ink-3" strokeWidth={2} /> {me.city}
              </p>
            )}
          </div>
        </div>
        <Ring>
          <span className="grid size-20 place-items-center bg-[var(--surface-elevated)] text-[24px] font-semibold text-ink sm:size-32 sm:text-[40px]">{initials(me.full_name)}</span>
        </Ring>
      </header>

      {/* the counts, in one row with dividers */}
      <div className="grid grid-cols-3 divide-x divide-[var(--border)] rounded-2xl border border-line py-3 sm:mx-8">
        <a href="#saved" onClick={() => setGrid("saved")} className="grid justify-items-center text-[12.5px] text-ink-3 hover:text-ink">
          <span className="text-[18px] font-semibold text-ink">{savedPosts?.length ?? "–"}</span> saved posts
        </a>
        <Link href="/saved" className="grid justify-items-center text-[12.5px] text-ink-3 hover:text-ink">
          <span className="text-[18px] font-semibold text-ink">{savedDentists}</span> saved dentists
        </Link>
        <button type="button" onClick={() => setShowFollowing(true)} className="grid justify-items-center text-[12.5px] text-ink-3 hover:text-ink">
          <span className="text-[18px] font-semibold text-ink">{follows.length}</span> following
        </button>
      </div>

      {/* the buttons, sharing one row */}
      <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 sm:px-8">
        <Link href="/account/settings" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-sky-600 text-[14px] font-semibold text-white hover:bg-sky-500">
          <Pencil className="size-4" strokeWidth={2} /> Edit profile
        </Link>
        <Link href="/saved" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white/[0.08] text-[14px] font-semibold text-ink hover:bg-white/[0.12]">
          <Bookmark className="size-4" strokeWidth={2} /> Saved
        </Link>
        <button type="button" aria-pressed={showSuggest} aria-label={showSuggest ? "Hide shortcuts" : "Show shortcuts"} title="Shortcuts" onClick={() => setShowSuggest((v) => !v)} className={`grid size-9 place-items-center rounded-xl ${showSuggest ? "bg-sky-500/20 text-sky-300" : "bg-white/[0.08] text-ink"} hover:bg-white/[0.12]`}>
          <Shapes className="size-4" strokeWidth={2} />
        </button>
        <Link href="/account/settings" aria-label="Settings" title="Settings" className="grid size-9 place-items-center rounded-xl bg-white/[0.08] text-ink hover:bg-white/[0.12]">
          <SlidersHorizontal className="size-4" strokeWidth={2} />
        </Link>
      </div>

      <GetVerified me={me} accountType={accountType} certificate={certificate} />

      {showSuggest && shortcuts.length > 0 && (
        <section aria-label="Discover" className="fmd-enter grid gap-3 sm:px-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-ink">Discover</h2>
            <Link href="/account/settings" className="text-[13.5px] font-semibold text-sky-400 hover:text-sky-300">
              See all
            </Link>
          </div>
          <ul className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
            {shortcuts.map(({ id, href, title, text, action, Icon }) => (
              <li key={id} className="relative grid w-[164px] shrink-0 justify-items-center gap-2 rounded-2xl border border-line bg-[var(--surface)] px-3 pb-3 pt-5 text-center">
                <button type="button" onClick={() => dismiss(id)} aria-label={`Dismiss ${title}`} className="absolute left-1.5 top-1.5 grid size-7 place-items-center rounded-lg text-ink-3 hover:bg-white/[0.06] hover:text-ink">
                  <X className="size-4" strokeWidth={2} />
                </button>
                <span className={`grid size-16 place-items-center rounded-[30%] bg-gradient-to-br ${coverOf(title)} to-[var(--surface-elevated)] text-ink`}>
                  <Icon className="size-7" strokeWidth={1.5} />
                </span>
                <p className="text-[14px] font-semibold text-ink">{id === "dentist" && me.dentist_profile ? "Your dentist profile" : title}</p>
                <p className="line-clamp-2 min-h-[2lh] text-[12px] leading-snug text-ink-3">{text}</p>
                <Link href={href} className="mt-1 w-full rounded-xl border border-sky-500/60 py-1.5 text-[13.5px] font-semibold text-sky-300 hover:bg-sky-500/10">
                  {id === "dentist" ? (me.dentist_profile ? "Edit" : "Set up") : action}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ul aria-label="Highlights" className="-mx-4 flex gap-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-8">
        {HIGHLIGHTS.map((h, i) => (
          <li key={h.id} className="shrink-0">
            <button type="button" onClick={() => openHighlight(i)} className="grid w-[76px] justify-items-center gap-1.5 text-center" aria-label={`Highlight: ${h.name}`}>
              <span className={`block rounded-[32%] border-2 p-[3px] ${seen.includes(h.id) ? "border-line" : "border-sky-500/70"}`}>
                <span className="relative block size-16 overflow-hidden rounded-[28%] bg-[var(--surface-elevated)]">
                  <Image src={h.photo!} alt="" fill sizes="64px" className="object-cover object-[center_20%]" />
                </span>
              </span>
              <span className="w-full truncate text-[12px] font-medium text-ink-2">{h.name}</span>
            </button>
          </li>
        ))}
      </ul>

      <section id="saved" aria-label="Your posts and saves" className="scroll-mt-24">
        <div role="tablist" aria-label="Profile" className="grid grid-cols-3 border-b border-line">
          {(
            [
              ["posts", "Posts", LayoutGrid],
              ["reels", "Videos", SquarePlay],
              ["saved", "Saved", Bookmark],
            ] as const
          ).map(([t, label, Icon]) => (
            <button
              key={t}
              role="tab"
              aria-selected={grid === t}
              aria-label={label}
              title={label}
              onClick={() => setGrid(t)}
              className={`-mb-px grid h-12 place-items-center border-b-2 transition-colors ${grid === t ? "border-sky-400 text-sky-300" : "border-transparent text-ink-3 hover:text-ink"}`}
            >
              <Icon className="size-[22px]" strokeWidth={grid === t ? 2.1 : 1.75} />
            </button>
          ))}
        </div>
        <div className="pt-1">{panel(true)}</div>
      </section>
    </div>
  );

  /* ---- layout 2: cards ---- */
  const stat = "grid gap-0.5 rounded-2xl bg-white/[0.04] px-3 py-2.5 text-left text-[12.5px] leading-tight text-ink-3 transition-colors hover:bg-white/[0.08]";
  const num = "text-[18px] font-semibold text-ink";
  const contact = "inline-flex items-center gap-1.5";
  const cardActions = (
    <>
      <ButtonLink href="/account/settings" variant="secondary" size="sm">
        Edit profile
      </ButtonLink>
      <ButtonLink href="/saved" variant="secondary" size="sm">
        Saved items
      </ButtonLink>
      <Button variant="secondary" size="sm" aria-pressed={showSuggest} aria-label={showSuggest ? "Hide shortcuts" : "Show shortcuts"} title="Shortcuts" onClick={() => setShowSuggest((v) => !v)} className="!px-3">
        <Shapes className="size-4" strokeWidth={2} />
      </Button>
      <Link href="/account/settings" aria-label="Settings" title="Settings" className="grid size-9 place-items-center rounded-xl border border-line text-ink hover:bg-[var(--surface-glass)]">
        <Settings className="size-[18px]" strokeWidth={1.75} />
      </Link>
    </>
  );
  const cards = (
    <div className="mx-auto grid w-full max-w-[935px] grid-cols-1 gap-6">
      <header className="overflow-hidden rounded-3xl border border-line bg-[var(--surface)]">
        <div aria-hidden className="h-24 bg-[linear-gradient(120deg,rgba(14,165,233,0.45),rgba(99,102,241,0.25)_55%,rgba(34,211,238,0.18))] sm:h-32" />
        <div className="grid gap-4 px-4 pb-5 sm:px-6">
          <div className="-mt-10 flex items-end justify-between gap-3 sm:-mt-14">
            <span className="relative grid size-20 shrink-0 place-items-center rounded-[30%] border-4 border-[var(--surface)] bg-[var(--surface-elevated)] text-[24px] font-semibold text-ink sm:size-28 sm:text-[34px]">{initials(me.full_name)}</span>
            <div className="hidden items-center gap-2 sm:flex">{cardActions}</div>
          </div>
          <div className="grid gap-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="flex items-center gap-2 text-[21px] font-semibold text-ink sm:text-[24px]">
                {me.full_name}
                {verifiedTick}
              </p>
              {status}
              {getVerifiedChip}
            </div>
            <RoleTags me={me} accountType={accountType} />
            {me.dentist_profile?.specialisation && <p className="text-[14px] font-semibold text-ink">{me.dentist_profile.specialisation}</p>}
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-ink-3">
              <span className={contact}>
                <Smartphone className="size-4" strokeWidth={1.75} /> {fmtPhone(me.phone)}
              </span>
              {me.email && (
                <span className={`${contact} break-all`}>
                  <Mail className="size-4 shrink-0" strokeWidth={1.75} /> {me.email}
                </span>
              )}
              {me.city && (
                <span className={contact}>
                  <MapPin className="size-4" strokeWidth={1.75} /> {me.city}
                </span>
              )}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:max-w-[480px]">
            <a href="#saved" onClick={() => setGrid("saved")} className={stat}>
              <span className={num}>{savedPosts?.length ?? "–"}</span> saved posts
            </a>
            <Link href="/saved" className={stat}>
              <span className={num}>{savedDentists}</span> saved dentists
            </Link>
            <button type="button" onClick={() => setShowFollowing(true)} className={stat}>
              <span className={num}>{follows.length}</span> following
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:hidden">{cardActions}</div>
        </div>
      </header>

      <GetVerified me={me} accountType={accountType} certificate={certificate} />

      {showSuggest && shortcuts.length > 0 && (
        <section aria-label="Shortcuts for you" className="fmd-enter grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-ink">Shortcuts for you</h2>
            <Link href="/account/settings" className="text-[13.5px] font-semibold text-sky-400 hover:text-sky-300">
              See all
            </Link>
          </div>
          <ul className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
            {shortcuts.map(({ id, href, title, text, action, Icon }) => (
              <li key={id} className="relative grid w-[176px] shrink-0 content-start justify-items-start gap-2 rounded-2xl border border-line bg-[var(--surface)] p-3.5 text-left">
                <button type="button" onClick={() => dismiss(id)} aria-label={`Dismiss ${title}`} className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full text-ink-3 hover:bg-white/[0.06] hover:text-ink">
                  <X className="size-4" strokeWidth={2} />
                </button>
                <span className={`grid size-11 place-items-center rounded-xl bg-gradient-to-br ${coverOf(title)} to-[var(--surface-elevated)] text-ink`}>
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <p className="text-[14px] font-semibold text-ink">{id === "dentist" && me.dentist_profile ? "Your dentist profile" : title}</p>
                <p className="line-clamp-2 min-h-[2lh] text-[12px] leading-snug text-ink-3">{text}</p>
                <Link href={href} className="mt-1 inline-flex items-center gap-1 text-[13.5px] font-semibold text-sky-400 hover:text-sky-300">
                  {id === "dentist" ? (me.dentist_profile ? "Edit" : "Set up") : action} <ChevronRight className="size-4" strokeWidth={2} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Highlights" className="grid gap-3">
        <h2 className="text-[14px] font-semibold text-ink">Highlights</h2>
        <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          {HIGHLIGHTS.map((h, i) => (
            <li key={h.id} className="shrink-0">
              <button
                type="button"
                onClick={() => openHighlight(i)}
                aria-label={`Highlight: ${h.name}`}
                className={`relative block h-[128px] w-[96px] overflow-hidden rounded-2xl border-2 bg-[var(--surface-elevated)] transition-transform hover:-translate-y-0.5 ${seen.includes(h.id) ? "border-line" : "border-sky-500/70"}`}
              >
                <Image src={h.photo!} alt="" fill sizes="96px" className="object-cover object-[center_20%]" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/85 to-transparent px-2 pb-2 pt-8 text-left text-[12px] font-semibold text-white">{h.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section id="saved" aria-label="Your posts and saves" className="scroll-mt-24">
        <div role="tablist" aria-label="Profile" className="mb-4 grid grid-cols-3 gap-1 rounded-2xl border border-line bg-[var(--surface-glass)] p-1">
          {(
            [
              ["posts", "Posts", LayoutGrid],
              ["reels", "Videos", SquarePlay],
              ["saved", "Saved", Bookmark],
            ] as const
          ).map(([t, label, Icon]) => (
            <button
              key={t}
              role="tab"
              aria-selected={grid === t}
              onClick={() => setGrid(t)}
              className={`flex h-10 items-center justify-center gap-1.5 rounded-xl text-[13.5px] font-medium transition-colors ${grid === t ? "bg-sky-500/20 text-sky-200" : "text-ink-3 hover:bg-white/[0.05] hover:text-ink"}`}
            >
              <Icon className="size-4" strokeWidth={1.75} /> {label}
            </button>
          ))}
        </div>
        {panel(false)}
      </section>
    </div>
  );

  /* ---- layout 4: Facebook style: wide cover, big round photo, a tab bar, Intro on the left and a feed on the right ---- */
  const fbCard = "rounded-xl border border-line bg-[var(--surface)] p-4";
  const fbGrey = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white/[0.1] px-3 text-[14.5px] font-semibold text-ink hover:bg-white/[0.15]";
  const fbBlue = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#1877f2] px-3 text-[14.5px] font-semibold text-white hover:bg-[#166fe5]";
  const firstName = me.full_name.replace(/^Dr\.?\s*/, "").split(" ")[0];
  const canPost = me.dentist_profile?.verification_status === "verified";
  const intro = (
    <section aria-label="Intro" className={`grid gap-3 ${fbCard}`}>
      <h2 className="text-[20px] font-bold text-ink">Intro</h2>
      {me.dentist_profile?.specialisation && <p className="text-center text-[15px] text-ink">{me.dentist_profile.specialisation}</p>}
      <ul className="grid gap-3 text-[15px] text-ink-2">
        {clinic && (
          <li className="flex items-center gap-3">
            <Building2 className="size-5 shrink-0 text-ink-3" strokeWidth={1.75} /> <span>Works at <b className="font-semibold text-ink">{clinic.clinic_name}</b></span>
          </li>
        )}
        {me.dentist_profile && (
          <li className="flex items-center gap-3">
            <BadgeCheck className="size-5 shrink-0 text-ink-3" strokeWidth={1.75} /> <span>Registered with <b className="font-semibold text-ink">{me.dentist_profile.council}</b></span>
          </li>
        )}
        {me.city && (
          <li className="flex items-center gap-3">
            <MapPin className="size-5 shrink-0 text-ink-3" strokeWidth={1.75} /> <span>Lives in <b className="font-semibold text-ink">{me.city}</b></span>
          </li>
        )}
        <li className="flex items-center gap-3">
          <Smartphone className="size-5 shrink-0 text-ink-3" strokeWidth={1.75} /> {fmtPhone(me.phone)}
        </li>
        {me.email && (
          <li className="flex items-center gap-3 break-all">
            <Mail className="size-5 shrink-0 text-ink-3" strokeWidth={1.75} /> {me.email}
          </li>
        )}
      </ul>
      <RoleTags me={me} accountType={accountType} />
      <Link href="/account/settings" className={`${fbGrey} w-full`}>
        Edit details
      </Link>
    </section>
  );
  const photos = (all: boolean) => (
    <section aria-label="Featured" className={`grid gap-3 ${fbCard}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-bold text-ink">Featured</h2>
        {!all && (
          <button type="button" onClick={() => setFbTab("photos")} className="rounded-md px-2 py-1 text-[15px] text-[#4599ff] hover:bg-white/[0.06]">
            See all
          </button>
        )}
      </div>
      <ul className={`grid gap-1.5 overflow-hidden rounded-lg ${all ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-3"}`}>
        {HIGHLIGHTS.slice(0, all ? undefined : 6).map((h, i) => (
          <li key={h.id}>
            <button type="button" onClick={() => openHighlight(i)} aria-label={`Featured: ${h.name}`} className="relative block aspect-square w-full overflow-hidden bg-[var(--surface-elevated)] hover:opacity-90">
              <Image src={h.photo!} alt="" fill sizes="160px" className="object-cover object-[center_20%]" />
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-4 text-left text-[11.5px] font-semibold text-white">{h.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
  const friends = (
    <section aria-label="Following" className={`grid gap-3 ${fbCard}`}>
      <div>
        <h2 className="text-[20px] font-bold text-ink">Following</h2>
        <p className="text-[15px] text-ink-3">{follows.length} dentists</p>
      </div>
      {follows.length ? (
        <ul className="grid grid-cols-3 gap-3">
          {follows.slice(0, 9).map((a) => (
            <li key={a.id}>
              <Link href={`/dentists/${a.id}`} className="grid gap-1 text-[13px] font-semibold leading-tight text-ink hover:underline">
                <span className="grid aspect-square place-items-center rounded-lg bg-[var(--surface-elevated)] text-[20px] font-semibold">{initials(a.name)}</span>
                <span className="line-clamp-2">{a.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14px] text-ink-3">
          Follow dentists from{" "}
          <Link href="/explore" className="font-semibold text-[#4599ff] hover:underline">
            Explore
          </Link>{" "}
          to see them here.
        </p>
      )}
    </section>
  );
  const fbFeed = (
    <div className="grid min-w-0 gap-4">
      {/* "What's on your mind?" */}
      <div className={`grid gap-3 ${fbCard}`}>
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--surface-elevated)] text-[13px] font-semibold text-ink">{initials(me.full_name)}</span>
          <Link href={canPost ? "/explore/new" : "/explore"} className="flex h-10 flex-1 items-center rounded-full bg-white/[0.08] px-4 text-[15px] text-ink-3 hover:bg-white/[0.12]">
            {canPost ? `What's on your mind, ${firstName}?` : "See what dentists are sharing…"}
          </Link>
        </div>
        <div className="grid grid-cols-3 border-t border-line pt-2 text-[14px] font-semibold text-ink-2">
          <Link href={canPost ? "/explore/new" : "/explore"} className="flex h-9 items-center justify-center gap-2 rounded-lg hover:bg-white/[0.06]">
            <SquarePlay className="size-5 text-rose-400" strokeWidth={1.75} /> Video
          </Link>
          <Link href={canPost ? "/explore/new" : "/explore"} className="flex h-9 items-center justify-center gap-2 rounded-lg hover:bg-white/[0.06]">
            <Camera className="size-5 text-emerald-400" strokeWidth={1.75} /> Photo
          </Link>
          <Link href="/saved" className="flex h-9 items-center justify-center gap-2 rounded-lg hover:bg-white/[0.06]">
            <Bookmark className="size-5 text-amber-400" strokeWidth={1.75} /> Saved
          </Link>
        </div>
      </div>
      <div className={`flex items-center justify-between ${fbCard}`}>
        <h2 className="text-[20px] font-bold text-ink">Posts</h2>
        {me.dentist_profile && (
          <Link href="/explore/mine" className={fbGrey}>
            <SlidersHorizontal className="size-4" strokeWidth={2} /> Manage posts
          </Link>
        )}
      </div>
      {mine === null ? (
        <div className={`h-40 animate-pulse ${fbCard}`} aria-busy />
      ) : mine.length ? (
        mine.map((p) => (
          <div key={p.id} className={fbCard}>
            <PostCard p={p} userId={me.id} onChange={() => feed(me.id, "for_you").then((l) => setMine(l.filter((x) => x.author.id === `me-${me.id}`)))} />
          </div>
        ))
      ) : (
        <div className={fbCard}>
          <OwnGrid me={me} posts={[]} reels={false} />
        </div>
      )}
    </div>
  );
  const FB_TABS = [
    ["posts", "Posts"],
    ["about", "About"],
    ["photos", "Featured"],
    ["videos", "Videos"],
    ["saved", "Saved"],
  ] as const;
  const facebook = (
    <div className="mx-auto grid w-full max-w-[1100px] grid-cols-1 gap-4">
      <header className="-mx-4 overflow-hidden bg-[var(--surface)] sm:mx-0 sm:rounded-xl sm:border sm:border-line">
        <div className="relative mx-auto h-[180px] max-w-[1100px] bg-[linear-gradient(135deg,rgba(24,119,242,0.55),rgba(99,102,241,0.35)_50%,rgba(34,211,238,0.25))] sm:h-[300px] sm:rounded-b-xl">
          <Link href="/account/settings" className={`${fbGrey} absolute bottom-3 right-3 bg-black/50 text-white hover:bg-black/60`}>
            <Camera className="size-4" strokeWidth={2} /> <span className="hidden sm:inline">Edit cover photo</span>
          </Link>
        </div>
        <div className="px-4 sm:px-8">
          <div className="flex flex-col items-center gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:gap-5">
            <span className="relative z-10 -mt-[84px] grid size-[168px] shrink-0 place-items-center rounded-full border-4 border-[var(--surface)] bg-[var(--surface-elevated)] text-[52px] font-semibold text-ink sm:-mt-[42px]">{initials(me.full_name)}</span>
            <div className="grid min-w-0 flex-1 justify-items-center gap-1 pb-1 sm:justify-items-start">
              <p className="flex flex-wrap items-center justify-center gap-2 text-[30px] font-bold leading-tight text-ink sm:justify-start">
                {me.full_name}
                {verifiedTick}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {status}
                {getVerifiedChip}
              </div>
              <button type="button" onClick={() => setShowFollowing(true)} className="text-[15px] font-semibold text-ink-3 hover:underline">
                {follows.length} following · {savedDentists} saved dentists
              </button>
              {follows.length > 0 && (
                <span className="flex -space-x-2">
                  {follows.slice(0, 6).map((a) => (
                    <span key={a.id} className="grid size-8 place-items-center rounded-full border-2 border-[var(--surface)] bg-[var(--surface-elevated)] text-[10.5px] font-semibold text-ink">
                      {initials(a.name)}
                    </span>
                  ))}
                </span>
              )}
            </div>
            <div className="flex w-full flex-wrap justify-center gap-2 pb-1 sm:w-auto">
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
              <button type="button" aria-pressed={showSuggest} aria-label={showSuggest ? "Hide shortcuts" : "Show shortcuts"} onClick={() => setShowSuggest((v) => !v)} className={fbGrey}>
                <ChevronDown className={`size-5 transition-transform ${showSuggest ? "rotate-180" : ""}`} strokeWidth={2} />
              </button>
            </div>
          </div>
          {/* the tab bar */}
          <div role="tablist" aria-label="Profile" className="-mx-1 flex overflow-x-auto [scrollbar-width:none]">
            {FB_TABS.map(([t, label]) => (
              <button
                key={t}
                role="tab"
                aria-selected={fbTab === t}
                onClick={() => (setFbTab(t), t === "videos" ? setGrid("reels") : t === "saved" ? setGrid("saved") : null)}
                className={`relative h-[52px] shrink-0 px-4 text-[15px] font-semibold transition-colors ${fbTab === t ? "text-[#4599ff] after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:bg-[#4599ff]" : "rounded-lg text-ink-3 hover:bg-white/[0.06]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <GetVerified me={me} accountType={accountType} certificate={certificate} />

      {showSuggest && shortcuts.length > 0 && (
        <section aria-label="Shortcuts for you" className={`fmd-enter grid gap-3 ${fbCard}`}>
          <h2 className="text-[17px] font-bold text-ink">Shortcuts for you</h2>
          <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {shortcuts.map(({ id, href, title, action, Icon }) => (
              <li key={id} className="relative grid w-[150px] shrink-0 overflow-hidden rounded-lg border border-line">
                <span className={`grid h-[90px] place-items-center bg-gradient-to-br ${coverOf(title)} to-[var(--surface-elevated)] text-ink`}>
                  <Icon className="size-8" strokeWidth={1.5} />
                </span>
                <button type="button" onClick={() => dismiss(id)} aria-label={`Dismiss ${title}`} className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70">
                  <X className="size-4" strokeWidth={2} />
                </button>
                <span className="grid gap-2 p-2.5">
                  <span className="truncate text-[14.5px] font-semibold text-ink">{id === "dentist" && me.dentist_profile ? "Dentist profile" : title}</span>
                  <Link href={href} className="inline-flex h-8 items-center justify-center rounded-md bg-[#1877f2]/20 text-[13.5px] font-semibold text-[#4599ff] hover:bg-[#1877f2]/30">
                    {id === "dentist" ? (me.dentist_profile ? "Edit" : "Set up") : action}
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div key={fbTab} className="fmd-enter">
        {fbTab === "posts" ? (
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="grid gap-4 lg:sticky lg:top-24">
              {intro}
              {photos(false)}
              {friends}
            </div>
            {fbFeed}
          </div>
        ) : fbTab === "about" ? (
          <div className="mx-auto grid w-full max-w-[680px] gap-4">{intro}{friends}</div>
        ) : fbTab === "photos" ? (
          photos(true)
        ) : (
          <section className={`grid gap-3 ${fbCard}`}>
            <h2 className="text-[20px] font-bold text-ink">{fbTab === "videos" ? "Videos" : "Saved posts"}</h2>
            {panel(false)}
          </section>
        )}
      </div>
    </div>
  );

  /* ---- layout 3: LinkedIn style ---- */
  const linkedin = (
    <div className="mx-auto grid w-full max-w-[1128px] grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid min-w-0 grid-cols-1 gap-3">
          {/* the top card: banner, round photo over its edge, name and headline, links, buttons */}
          <header className={`overflow-hidden ${card}`}>
            <div className="relative h-28 bg-[linear-gradient(120deg,rgba(14,165,233,0.5),rgba(99,102,241,0.3)_55%,rgba(34,211,238,0.2))] sm:h-44">
              <Link href="/account/settings" aria-label="Edit your profile" className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-[var(--surface)] text-sky-300 shadow hover:bg-[var(--surface-elevated)]">
                <Pencil className="size-4" strokeWidth={2} />
              </Link>
            </div>
            <div className="px-4 pb-5 sm:px-6">
              <div className="flex items-end justify-between">
                <span className="relative z-10 -mt-14 grid size-28 shrink-0 place-items-center rounded-full border-4 border-[var(--surface)] bg-[var(--surface-elevated)] text-[32px] font-semibold text-ink sm:-mt-24 sm:size-40 sm:text-[46px]">{initials(me.full_name)}</span>
                <Link href="/account/settings" aria-label="Edit intro" title="Edit intro" className="mt-3 grid size-10 place-items-center rounded-full text-ink-2 hover:bg-white/[0.06] hover:text-ink">
                  <Pencil className="size-5" strokeWidth={1.75} />
                </Link>
              </div>
              <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="grid min-w-0 content-start gap-1.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <p className="flex items-center gap-2 text-[22px] font-semibold text-ink sm:text-[24px]">
                      {me.full_name}
                      {me.dentist_profile?.verification_status === "verified" && <BadgeCheck className="size-5 text-sky-400" strokeWidth={2} aria-label="Verified dentist" />}
                    </p>
                    {/* a dentist's status, in bold: red not verified, yellow pending, green verified; and a nudge to verify */}
                    {(me.dentist_profile || accountType === "dentist") && <VerifyStatus status={me.dentist_profile?.verification_status ?? null} className="text-[14px]" />}
                    {(me.dentist_profile ? ["unverified", "rejected"].includes(me.dentist_profile.verification_status) : accountType === "dentist") && (
                      <a href="#get-verified" className="inline-flex h-7 items-center gap-1.5 rounded-full border border-dashed border-sky-500/60 px-3 text-[12.5px] font-semibold text-sky-400 hover:bg-sky-500/10">
                        <BadgeCheck className="size-4" strokeWidth={2} /> Get verified
                      </a>
                    )}
                  </div>
                  <p className="text-[15px] text-ink">{headline}</p>
                  <p className="text-[13.5px] text-ink-3">
                    {me.city ?? "India"} ·{" "}
                    <a href="#about" className="font-semibold text-sky-400 hover:underline">
                      Contact info
                    </a>
                  </p>
                  <p className="text-[13.5px] font-semibold text-sky-400">
                    <button type="button" onClick={() => setShowFollowing(true)} className="hover:underline">
                      {follows.length} following
                    </button>
                    {" · "}
                    <Link href="/saved" className="hover:underline">
                      {savedDentists} saved {savedDentists === 1 ? "dentist" : "dentists"}
                    </Link>
                  </p>
                  <div className="mt-1">
                    <RoleTags me={me} accountType={accountType} />
                  </div>
                </div>
                {clinic && (
                  <Link href="/clinic" className="flex h-fit items-center gap-2.5 text-[14px] font-semibold text-ink hover:underline sm:max-w-[220px]">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-violet-500/20 text-violet-200">
                      <Building2 className="size-5" strokeWidth={1.75} />
                    </span>
                    <span className="truncate">{clinic.clinic_name}</span>
                  </Link>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/account/settings" className={`${pill} bg-sky-600 text-white hover:bg-sky-500`}>
                  Edit profile
                </Link>
                <Link href="/saved" className={`${pill} border border-sky-500 text-sky-300 hover:bg-sky-500/10`}>
                  Saved items
                </Link>
                <button type="button" aria-pressed={showSuggest} onClick={() => setShowSuggest((v) => !v)} className={`${pill} border border-line-strong text-ink-2 hover:bg-white/[0.06] hover:text-ink`}>
                  <Shapes className="size-4" strokeWidth={2} /> {showSuggest ? "Hide shortcuts" : "Shortcuts"}
                </button>
              </div>
            </div>
          </header>
  
          <GetVerified me={me} accountType={accountType} certificate={certificate} />
  
          {/* shortcuts: the account's other pages, as small cards */}
          {showSuggest && SUGGESTIONS.some((x) => !dismissed.includes(x.id)) && (
            <section aria-label="Shortcuts for you" className={`fmd-enter grid gap-3 p-4 sm:p-6 ${card}`}>
              <div>
                <h2 className={sectionTitle}>Shortcuts for you</h2>
                <p className="flex items-center gap-1.5 text-[13px] text-ink-3">
                  <Eye className="size-4" strokeWidth={1.75} /> Private to you
                </p>
              </div>
              <ul className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
                {SUGGESTIONS.filter((x) => !dismissed.includes(x.id)).map(({ id, href, title, text, action, Icon }) => (
                  <li key={id} className="relative grid w-[180px] shrink-0 content-start justify-items-start gap-2 rounded-lg border border-line p-3.5 text-left">
                    <button type="button" onClick={() => dismiss(id)} aria-label={`Dismiss ${title}`} className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full text-ink-3 hover:bg-white/[0.06] hover:text-ink">
                      <X className="size-4" strokeWidth={2} />
                    </button>
                    <span className={`grid size-10 place-items-center rounded-lg bg-gradient-to-br ${coverOf(title)} to-[var(--surface-elevated)] text-ink`}>
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                    <p className="text-[14px] font-semibold text-ink">{id === "dentist" && me.dentist_profile ? "Your dentist profile" : title}</p>
                    <p className="line-clamp-2 min-h-[2lh] text-[12.5px] leading-snug text-ink-3">{text}</p>
                    <Link href={href} className={`${pill} mt-1 h-8 border border-line-strong px-3.5 text-[13px] text-ink-2 hover:border-ink-2 hover:text-ink`}>
                      {id === "dentist" ? (me.dentist_profile ? "Edit" : "Set up") : action}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
  
          {/* about: what you do and how to reach you */}
          <section id="about" aria-label="About" className={`scroll-mt-24 grid gap-3 p-4 sm:p-6 ${card}`}>
            <div className="flex items-center justify-between">
              <h2 className={sectionTitle}>About</h2>
              <Link href="/account/settings" aria-label="Edit about" className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-white/[0.06] hover:text-ink">
                <Pencil className="size-[18px]" strokeWidth={1.75} />
              </Link>
            </div>
            {me.dentist_profile && (
              <p className="text-[14px] text-ink-2">
                {me.dentist_profile.specialisation || "Dentist"}
                {me.dentist_profile.qualifications ? `, ${me.dentist_profile.qualifications}` : ""}. Registered with {me.dentist_profile.council}.
              </p>
            )}
            <ul className="grid gap-2.5 text-[14px] text-ink-2">
              <li className="flex items-center gap-3">
                <Smartphone className="size-[18px] text-ink-3" strokeWidth={1.75} /> {fmtPhone(me.phone)}
              </li>
              {me.email && (
                <li className="flex items-center gap-3 break-all">
                  <Mail className="size-[18px] shrink-0 text-ink-3" strokeWidth={1.75} /> {me.email}
                </li>
              )}
              {me.city && (
                <li className="flex items-center gap-3">
                  <MapPin className="size-[18px] text-ink-3" strokeWidth={1.75} /> {me.city}
                </li>
              )}
            </ul>
          </section>
  
          {/* featured: demo stories as tall cards, opened in the story viewer */}
          <section aria-label="Featured" className={`grid gap-3 p-4 sm:p-6 ${card}`}>
            <h2 className={sectionTitle}>Featured</h2>
            <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
              {HIGHLIGHTS.map((h, i) => (
                <li key={h.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setWatching({ list: HIGHLIGHTS.map((x) => ({ ...x, name: `${me.full_name} · ${x.name}` })), start: i })}
                    aria-label={`Featured: ${h.name}`}
                    className={`relative block h-[128px] w-[96px] overflow-hidden rounded-lg border-2 bg-[var(--surface-elevated)] transition-transform hover:-translate-y-0.5 ${seen.includes(h.id) ? "border-line" : "border-sky-500/70"}`}
                  >
                    <Image src={h.photo!} alt="" fill sizes="96px" className="object-cover object-[center_20%]" />
                    <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/85 to-transparent px-2 pb-2 pt-8 text-left text-[12px] font-semibold text-white">{h.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
  
          {/* activity: your posts, your videos, what you've saved */}
          <section id="saved" aria-label="Activity" className={`scroll-mt-24 overflow-hidden ${card}`}>
            <div className="grid gap-3 p-4 sm:p-6">
              <div>
                <h2 className={sectionTitle}>Activity</h2>
                <button type="button" onClick={() => setShowFollowing(true)} className="text-[13.5px] font-semibold text-sky-400 hover:underline">
                  {follows.length} following
                </button>
              </div>
              <div role="tablist" aria-label="Activity" className="flex flex-wrap gap-2">
                {(
                  [
                    ["posts", "Posts"],
                    ["reels", "Videos"],
                    ["saved", `Saved${savedPosts ? ` (${savedPosts.length})` : ""}`],
                  ] as const
                ).map(([t, label]) => (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={grid === t}
                    onClick={() => setGrid(t)}
                    className={`${pill} h-8 px-3.5 ${grid === t ? "bg-emerald-600 text-white" : "border border-line-strong text-ink-2 hover:bg-white/[0.06] hover:text-ink"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div key={grid} role="tabpanel" className="fmd-enter">
                {grid === "saved" ? (
                  !savedPosts ? (
                    <div className="aspect-[3/1] animate-pulse rounded-lg bg-[var(--surface-glass)]" aria-busy />
                  ) : savedPosts.length ? (
                    <PostGrid posts={savedPosts} />
                  ) : (
                    <div className="grid justify-items-center gap-3 py-10 text-center">
                      <span className="grid size-16 place-items-center rounded-3xl bg-sky-500/15 text-sky-300">
                        <Bookmark className="size-7" strokeWidth={1.5} />
                      </span>
                      <p className="text-[18px] font-semibold text-ink">Save posts</p>
                      <p className="text-[14px] text-ink-3">Tap the bookmark on a post in Explore to keep it here. Only you can see what you save.</p>
                      <Link href="/explore" className="text-[14px] font-medium text-sky-400 hover:underline">
                        Go to Explore
                      </Link>
                    </div>
                  )
                ) : (
                  <OwnGrid me={me} posts={mine} reels={grid === "reels"} />
                )}
              </div>
            </div>
            <Link href={grid === "saved" ? "/saved" : "/explore/mine"} className="flex items-center justify-center gap-1.5 border-t border-line py-3 text-[14px] font-semibold text-ink-2 hover:bg-white/[0.04] hover:text-ink">
              {grid === "saved" ? "Show all saved items" : "Show all posts"} <ArrowRight className="size-4" strokeWidth={2} />
            </Link>
          </section>
        </div>
  
        {/* the side column: your account links, and the dentists you follow */}
        <aside className="grid gap-3">
          <section className={`grid gap-1 p-4 ${card}`}>
            <h2 className="mb-1 text-[16px] font-semibold text-ink">Your account</h2>
            {(
              [
                ["/account/settings", "Settings", Settings],
                ["/account/privacy", "Privacy and data", Lock],
                ["/membership", "Membership", CreditCard],
                ...(me.dentist_profile ? ([["/account/dentist", "Dentist profile", Stethoscope]] as const) : []),
              ] as const
            ).map(([href, label, Icon]) => (
              <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-2 py-2 text-[14px] text-ink-2 hover:bg-white/[0.05] hover:text-ink">
                <Icon className="size-[18px] text-ink-3" strokeWidth={1.75} /> {label}
                <ChevronRight className="ml-auto size-4 text-ink-3" strokeWidth={2} />
              </Link>
            ))}
          </section>
          <section className={`grid gap-3 p-4 ${card}`}>
            <h2 className="text-[16px] font-semibold text-ink">Dentists you follow</h2>
            {follows.length ? (
              <ul className="grid gap-3">
                {follows.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-start gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--surface-elevated)] text-[13px] font-semibold text-ink">{initials(a.name)}</span>
                    <span className="grid min-w-0 gap-1.5">
                      <span className="leading-tight">
                        <span className="block truncate text-[14px] font-semibold text-ink">{a.name}</span>
                        <span className="block truncate text-[12.5px] text-ink-3">{a.specialty}</span>
                      </span>
                      <Link href={`/dentists/${a.id}`} className={`${pill} h-8 w-fit border border-line-strong px-3.5 text-[13px] text-ink-2 hover:border-ink-2 hover:text-ink`}>
                        View profile
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13.5px] text-ink-3">
                Follow dentists from their posts in{" "}
                <Link href="/explore" className="font-semibold text-sky-400 hover:underline">
                  Explore
                </Link>{" "}
                to see them here.
              </p>
            )}
          </section>
        </aside>
      </div>
  );

  return (
    <div className="grid gap-3">
      <h1 className="sr-only">Your profile</h1>
      {/* pick a layout: the link keeps it (?layout=), so each can be shared and compared */}
      <div className="mx-auto flex w-full max-w-[1128px] justify-end">
        <LayoutPicker value={layout} onChange={pickLayout} />
      </div>
      <div key={layout} className="fmd-enter">
        {layout === "insta" ? insta : layout === "insta2" ? insta2 : layout === "explore" ? exploreStyle : layout === "cards" ? cards : layout === "facebook" ? facebook : linkedin}
      </div>
      {watching && <StoryViewer stories={watching.list} start={watching.start} onClose={() => setWatching(null)} onSeen={markSeen} />}
      {showFollowing && (
        <Sheet title="Following" onClose={() => setShowFollowing(false)}>
          {follows.length ? (
            <ul className="grid gap-1">
              {follows.map((a) => (
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
/* ---------------- the role tags under the name ---------------- */

const ROLE_LOOK: Record<string, { label: string; Icon: LucideIcon; cls: string }> = {
  owner: { label: "Clinic owner", Icon: Building2, cls: "border-violet-400/40 bg-violet-500/15 text-violet-200" },
  dentist: { label: "Dentist", Icon: Stethoscope, cls: "border-sky-400/40 bg-sky-500/15 text-sky-200" },
  student: { label: "Dental student", Icon: GraduationCap, cls: "border-amber-400/40 bg-amber-500/15 text-amber-200" },
  company: { label: "Dental company", Icon: Briefcase, cls: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200" },
  patient: { label: "Patient", Icon: HeartPulse, cls: "border-rose-400/40 bg-rose-500/15 text-rose-200" },
};

/** who this account is, as clear pills: a clinic owner who is also a dentist gets both */
function RoleTags({ me, accountType }: { me: Me; accountType: AccountType | null }) {
  const roles: string[] = [];
  if (me.dentist_profile || accountType === "dentist") roles.push("dentist");
  if (me.workspaces.some((w) => w.role === "owner")) roles.unshift("owner");
  if (accountType === "student" || accountType === "company") roles.push(accountType);
  if (!roles.length) roles.push("patient");
  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.map((r) => {
        const { label, Icon, cls } = ROLE_LOOK[r];
        return (
          <span key={r} className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold ${cls}`}>
            <Icon className="size-3.5" strokeWidth={2} /> {label}
          </span>
        );
      })}
    </div>
  );
}

/** Your own posts or videos; what to do when there are none yet */
function OwnGrid({ me, posts, reels, insta = false }: { me: Me; posts: FeedItem[] | null; reels: boolean; insta?: boolean }) {
  if (!posts) return <div className="aspect-[3/1] animate-pulse bg-[var(--surface-glass)]" aria-busy />;
  const shown = reels ? posts.filter((p) => p.kind === "video") : posts;
  if (shown.length)
    return (
      <div className="grid gap-4">
        <PostGrid posts={shown} square={insta} />
        {me.dentist_profile && (
          <Link href="/explore/mine" className="w-fit text-[14px] font-medium text-sky-400 hover:underline">
            Drafts and posts in review
          </Link>
        )}
      </div>
    );
  const verified = me.dentist_profile?.verification_status === "verified";
  const Icon = insta ? (reels ? Clapperboard : Camera) : reels ? SquarePlay : LayoutGrid;
  const vid = insta ? "reels" : "videos";
  return (
    <div className="grid justify-items-center gap-3 py-14 text-center">
      <span className={`grid size-16 place-items-center ${insta ? "rounded-full border-2 border-ink text-ink" : "rounded-3xl bg-sky-500/15 text-sky-300"}`}>
        <Icon className="size-7" strokeWidth={1.5} />
      </span>
      <p className="text-[20px] font-semibold text-ink">{reels ? `No ${vid} yet` : "No posts yet"}</p>
      <p className="max-w-[40ch] text-[14px] text-ink-3">
        {verified
          ? reels
            ? `Share a short video of dental tips. It shows here and in Explore's ${insta ? "Reels" : "Videos"}.`
            : "Share dental tips with patients. Your posts show here and in Explore."
          : me.dentist_profile || me.workspaces.length
            ? `Once FMD verifies your registration, you can share posts and ${vid}.`
            : `Posts and ${vid} are shared by verified dentists on FMD.`}
      </p>
      {verified ? (
        <Link href="/explore/new" className="text-[14px] font-semibold text-sky-400 hover:underline">
          {reels ? (insta ? "Create a reel" : "Share a video") : "Create your first post"}
        </Link>
      ) : me.dentist_profile ? (
        <Link href="/account/dentist" className="text-[14px] font-semibold text-sky-400 hover:underline">
          Get verified
        </Link>
      ) : (
        <Link href="/explore" className="text-[14px] font-semibold text-sky-400 hover:underline">
          Go to Explore
        </Link>
      )}
    </div>
  );
}

/* ---------------- "Get verified": the profile's nudge for dentists FMD hasn't verified yet ---------------- */

/**
 * Like LinkedIn's verification prompt: shown to anyone who said they're a dentist (or added a registration) until FMD
 * has verified them. Three steps, where they stand on each, and the one button that moves them on.
 */
function GetVerified({ me, accountType, certificate }: { me: Me; accountType: AccountType | null; certificate: boolean }) {
  const dp = me.dentist_profile;
  // pending or verified: nothing to do, the bold status by the name says it
  if (dp ? dp.verification_status === "verified" || dp.verification_status === "pending" : accountType !== "dentist") return null;
  const status = dp?.verification_status;
  const steps: [label: string, line: string, done: boolean, now: boolean][] = [
    ["Fill in the form", "Your dental council registration and your education (BDS and any MDS).", !!dp, !dp && !certificate],
    ["Upload your certificate", "A scan or photo of your council registration certificate.", certificate, !certificate && !!dp],
    ["Submit for verification", status === "rejected" ? "We couldn't verify these details. Check them and send again." : "FMD checks your details with your dental council.", false, certificate && !dp],
  ];
  const done = steps.filter(([, , d]) => d).length;
  const head = status === "rejected" ? "We couldn't verify your registration" : "You're not verified yet";
  const cta = status === "rejected" ? "Fix your details" : "Verify now";
  return (
    <section id="get-verified" aria-label="Get verified" className="scroll-mt-24">
      <div className="grid gap-4 overflow-hidden rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-500/[0.12] via-[var(--surface)] to-[var(--surface)] p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)]">
            <BadgeCheck className="size-8" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1 basis-[240px]">
            <p className="text-[17px] font-semibold text-ink">{head}</p>
            <p className="mt-0.5 text-[13.5px] text-ink-2">
              A verified badge shows patients that FMD has checked your dental council registration. Verified dentists get the blue tick, can post in Explore and show as verified in search.
            </p>
          </div>
          <Link href="/account/dentist" className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-sky-600 px-5 text-[14px] font-semibold text-white hover:bg-sky-500">
            {cta} <ChevronRight className="size-4" strokeWidth={2} />
          </Link>
        </div>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between text-[12.5px] text-ink-3">
            <span>
              {done} of {steps.length} steps done
            </span>
            {status && <Tag tone={STATUS[status].tone}>{STATUS[status].tag}</Tag>}
          </div>
          <span className="block h-1.5 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done} aria-label="Verification steps done">
            <span className="block h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-[width] duration-500" style={{ width: `${(done / steps.length) * 100}%` }} />
          </span>
        </div>
        <ol className="grid gap-2 sm:grid-cols-3">
          {steps.map(([label, line, isDone, isNow], i) => (
            <li key={label} className={`flex gap-3 rounded-xl border p-3 ${isNow ? "border-sky-500/50 bg-sky-500/[0.06]" : "border-line bg-white/[0.02]"}`}>
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full text-[12.5px] font-bold ${isDone ? "bg-emerald-500 text-white" : isNow ? "bg-sky-500 text-white" : "bg-white/[0.08] text-ink-3"}`}
              >
                {isDone ? <Check className="size-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={`block text-[14px] font-semibold ${isDone ? "text-ink-2" : "text-ink"}`}>{label}</span>
                <span className="block text-[12.5px] text-ink-3">{line}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------- /account/settings: one simple, grouped list ---------------- */

type Open = "email" | "email-verify" | "email-remove" | "mfa-on" | "mfa-off" | "logout-all" | null;
type Expand = "email" | "mfa" | "devices" | null;

/** a titled group of rows in one rounded box */
function Group({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-label={title} className="grid scroll-mt-24 gap-2">
      <h2 className="px-1 text-[13px] font-semibold text-ink-3">{title}</h2>
      <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-line bg-[var(--surface)]">{children}</div>
    </section>
  );
}

const rowCls = "flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.04]";
function RowBody({ icon: Icon, label, sub, tag, tone = "" }: { icon: LucideIcon; label: string; sub?: ReactNode; tag?: ReactNode; tone?: string }) {
  return (
    <>
      <span className={`grid size-10 shrink-0 place-items-center rounded-full bg-white/[0.06] ${tone || "text-ink-2"}`}>
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] font-medium ${tone || "text-ink"}`}>{label}</span>
        {sub && <span className="block truncate text-[13px] text-ink-3">{sub}</span>}
      </span>
      {tag}
    </>
  );
}
function LinkRow({ href, ...body }: { href: string } & Parameters<typeof RowBody>[0]) {
  return (
    <Link href={href} className={rowCls}>
      <RowBody {...body} />
      <ChevronRight className="size-5 shrink-0 text-ink-3" strokeWidth={1.75} />
    </Link>
  );
}
function ExpandRow({ open, onToggle, children, ...body }: { open: boolean; onToggle: () => void; children: ReactNode } & Parameters<typeof RowBody>[0]) {
  return (
    <div>
      <button type="button" aria-expanded={open} onClick={onToggle} className={rowCls}>
        <RowBody {...body} />
        <ChevronDown className={`size-5 shrink-0 text-ink-3 transition-transform duration-300 ${open ? "rotate-180" : ""}`} strokeWidth={1.75} />
      </button>
      {open && <div className="fmd-enter border-t border-line bg-white/[0.02]">{children}</div>}
    </div>
  );
}

/** /account/settings: account type, dentist profile, email, two-step verification, devices, membership, personalisation and privacy (FastAPI /me/*). */
export function AccountSettings() {
  const me = useRequireMe();
  const [open, setOpen] = useState<Open>(null);
  const [flash, setFlash] = useState<string | null>(null);
  // a link to #security or #devices (notifications, the privacy page) opens that row
  const [expand, setExpand] = useState<Expand>(() => {
    const h = typeof window === "undefined" ? "" : location.hash;
    return h === "#devices" ? "devices" : h === "#security" ? "email" : null;
  });
  const [type, setType] = useState<AccountType | null | undefined>(undefined);
  const userId = me?.id;
  useEffect(() => {
    if (userId) getAccountType(userId).then(setType);
  }, [userId]);
  if (!me) return <div className="app-panel h-40 animate-pulse" aria-busy />;

  const close = () => setOpen(null);
  const done = (msg: string) => {
    setOpen(null);
    setFlash(msg);
    authChanged();
  };
  const show = (o: Open) => (setFlash(null), setOpen(o));
  const toggle = (e: Expand) => setExpand((x) => (x === e ? null : e));
  const t = type ? ACCOUNT_TYPES[type] : null;
  const dp = me.dentist_profile;
  const emailTag = !me.email ? <Tag tone="muted">Not added</Tag> : me.email_verified ? <Tag tone="ok">Verified</Tag> : <Tag tone="warn">Not verified</Tag>;

  return (
    <div className="mx-auto grid w-full max-w-[640px] gap-6">
      <div className="flex items-center gap-2">
        <Link href="/account" aria-label="Back to your profile" title="Your profile" className="-ml-2 grid size-10 place-items-center rounded-full text-ink hover:bg-[var(--surface-glass)]">
          <ArrowLeft className="size-5" strokeWidth={1.75} />
        </Link>
        <h1 className="text-[22px] font-semibold text-ink">Settings</h1>
      </div>

      {/* who's signed in */}
      <Link href="/account" className="flex items-center gap-4 rounded-2xl border border-line bg-[var(--surface)] p-4 transition-colors hover:bg-white/[0.04]">
        <Ring>
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--surface-elevated)] text-[17px] font-semibold text-ink">{initials(me.full_name)}</span>
        </Ring>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-semibold text-ink">{me.full_name}</span>
          <span className="block text-[14px] text-ink-3">{fmtPhone(me.phone)}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-ink-3" strokeWidth={1.75} />
      </Link>

      {flash && <Notice kind="success">{flash}</Notice>}

      <Group id="profile" title="Your account">
        <LinkRow
          href="/onboarding?next=%2Faccount%2Fsettings"
          icon={UserRound}
          label="Account type"
          sub={
            type === undefined
              ? "…"
              : t
                ? `${t.label} · ${t.price}${t.yearly ? ". Works as a free account until the membership is paid." : ""}`
                : "Tell us how you use FMD, so we show you the right things."
          }
          tag={<Tag tone="muted">Demo</Tag>}
        />
        <LinkRow
          href="/account/dentist"
          icon={Stethoscope}
          label={dp ? "Edit dentist profile" : "Set up dentist profile"}
          sub={dp ? `${dp.council} · Registration no. ${dp.registration_no}` : "Are you a dentist? Add your registration so patients can find you on FMD."}
          tag={dp ? <Tag tone={STATUS[dp.verification_status].tone}>{STATUS[dp.verification_status].tag}</Tag> : type === "dentist" ? <Tag tone="bad">Not verified</Tag> : undefined}
        />
      </Group>

      <Group id="security" title="Login and security">
        <ExpandRow open={expand === "email"} onToggle={() => toggle("email")} icon={Mail} label="Email" sub={me.email ?? "Add an email to log in with it"} tag={emailTag}>
          <EmailCard me={me} show={show} flat />
        </ExpandRow>
        <ExpandRow
          open={expand === "mfa"}
          onToggle={() => toggle("mfa")}
          icon={ShieldCheck}
          label="Two-step verification"
          sub={me.mfa_enabled ? "A text code when you log in with your password" : "Add a second step when you log in"}
          tag={me.mfa_enabled ? <Tag tone="ok">On</Tag> : <Tag tone="muted">Off</Tag>}
        >
          <Card
            flat
            title="Two-step verification"
            text={
              me.mfa_enabled
                ? `Logging in with your password also needs a code we text to ${fmtPhone(me.phone)}.`
                : `Add a second step: when you log in with your password, we'll also text a code to ${fmtPhone(me.phone)}.`
            }
          >
            {me.mfa_enabled ? (
              <Button variant="secondary" size="sm" onClick={() => show("mfa-off")}>
                Turn off
              </Button>
            ) : (
              <Button size="sm" onClick={() => show("mfa-on")}>
                Turn on
              </Button>
            )}
          </Card>
        </ExpandRow>
        <div id="devices" className="scroll-mt-24">
          <ExpandRow open={expand === "devices"} onToggle={() => toggle("devices")} icon={Monitor} label="Where you're signed in" sub="Your devices, and signing out of them">
            <Devices onSignOutAll={() => show("logout-all")} flat />
          </ExpandRow>
        </div>
      </Group>

      <Group id="more" title="Membership and privacy">
        <LinkRow href="/membership" icon={CreditCard} label="Membership" sub="Your plan, renewal, usage, payments and receipts." />
        <LinkRow href="/account/personalisation" icon={SlidersHorizontal} label="Personalisation" sub="What Explore and suggestions use, and how to change or reset it." />
        <LinkRow href="/account/privacy" icon={Lock} label="Privacy and data" sub="Your consents, which messages you get, a copy of your data, or deleting your account." />
      </Group>

      <Group title="Login">
        <button type="button" onClick={() => logout().catch(() => setFlash(null))} className={rowCls}>
          <RowBody icon={LogOut} label="Log out" tone="text-[var(--tone-bad)]" />
        </button>
      </Group>

      {(open === "email" || open === "email-verify") && <EmailSheet me={me} verifyOnly={open === "email-verify"} onDone={done} onClose={close} />}
      {open === "email-remove" && (
        <PasswordSheet
          title="Remove email"
          text={`You won't be able to log in with ${me.email} or get security alerts there.`}
          action="Remove email"
          onConfirm={(pw) => account.removeEmail(pw)}
          onDone={() => done("Email removed.")}
          onClose={close}
        />
      )}
      {open === "mfa-on" && <MfaOnSheet me={me} onDone={() => done("Two-step verification is on.")} onClose={close} />}
      {open === "mfa-off" && (
        <PasswordSheet
          title="Turn off two-step verification"
          text="Logging in with your password will no longer ask for a code."
          action="Turn off"
          onConfirm={(pw) => account.disableMfa(pw)}
          onDone={() => done("Two-step verification is off.")}
          onClose={close}
        />
      )}
      {open === "logout-all" && <LogoutAllSheet onClose={close} />}
    </div>
  );
}

/** A settings card; `flat` drops the box and the title, for use inside an opened row. */
function Card({ title, tag, text, children, flat = false }: { title: string; tag?: ReactNode; text: ReactNode; children?: ReactNode; flat?: boolean }) {
  if (flat)
    return (
      <div className="grid gap-3 px-4 py-4 sm:pl-[70px]">
        <div className="text-[14px] text-ink-2">{text}</div>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    );
  return (
    <Panel as="section" className="flex flex-col gap-3 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-medium text-ink">{title}</h2>
        {tag}
      </div>
      <div className="text-[14.5px] text-ink-2">{text}</div>
      {children && <div className="mt-auto flex flex-wrap gap-2 pt-1">{children}</div>}
    </Panel>
  );
}

/* ---------------- email ---------------- */

function EmailCard({ me, show, flat = false }: { me: Me; show: (o: Open) => void; flat?: boolean }) {
  if (!me.email)
    return (
      <Card flat={flat} title="Email" tag={<Tag tone="muted">Not added</Tag>} text="Add an email to log in with it and to get security alerts.">
        <Button size="sm" onClick={() => show("email")}>
          Add email
        </Button>
      </Card>
    );
  const remove = (
    <Button variant="secondary" size="sm" onClick={() => show("email-remove")}>
      Remove
    </Button>
  );
  if (!me.email_verified)
    return (
      <Card flat={flat}
        title="Email"
        tag={<Tag tone="warn">Not verified</Tag>}
        text={
          <>
            <span className="break-all font-medium text-ink">{me.email}</span>
            <br />
            Verify it before you can log in with it.
          </>
        }
      >
        <Button size="sm" onClick={() => show("email-verify")}>
          Verify
        </Button>
        {remove}
      </Card>
    );
  return (
    <Card flat={flat}
      title="Email"
      tag={<Tag tone="ok">Verified</Tag>}
      text={
        <>
          <span className="break-all font-medium text-ink">{me.email}</span>
          <br />
          You can log in with it, and we send security alerts here.
        </>
      }
    >
      <Button variant="secondary" size="sm" onClick={() => show("email")}>
        Change
      </Button>
      {remove}
    </Card>
  );
}

/** Add, change or verify the email: send a code to it, then enter the code. Changing a verified email needs the password. */
function EmailSheet({ me, verifyOnly, onDone, onClose }: { me: Me; verifyOnly: boolean; onDone: (msg: string) => void; onClose: () => void }) {
  const changing = me.email_verified && !verifyOnly;
  const { busy, err, run } = useRun();
  const [step, setStep] = useState<"form" | "code">("form");
  const [email, setEmail] = useState(verifyOnly ? (me.email ?? "") : "");
  const [password, setPassword] = useState("");
  const send = () => account.addEmail(email.trim(), changing ? password : undefined);

  return (
    <Sheet title={verifyOnly ? "Verify your email" : changing ? "Change email" : "Add email"} onClose={onClose}>
      <div className="grid gap-4">
        {err && <Notice kind="error">{err}</Notice>}
        {step === "form" ? (
          <form
            onSubmit={submit(() =>
              run(async () => {
                await send();
                authChanged(); // the backend has saved the new address as unverified
                setStep("code");
              }),
            )}
            className="grid gap-4"
          >
            {verifyOnly ? (
              <p className="text-[14.5px] text-ink-2">
                We&apos;ll send a 6-digit code to <span className="break-all font-medium text-ink">{email}</span>.
              </p>
            ) : (
              <Field label={changing ? "New email" : "Email"}>
                <input className={fieldCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={320} required />
              </Field>
            )}
            {changing && (
              <Field label="Current password" hint="Your current email is replaced as soon as we send the code.">
                <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
              </Field>
            )}
            <Button type="submit" disabled={busy || !email.trim() || (changing && !password)}>
              {busy ? "Sending…" : "Send code"}
            </Button>
          </form>
        ) : (
          <OtpStep
            to={email.trim()}
            busy={busy}
            run={run}
            onResend={send}
            onBack={() => setStep("form")}
            onCode={(code) =>
              run(async () => {
                await account.verifyEmail(code);
                onDone("Email verified.");
              })
            }
          />
        )}
      </div>
    </Sheet>
  );
}

/* ---------------- two-step verification ---------------- */

function MfaOnSheet({ me, onDone, onClose }: { me: Me; onDone: () => void; onClose: () => void }) {
  const { busy, err, run } = useRun();
  const [step, setStep] = useState<"intro" | "code">("intro");
  return (
    <Sheet title="Turn on two-step verification" onClose={onClose}>
      <div className="grid gap-4">
        {err && <Notice kind="error">{err}</Notice>}
        {step === "intro" ? (
          <>
            <p className="text-[14.5px] text-ink-2">
              We&apos;ll text a code to <span className="font-medium text-ink">{fmtPhone(me.phone)}</span> to confirm it&apos;s yours. After that, logging in with
              your password will also ask for a code.
            </p>
            <Button disabled={busy} onClick={() => run(async () => (await account.startMfa(), setStep("code")))}>
              {busy ? "Sending…" : "Send code"}
            </Button>
          </>
        ) : (
          <OtpStep
            to={fmtPhone(me.phone)}
            busy={busy}
            run={run}
            onResend={account.startMfa}
            onBack={() => setStep("intro")}
            onCode={(code) => run(async () => (await account.enableMfa(code), onDone()))}
          />
        )}
      </div>
    </Sheet>
  );
}

/** A sensitive change confirmed with the current password. */
function PasswordSheet({
  title,
  text,
  action,
  onConfirm,
  onDone,
  onClose,
}: {
  title: string;
  text: string;
  action: string;
  onConfirm: (password: string) => Promise<void>;
  onDone: () => void;
  onClose: () => void;
}) {
  const { busy, err, run } = useRun();
  const [password, setPassword] = useState("");
  return (
    <Sheet title={title} onClose={onClose}>
      <form onSubmit={submit(() => run(async () => (await onConfirm(password), onDone())))} className="grid gap-4">
        {err && <Notice kind="error">{err}</Notice>}
        <p className="text-[14.5px] text-ink-2">{text}</p>
        <Field label="Current password">
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !password}>
            {busy ? "Checking…" : action}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

/* ---------------- devices ---------------- */

function Devices({ onSignOutAll, flat = false }: { onSignOutAll: () => void; flat?: boolean }) {
  const [list, setList] = useState<Session[] | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    () =>
      account.sessions().then(
        (s) => (setList(s), setErr(null)),
        (e: Error) => setErr(e.message),
      ),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  const revoke = async (id: string) => {
    setBusyId(id);
    try {
      await account.revokeSession(id);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card flat={flat} title="Where you're signed in" text="Sign out of any device you don't recognise.">
      <div className="grid w-full gap-4">
        {err && (
          <Notice kind="error">
            {err}{" "}
            <button type="button" onClick={load} className="font-medium underline underline-offset-4">
              Try again
            </button>
          </Notice>
        )}
        {list === undefined && !err ? (
          <div className="h-20 animate-pulse rounded-2xl bg-[var(--surface-glass)]" aria-busy />
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-2xl border border-line">
            {list?.map((s) => {
              const name = deviceName(s.user_agent);
              const Icon = /Android|iOS/.test(name) ? Smartphone : Monitor;
              return (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3.5">
                  <Icon className="size-5 shrink-0 text-ink-3" strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-medium text-ink">
                      {name}
                      {s.current && <Tag tone="accent">This device</Tag>}
                    </p>
                    <p className="text-[13px] text-ink-3">
                      {s.current ? "Active now" : `Active ${ago(s.last_seen_at)}`} · Signed in {day(s.created_at)} with {METHOD[s.auth_method] ?? s.auth_method}
                      {s.ip && ` · ${s.ip}`}
                    </p>
                  </div>
                  {!s.current && (
                    <Button variant="secondary" size="sm" disabled={busyId === s.id} onClick={() => revoke(s.id)} aria-label={`Sign out ${name}`}>
                      {busyId === s.id ? "Signing out…" : "Sign out"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Button variant="secondary" size="sm" onClick={onSignOutAll}>
        Sign out everywhere
      </Button>
    </Card>
  );
}

function LogoutAllSheet({ onClose }: { onClose: () => void }) {
  const { busy, err, run } = useRun();
  return (
    <Sheet title="Sign out everywhere?" onClose={onClose}>
      <div className="grid gap-4">
        {err && <Notice kind="error">{err}</Notice>}
        <p className="text-[14.5px] text-ink-2">This signs you out on every device, including this one. You&apos;ll need to log in again.</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {/* once signed out, the page's sign-in guard takes over and opens /login */}
          <Button disabled={busy} onClick={() => run(() => logout(true))}>
            {busy ? "Signing out…" : "Sign out everywhere"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
