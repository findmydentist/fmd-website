"use client";

import { ArrowLeft, BadgeCheck, BarChart3, Bookmark, BookmarkCheck, Building2, CalendarClock, Camera, Clapperboard, Clock3, ExternalLink, Grid3x3, Heart, Info, Languages, MapPin, MessageCircle, PhoneOff, Star } from "lucide-react";
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
import { coverOf, Ring } from "../explore/Explore";
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
const PROFILE_TABS: [ProfileTab, string, typeof Grid3x3][] = [
  ["posts", "Posts", Grid3x3],
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

  /** Book, Follow and Save: beside the name on wide screens, under the bio on phones (Instagram's layout). */
  const actions = (
    <>
      <ButtonLink href={`/book/${p.id}`} size="sm" className="col-span-2">
        {avail.mode === "live" ? "Book appointment" : "Request appointment"}
      </ButtonLink>
      <Button variant="secondary" size="sm" onClick={follow} aria-pressed={followed}>
        {followed ? "Following" : "Follow"}
      </Button>
      <Button variant="secondary" size="sm" onClick={save} aria-pressed={saved}>
        {saved ? <BookmarkCheck className="size-4" strokeWidth={1.75} /> : <Bookmark className="size-4" strokeWidth={1.75} />}
        {saved ? "Saved" : "Save"}
      </Button>
    </>
  );

  return (
    <div className="mx-auto grid w-full max-w-[935px] gap-6">
      <Back />

      {/* header: avatar, name, actions, counts */}
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-5 sm:gap-12 sm:px-8">
        <Ring>
          <Avatar p={p} className="size-20 !rounded-full !border-0 sm:size-36" />
        </Ring>
        <div className="grid gap-3 sm:gap-4">
          <h1 className="flex flex-wrap items-center gap-2 text-[20px] font-medium text-ink sm:text-[22px]">
            {p.name}
            {p.verification.status === "verified" && <BadgeCheck className="size-5 text-sky-400" strokeWidth={2} aria-label="Verified by FMD" />}
            <Tag tone="muted">Demo</Tag>
          </h1>
          <ul className="flex gap-6 text-[14px] text-ink-2 sm:gap-10 sm:text-[15px]">
            {stats.map(([n, label]) => (
              <li key={label}>
                <span className="font-semibold text-ink">{n}</span> {label}
              </li>
            ))}
          </ul>
          <div className="hidden flex-wrap gap-2 sm:flex">
            {actions}
          </div>
        </div>
      </header>

      {/* bio */}
      <div className="grid gap-1.5 text-[14px] text-ink-2 sm:px-8">
        <p className="font-semibold text-ink">{p.specialty}</p>
        <div className="flex flex-wrap gap-1.5">
          <Verification v={p.verification} />
          {p.sponsored && <SponsoredBadge />}
        </div>
        {/* say what was checked, not just "verified" (PDR §4.8) */}
        <p className="text-[12.5px] text-ink-3">{p.verification.checks}</p>
        {p.sponsored && <p className="text-[12.5px] text-ink-3">Sponsored by {p.sponsored.sponsor}: a paid placement, not a clinical endorsement.</p>}
        <p className="flex items-center gap-2">
          <Languages className="size-4 text-ink-3" strokeWidth={1.75} /> Consults in {p.languages.join(", ")}
        </p>
        <Link href={`/clinics/${c.id}`} className="flex w-fit items-center gap-2 font-medium text-sky-400 hover:underline">
          <Building2 className="size-4" strokeWidth={1.75} /> {c.name}, {c.city}
        </Link>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
          {actions}
        </div>
        {!p.claimed && (
          <div className="mt-2 rounded-2xl border border-line px-4 py-3 text-[14px] text-ink-2">
            Listed by FMD from public information; this dentist hasn&apos;t joined FMD yet.{" "}
            {claim ? (
              <Tag tone="accent">Your claim is being reviewed</Tag>
            ) : (
              <button type="button" onClick={() => setClaiming(true)} className="font-medium text-ink underline underline-offset-4">
                Is this you? Claim this profile
              </button>
            )}
          </div>
        )}
      </div>

      {/* highlights: the treatments, each opening fees and times */}
      {p.serviceFees.length > 0 && (
        <ul aria-label="Treatments" className="-mx-4 flex gap-5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-8">
          {p.serviceFees.map((f) => (
            <li key={f.service} className="shrink-0">
              <button type="button" onClick={() => setPicked("book")} className="grid w-[76px] justify-items-center gap-1.5 text-center">
                <span className="grid size-16 place-items-center rounded-full border border-line-strong bg-[var(--surface-glass)] p-[3px]">
                  <span className={`grid size-full place-items-center rounded-full bg-gradient-to-br ${coverOf(f.service)} to-transparent text-[15px] font-semibold text-ink`}>
                    {f.service.split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}
                  </span>
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
              <Icon className="size-4" strokeWidth={1.75} />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>

        <div key={tab} role="tabpanel" className="fmd-enter grid gap-5">
          {tab === "posts" &&
            (posts.length ? (
              <PostGrid posts={posts} />
            ) : (
              <div className="grid justify-items-center gap-3 py-14 text-center">
                <span className="grid size-16 place-items-center rounded-full border-2 border-ink text-ink">
                  <Camera className="size-7" strokeWidth={1.5} />
                </span>
                <p className="text-[20px] font-semibold text-ink">No posts yet</p>
                <p className="text-[14px] text-ink-3">When {p.name} shares dental tips on FMD, they&apos;ll show up here.</p>
              </div>
            ))}

          {tab === "about" && (
            <Card title="About" className="mt-5">
              <p className="text-[14.5px] text-ink-2">{p.bio}</p>
              <div>
                <p className="text-[13.5px] text-ink-3">Qualifications</p>
                <p className="text-[14.5px] text-ink">{p.qualifications.join(", ")}</p>
              </div>
              <p className="flex items-center gap-2 text-[14px] text-ink-2">
                <Languages className="size-4 text-ink-3" strokeWidth={1.75} /> Consults in {p.languages.join(", ")}
              </p>
            </Card>
          )}

          {tab === "reviews" && (
            <div className="mt-5">
              <ReviewsSection dentistId={p.id} />
            </div>
          )}

          {tab === "book" && (
            <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
              <Card title={avail.mode === "live" ? "Next open times" : "Appointments"}>
                <Times p={p} avail={avail} />
              </Card>
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
            </div>
          )}

          {tab === "clinic" && (
            <Card title="Clinic" className="mt-5">
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
          )}
        </div>
      </div>

      {claiming && <ClaimSheet me={me ?? null} p={p} onClose={() => setClaiming(false)} onDone={(c) => (setClaim(c), setClaiming(false))} />}
    </div>
  );
}

/** Instagram's 3-across grid of square post covers; hover shows likes and comments. Also the account page's Saved tab. */
export function PostGrid({ posts }: { posts: FeedItem[] }) {
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
