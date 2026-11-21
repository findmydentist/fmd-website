"use client";

import { BadgeCheck, Bookmark, Briefcase, Building2, Camera, Check, ChevronRight, Clapperboard, GraduationCap, HeartPulse, LayoutGrid, Mail, MapPin, Smartphone, SquarePlay, Stethoscope, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Tag } from "@/components/app/kit";
import { fmtPhone, initials, type Me } from "@/lib/fmd";
import type { AccountType } from "@/sample/onboarding";
import type { FeedItem } from "@/sample/content";
import type { Story } from "../../explore/Stories";
import { PostGrid } from "../../PostGrid";
import { STATUS, VerifyStatus } from "../Dentist";
import type { AccountView } from "./useAccountProfile";

/** The pieces of /account that both layouts use. */

/** Facebook-style cards and buttons (layout 2's Intro and Following cards, its buttons) */
export const fbCard = "rounded-xl border border-line bg-[var(--surface)] p-4";
export const fbGrey = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white/[0.1] px-3 text-[14.5px] font-semibold text-ink hover:bg-white/[0.15]";
export const fbBlue = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#1877f2] px-3 text-[14.5px] font-semibold text-white hover:bg-[#166fe5]";

/** Demo highlights: little saved stories from a patient's dental year, opened in the story viewer. */
export const HIGHLIGHTS: Story[] = [
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

/* ---------------- by the name: the blue tick, the verification status, "Get verified" ---------------- */

export function VerifiedTick({ me }: { me: Me }) {
  return me.dentist_profile?.verification_status === "verified" ? <BadgeCheck className="size-5 text-sky-400" strokeWidth={2} aria-label="Verified dentist" /> : null;
}

/** a dentist's verification status, and a "Get verified" chip while they aren't */
export function VerifyBadges({ v }: { v: AccountView }) {
  const { me, accountType } = v;
  const dentist = me.dentist_profile || accountType === "dentist";
  const nudge = me.dentist_profile ? ["unverified", "rejected"].includes(me.dentist_profile.verification_status) : accountType === "dentist";
  return (
    <>
      {dentist && <VerifyStatus status={me.dentist_profile?.verification_status ?? null} className="text-[14px]" />}
      {nudge && (
        <a href="#get-verified" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-sky-500/60 px-3 text-[13px] font-semibold text-sky-400 hover:bg-sky-500/10">
          <BadgeCheck className="size-4" strokeWidth={2} /> Get verified
        </a>
      )}
    </>
  );
}

/* ---------------- what you saved ---------------- */

/** your saved posts, or how to save some; `insta` is layout 1's square grid */
export function SavedPanel({ posts, insta }: { posts: FeedItem[] | null; insta: boolean }) {
  if (!posts) return <div className="aspect-[3/1] animate-pulse rounded-lg bg-[var(--surface-glass)]" aria-busy />;
  if (posts.length) return <PostGrid posts={posts} square={insta} />;
  return (
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
}

/* ---------------- layout 2's left column: Intro and Following ---------------- */

export function Intro({ v }: { v: AccountView }) {
  const { me, clinic, accountType } = v;
  return (
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
}

export function FollowingCard({ v }: { v: AccountView }) {
  const { follows } = v;
  return (
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
export function RoleTags({ me, accountType }: { me: Me; accountType: AccountType | null }) {
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
export function OwnGrid({ me, posts, reels, insta = false }: { me: Me; posts: FeedItem[] | null; reels: boolean; insta?: boolean }) {
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
export function GetVerified({ me, accountType, certificate }: { me: Me; accountType: AccountType | null; certificate: boolean }) {
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
