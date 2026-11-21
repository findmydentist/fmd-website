"use client";

import { Building2, CalendarClock, Clock3, GraduationCap, Info, Languages, LayoutGrid, MapPin, Star } from "lucide-react";
import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { Button, ButtonLink, Tag } from "@/components/app/kit";
import { Field, fieldCls, Sheet } from "@/components/app/Sheet";
import { Notice } from "@/components/Page";
import { Verification } from "@/components/providers";
import { SponsoredBadge } from "@/components/ui";
import { dayLabel, istDate, noonOf, timeLabel } from "@/lib/format";
import type { Me } from "@/lib/fmd";
import { submitClaim, type Availability, type Claim, type ProviderProfile } from "@/sample/providers";
import { coverOf } from "../../explore/Explore";
import type { DentistView } from "./useDentistProfile";

/** The pieces of /dentists/[id] its layout uses. */

export type ProfileTab = "posts" | "about" | "reviews" | "book" | "clinic";
export const PROFILE_TABS: [ProfileTab, string, typeof LayoutGrid][] = [
  ["posts", "Posts", LayoutGrid],
  ["about", "About", Info],
  ["reviews", "Reviews", Star],
  ["book", "Book & fees", CalendarClock],
  ["clinic", "Clinic", Building2],
];

/** "Root Canal Treatment" → "RC", for a treatment's round badge */
export const short = (x: string) => x.split(/\s+/).map((w) => w[0]).slice(0, 2).join("");

/** cards and buttons */
export const fbCard = "rounded-xl border border-line bg-[var(--surface)] p-4";
export const fbGrey = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white/[0.1] px-3 text-[14.5px] font-semibold text-ink hover:bg-white/[0.15]";

/* ---------------- by the name and under it ---------------- */

/** "Listed by FMD…; is this you?" for dentists who haven't joined */
export function ClaimNote({ v }: { v: DentistView }) {
  if (v.p.claimed) return null;
  return (
    <div className="rounded-2xl border border-line px-4 py-3 text-[14px] text-ink-2">
      Listed by FMD from public information; this dentist hasn&apos;t joined FMD yet.{" "}
      {v.claim ? (
        <Tag tone="accent">Your claim is being reviewed</Tag>
      ) : (
        <button type="button" onClick={v.startClaim} className="font-medium text-ink underline underline-offset-4">
          Is this you? Claim this profile
        </button>
      )}
    </div>
  );
}

/** what FMD checked, and any sponsorship */
export function Trust({ p }: { p: ProviderProfile }) {
  return (
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
}

export function NoPosts({ name }: { name: string }) {
  return (
    <div className="grid justify-items-center gap-3 py-14 text-center">
      <span className="grid size-16 place-items-center rounded-3xl bg-sky-500/15 text-sky-300">
        <LayoutGrid className="size-7" strokeWidth={1.5} />
      </span>
      <p className="text-[20px] font-semibold text-ink">No posts yet</p>
      <p className="text-[14px] text-ink-3">When {name} shares dental tips on FMD, they&apos;ll show up here.</p>
    </div>
  );
}

/* ---------------- the side column: Intro ---------------- */

/** `bio` off where the header already shows it */
export function Intro({ v, bio = true }: { v: DentistView; bio?: boolean }) {
  const { p, c } = v;
  return (
    <section className={`grid gap-3 ${fbCard}`}>
      <h2 className="text-[20px] font-bold text-ink">Intro</h2>
      {bio && <p className="text-center text-[15px] text-ink">{p.bio}</p>}
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
      <div className="grid gap-1.5">
        <Trust p={p} />
      </div>
    </section>
  );
}

export function Treatments({ v }: { v: DentistView }) {
  const { p, pickTab } = v;
  if (!p.serviceFees.length) return null;
  return (
    <section className={`grid gap-3 ${fbCard}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-bold text-ink">Treatments</h2>
        <button type="button" onClick={() => pickTab("book")} className="rounded-md px-2 py-1 text-[15px] text-[#4599ff] hover:bg-white/[0.06]">
          See fees
        </button>
      </div>
      <ul className="grid grid-cols-3 gap-2">
        {p.serviceFees.map((f) => (
          <li key={f.service}>
            <button type="button" onClick={() => pickTab("book")} className="grid w-full gap-1 text-left text-[13px] font-semibold leading-tight text-ink hover:underline">
              <span className={`grid aspect-square place-items-center rounded-lg bg-gradient-to-br ${coverOf(f.service)} to-[var(--surface-elevated)] text-[20px]`}>{short(f.service)}</span>
              <span className="line-clamp-2">{f.service}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------- open times and claiming ---------------- */

/** A few open times to tap straight into booking, or how a clinic without a connected calendar works. */
export function Times({ p, avail }: { p: ProviderProfile; avail: Availability }) {
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

export function ClaimSheet({ me, p, onClose, onDone }: { me: Me | null; p: ProviderProfile; onClose: () => void; onDone: (c: Claim) => void }) {
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
