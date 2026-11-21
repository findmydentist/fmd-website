"use client";

import { ArrowLeft, BadgeCheck, CalendarPlus, Check, ChevronDown, CircleCheck, Clock3, MapPin, Moon, Sparkles, Stethoscope, Sun, Sunset, UserRound, Users, Wrench } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ButtonLink, Panel, Tag } from "@/components/app/kit";
import { Field, fieldCls } from "@/components/app/Sheet";
import { Notice } from "@/components/Page";
import { Avatar } from "@/components/providers";
import { dayLabel, feeRange, istDate, longDay, noonOf, timeLabel } from "@/lib/format";
import { useMe } from "@/lib/me";
import { bookedTimes, BookingError, createBooking, ics, TYPES, type Booking, type TypeKey } from "@/sample/bookings";
import { CANCEL_TERMS, getAvailability, getProvider, PARTS, type Availability, type Part, type ProviderProfile, type Window } from "@/sample/providers";
import { track } from "@/lib/analytics";

export const windowLabel = (w: Window) => `${dayLabel(noonOf(w.date))} · ${PARTS[w.part].label}`;

/** Download a calendar file for a confirmed appointment. */
export function addToCalendar(b: Booking) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics(b)], { type: "text/calendar" }));
  a.download = `fmd-appointment-${b.ref}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------------- time picker (booking and rescheduling) ---------------- */

const chip = (on: boolean) =>
  `inline-flex h-10 items-center justify-center rounded-full border px-3.5 text-[14px] transition-colors ${
    on ? "border-[color-mix(in_srgb,var(--accent)_55%,transparent)] bg-[var(--accent-soft)] text-ink" : "border-line text-ink-2 hover:border-line-strong hover:text-ink"
  }`;

export function TimePicker({ avail, start, window, onPick }: { avail: Availability; start: number | null; window: Window | null; onPick: (v: { start: number | null; window: Window | null }) => void }) {
  const days = avail.mode === "live" ? [...new Set(avail.slots.map(istDate))] : [...new Set(avail.windows.map((w) => w.date))];
  const [day, setDay] = useState(start ? istDate(start) : (window?.date ?? days[0]));
  if (!days.length) return <Notice kind="info">No open times in the next week. Check back soon, or ask FMD Edge to help.</Notice>;
  return (
    <div className="grid gap-3">
      <div role="group" aria-label="Day" className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {days.map((d) => (
          <button key={d} type="button" aria-pressed={d === day} onClick={() => setDay(d)} className={`${chip(d === day)} shrink-0`}>
            {dayLabel(noonOf(d))}
          </button>
        ))}
      </div>
      {avail.mode === "live" ? (
        <div role="group" aria-label={`Times on ${longDay(noonOf(day))}`} className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {avail.slots
            .filter((t) => istDate(t) === day)
            .map((t) => (
              <button key={t} type="button" aria-pressed={t === start} onClick={() => onPick({ start: t, window: null })} className={chip(t === start)}>
                {timeLabel(t)}
              </button>
            ))}
        </div>
      ) : (
        <div role="group" aria-label={`Part of the day on ${longDay(noonOf(day))}`} className="grid gap-1.5 sm:grid-cols-3">
          {avail.windows
            .filter((w) => w.date === day)
            .map((w) => {
              const on = window?.date === w.date && window.part === w.part;
              return (
                <button key={w.part} type="button" aria-pressed={on} onClick={() => onPick({ start: null, window: w })} className={chip(on)}>
                  {PARTS[w.part as Part].label}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}

/* ---------------- /book/[dentistId] ---------------- */

type Draft = { type: TypeKey; start: number | null; window: Window | null; other: boolean; name: string; age: string; notes: string; key: string };
const draftKey = (id: string) => `fmd-booking-draft:${id}`;

/** Back from logging in (?resume=1): the choices saved before leaving. The page shows a skeleton until its data loads,
 *  so reading this during the first render can't cause a hydration mismatch. */
function savedDraft(id: string, resume: string | null): Draft | null {
  if (!resume || typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(draftKey(id));
    return v ? (JSON.parse(v) as Draft) : null;
  } catch {
    return null;
  }
}

/* ---------------- the booking page's pieces ---------------- */

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400";
const primary = `inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 text-[15.5px] font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-white/[0.08] disabled:text-ink-3 ${focus}`;
const card = "rounded-2xl border border-line bg-[var(--surface)] p-5 sm:p-6";
/** a day with this few times left is marked "Few left" */
const FEW = 4;
const hourOf = (t: number) => new Date(t + 5.5 * 3_600_000).getUTCHours();
const GROUPS: { key: Part; label: string; Icon: typeof Sun; has: (h: number) => boolean }[] = [
  { key: "morning", label: "Morning", Icon: Sun, has: (h) => h < 12 },
  { key: "afternoon", label: "Afternoon", Icon: Sunset, has: (h) => h >= 12 && h < 16 },
  { key: "evening", label: "Evening", Icon: Moon, has: (h) => h >= 16 },
];
const TYPE_ICON: Record<TypeKey, typeof Sun> = { consultation: Stethoscope, cleaning: Sparkles, followup: Check, treatment: Wrench };

function Steps({ at }: { at: 0 | 1 | 2 }) {
  return (
    <ol aria-label="Booking steps" className="flex items-center gap-2 text-[13.5px]">
      {["Choose", "Review", "Booked"].map((label, i) => (
        <li key={label} aria-current={i === at ? "step" : undefined} className="flex items-center gap-2">
          <span className={`grid size-6 place-items-center rounded-full text-[12px] font-semibold ${i < at ? "bg-sky-600 text-white" : i === at ? "border-2 border-sky-500 text-sky-400" : "border border-line text-ink-3"}`}>
            {i < at ? <Check aria-hidden className="size-3.5" strokeWidth={3} /> : i + 1}
          </span>
          <span className={i === at ? "font-semibold text-ink" : "text-ink-3"}>{label}</span>
          {i < 2 && <span aria-hidden className="h-px w-6 bg-[var(--border)] sm:w-10" />}
        </li>
      ))}
    </ol>
  );
}

/** the dentist, as on their profile: ringed photo (blue once verified), name, what and where */
function Who({ p }: { p: ProviderProfile }) {
  const verified = p.verification.status === "verified";
  return (
    <div className="flex items-center gap-4">
      <span className={`block shrink-0 rounded-full p-[2.5px] ${verified ? "bg-sky-500" : "bg-white/15"}`}>
        <span className="block rounded-full bg-[var(--background)] p-[2.5px]">
          <Avatar p={p} className="size-14 !rounded-full !border-0" />
        </span>
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[17px] font-semibold text-ink">
          <span className="truncate">{p.name}</span>
          {verified && <BadgeCheck aria-label="Verified by FMD" className="size-[18px] shrink-0 text-sky-400" strokeWidth={2} />}
          <Tag tone="muted">Demo</Tag>
        </p>
        <p className="truncate text-[14px] text-ink-3">
          {p.specialty}, {p.clinicDetails.name}, {p.clinicDetails.area}
        </p>
      </div>
    </div>
  );
}

/**
 * Choosing a time, like picking a show: a strip of days (the ones running low marked), then that day's times grouped
 * into morning, afternoon and evening. A clinic without a live calendar offers parts of the day instead.
 */
function SlotPicker({ avail, start, window: win, onPick }: { avail: Availability; start: number | null; window: Window | null; onPick: (v: { start: number | null; window: Window | null }) => void }) {
  const live = avail.mode === "live";
  const days = live ? [...new Set(avail.slots.map(istDate))] : [...new Set(avail.windows.map((w) => w.date))];
  const [day, setDay] = useState(start ? istDate(start) : (win?.date ?? days[0]));
  if (!days.length) return <Notice kind="info">No open times in the next week. Check back soon, or ask FMD Edge to help.</Notice>;
  const count = (d: string) => (live ? avail.slots.filter((t) => istDate(t) === d).length : avail.windows.filter((w) => w.date === d).length);
  const times = live ? avail.slots.filter((t) => istDate(t) === day) : [];

  return (
    <div className="grid gap-5">
      <div role="group" aria-label="Day" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {days.map((d) => {
          const [wd, dd, mon] = dayLabel(noonOf(d)).replace(",", "").split(" ");
          const on = d === day;
          const few = live && count(d) <= FEW;
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              aria-label={`${longDay(noonOf(d))}${few ? ", few times left" : ""}`}
              onClick={() => setDay(d)}
              className={`grid min-w-[72px] shrink-0 justify-items-center rounded-2xl border px-3 pb-2 pt-2.5 leading-tight transition-colors ${focus} ${
                on ? "border-sky-500 bg-sky-600 text-white" : "border-line text-ink hover:border-sky-500/60"
              }`}
            >
              <span className={`text-[12.5px] font-medium ${on ? "" : "text-ink-3"}`}>{wd}</span>
              <span className="text-[22px] font-bold tabular-nums">{dd}</span>
              <span className={`text-[12px] ${on ? "" : "text-ink-3"}`}>{mon}</span>
              <span className={`mt-1 h-1.5 w-1.5 rounded-full ${few ? "bg-amber-300" : on ? "bg-white/60" : "bg-sky-500/70"}`} aria-hidden />
            </button>
          );
        })}
      </div>

      {live ? (
        <>
          <ul aria-label="What the colours mean" className="flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-ink-3">
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-3 rounded-[4px] border border-sky-500/70" /> Available
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-3 rounded-[4px] border border-amber-300/80" /> Few left that day
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="size-3 rounded-[4px] bg-sky-500" /> Your pick
            </li>
          </ul>
          {GROUPS.map(({ key, label, Icon, has }) => {
            const list = times.filter((t) => has(hourOf(t)));
            if (!list.length) return null;
            const few = times.length <= FEW;
            return (
              <section key={key} aria-label={label} className="grid gap-2.5">
                <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink-2">
                  <Icon aria-hidden className="size-4 text-ink-3" strokeWidth={1.9} /> {label}
                  <span className="font-normal text-ink-3">({list.length})</span>
                </h3>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {list.map((t) => {
                    const on = t === start;
                    return (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={on}
                        aria-label={`${timeLabel(t)}${on ? ", selected" : ""}`}
                        onClick={() => onPick({ start: t, window: null })}
                        className={`min-h-11 rounded-xl border text-[15px] font-medium tabular-nums transition-colors ${focus} ${
                          on ? "border-sky-500 bg-sky-600 text-white" : few ? "border-amber-300/70 text-ink hover:bg-amber-300/10" : "border-sky-500/50 text-ink hover:bg-sky-500/15"
                        }`}
                      >
                        {timeLabel(t)}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </>
      ) : (
        <div role="group" aria-label={`Part of the day on ${longDay(noonOf(day))}`} className="grid gap-2 sm:grid-cols-3">
          {avail.windows
            .filter((w) => w.date === day)
            .map((w) => {
              const on = win?.date === w.date && win.part === w.part;
              const G = GROUPS.find((g) => g.key === w.part)!;
              return (
                <button
                  key={w.part}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onPick({ start: null, window: w })}
                  className={`flex min-h-16 items-center gap-3 rounded-2xl border px-4 text-left transition-colors ${focus} ${on ? "border-sky-500 bg-sky-600 text-white" : "border-sky-500/50 text-ink hover:bg-sky-500/15"}`}
                >
                  <G.Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.9} />
                  <span className="text-[14.5px] font-medium">{PARTS[w.part as Part].label}</span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}

/** the ticket's tear line: two notches and a dashed rule */
function Tear() {
  return (
    <div aria-hidden className="relative -mx-5 my-1 h-0 sm:-mx-6">
      <span className="absolute -left-3 -top-3 size-6 rounded-full border border-line bg-[var(--background)]" />
      <span className="absolute -right-3 -top-3 size-6 rounded-full border border-line bg-[var(--background)]" />
      <span className="absolute inset-x-5 top-0 border-t-2 border-dashed border-[var(--border)]" />
    </div>
  );
}

/* ---------------- /book/[dentistId] ---------------- */

export function BookPage() {
  const { dentistId } = useParams<{ dentistId: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const me = useMe();
  const [p, setP] = useState<ProviderProfile | null | undefined>(undefined);
  const [avail, setAvail] = useState<Availability | null>(null);
  const [resumed] = useState(() => savedDraft(dentistId, params.get("resume")));
  const [step, setStep] = useState<"choose" | "review" | "done">(resumed ? "review" : "choose");
  const [f, setF] = useState<Draft>(resumed ?? { type: "consultation", start: Number(params.get("slot")) || null, window: null, other: false, name: "", age: "", notes: "", key: "" });
  const [err, setErr] = useState<{ msg: string; bookingId?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Booking | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);

  useEffect(() => {
    getProvider(dentistId).then(setP);
  }, [dentistId]);
  // open times, minus the ones this person already holds; waits until we know who is signed in
  const userId = me === undefined ? undefined : (me?.id ?? null);
  const loadTimes = useCallback(() => {
    if (userId === undefined) return;
    (userId ? bookedTimes(userId) : Promise.resolve(undefined)).then((booked) => getAvailability(dentistId, booked)).then(setAvail);
  }, [dentistId, userId]);
  useEffect(loadTimes, [loadTimes]);

  if (p === undefined || !avail) return <div className="app-panel h-64 animate-pulse" aria-busy />;
  if (p === null)
    return (
      <Panel className="grid justify-items-start gap-3 p-6">
        <h1 className="text-[19px] font-medium text-ink">We couldn&apos;t find that dentist</h1>
        <ButtonLink href="/dentists" variant="secondary">
          Find a dentist
        </ButtonLink>
      </Panel>
    );

  const set = (patch: Partial<Draft>) => (setErr(null), setF((x) => ({ ...x, ...patch })));
  // a slot from the profile page that's no longer open isn't kept
  const start = f.start && avail.mode === "live" && avail.slots.includes(f.start) ? f.start : null;
  const age = f.age.trim() === "" ? null : Number(f.age);
  const problem =
    !start && !f.window
      ? avail.mode === "live"
        ? "Choose a time."
        : "Choose a day and part of the day."
      : f.other && !f.name.trim()
        ? "Enter the name of the person the appointment is for."
        : f.other && age !== null && !(Number.isInteger(age) && age >= 0 && age <= 120)
          ? "Enter an age from 0 to 120, or leave it empty."
          : null;

  const review = () => {
    if (problem) return setErr({ msg: problem });
    set({ start, key: f.key || crypto.randomUUID() }); // one key per booking, kept through retries
    setStep("review");
    scrollTo({ top: 0 });
  };
  const logInFirst = () => {
    try {
      sessionStorage.setItem(draftKey(dentistId), JSON.stringify(f));
    } catch {
      // nothing kept: they'll choose again after logging in
    }
    router.push(`/login?next=${encodeURIComponent(`/book/${dentistId}?resume=1`)}`);
  };
  const confirm = async () => {
    if (!me) return;
    setBusy(true);
    setErr(null);
    try {
      const b = await createBooking(
        me.id,
        { dentist_id: dentistId, type: f.type, start: f.start ?? undefined, window: f.window ?? undefined, for: f.other ? { name: f.name, age } : null, notes: f.notes || null },
        f.key,
      );
      try {
        sessionStorage.removeItem(draftKey(dentistId));
      } catch {
        // nothing to clear
      }
      track("booking_confirmed", { mode: f.start ? "live" : "request", for_someone_else: f.other });
      setDone(b);
      setStep("done");
      scrollTo({ top: 0 });
    } catch (e) {
      const x = e as BookingError;
      if (x.code === "slot_taken" || x.code === "not_open") {
        // nothing was booked: back to choosing, with fresh times
        setF((d) => ({ ...d, start: null, window: null }));
        setStep("choose");
        loadTimes();
      }
      setErr({ msg: x.message, bookingId: x.code === "duplicate" ? x.bookingId : undefined });
    } finally {
      setBusy(false);
    }
  };
  const fee = p.fee ? feeRange(p.fee) : null;

  /* ---- 3. booked: the ticket ---- */
  if (step === "done" && done)
    return (
      <div className="mx-auto grid w-full max-w-[560px] gap-5">
        <Steps at={2} />
        <div className={`grid gap-4 ${card}`}>
          <div className="flex items-center gap-3">
            <CircleCheck aria-hidden className="size-9 shrink-0 text-sky-400" strokeWidth={1.75} />
            <div>
              <h1 className="text-[22px] font-bold text-ink">{done.status === "confirmed" ? "You're booked" : "Request sent"}</h1>
              <p className="text-[14px] text-ink-3">{done.status === "confirmed" ? "We've saved it in your appointments." : "The clinic confirms a time, usually within a day."}</p>
            </div>
          </div>
          <Tear />
          <Who p={p} />
          <p className="text-[18px] font-semibold text-ink">
            {done.status === "confirmed" ? `${longDay(done.start!)}, ${timeLabel(done.start!)}` : windowLabel(done.window!)}
          </p>
          <p className="text-[14.5px] text-ink-2">
            {TYPES[done.type].label} at {done.clinic.name}
          </p>
          <Tear />
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[13px] text-ink-3">Booking reference</p>
              <p className="font-mono text-[22px] font-semibold tracking-wider text-ink">{done.ref}</p>
            </div>
            {done.status === "confirmed" && (
              <button type="button" onClick={() => addToCalendar(done)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/[0.08] px-4 text-[14.5px] font-semibold text-ink hover:bg-white/[0.13] ${focus}`}>
                <CalendarPlus aria-hidden className="size-[18px]" strokeWidth={1.9} /> Add to calendar
              </button>
            )}
          </div>
        </div>
        <Link href={`/appointments/${done.id}`} className={primary}>
          View appointment
        </Link>
      </div>
    );

  /* ---- 2. review: the ticket before it's issued ---- */
  if (step === "review") {
    const rows: [string, ReactNode][] = [
      ["Visit", `${TYPES[f.type].label}, about ${TYPES[f.type].minutes} minutes`],
      ["For", f.other ? `${f.name.trim()}${age !== null ? `, ${age}` : ""}` : `You${me ? ` (${me.full_name})` : ""}`],
      ["Clinic", `${p.clinicDetails.name}, ${p.clinicDetails.address}, ${p.clinicDetails.city}`],
      ["Payment", "Pay at the clinic. Online payment comes later."],
      ["Cancelling", CANCEL_TERMS],
    ];
    if (f.notes.trim()) rows.splice(2, 0, ["Your note", f.notes.trim()]);
    return (
      <div className="mx-auto grid w-full max-w-[640px] gap-5">
        <button type="button" onClick={() => (setErr(null), setStep("choose"))} className={`inline-flex min-h-11 w-fit items-center gap-1.5 rounded-lg text-[14.5px] text-ink-3 hover:text-ink ${focus}`}>
          <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} /> Change details
        </button>
        <Steps at={1} />
        <h1 className="text-[26px] font-bold text-ink">Check and confirm</h1>
        {err && (
          <Notice kind="error">
            {err.msg}{" "}
            {err.bookingId ? (
              <Link href={`/appointments/${err.bookingId}`} className="font-medium underline underline-offset-4">
                View your appointment
              </Link>
            ) : (
              <Link href={`/help/contact?topic=booking&about=${encodeURIComponent(`booking with ${p.name}`)}`} className="font-medium underline underline-offset-4">
                Get help
              </Link>
            )}
          </Notice>
        )}
        <div className={`grid gap-4 ${card}`}>
          <Who p={p} />
          <div className="rounded-xl bg-sky-500/15 px-4 py-3">
            <p className="text-[13px] text-sky-300">When</p>
            <p className="text-[18px] font-semibold text-ink">{f.start ? `${longDay(f.start)}, ${timeLabel(f.start)}` : f.window ? windowLabel(f.window) : ""}</p>
            <p className="text-[13px] text-ink-3">{f.start ? "India time" : "The clinic confirms an exact time."}</p>
          </div>
          <Tear />
          <dl className="grid gap-3 text-[14.5px]">
            {rows.map(([k, v]) => (
              <div key={k} className="grid gap-0.5 sm:grid-cols-[120px_1fr]">
                <dt className="text-ink-3">{k}</dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <Tear />
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[15px] text-ink-2">Consultation fee</span>
            <span className="text-[20px] font-bold tabular-nums text-ink">{fee ?? "Set by the clinic"}</span>
          </div>
          <p className="-mt-2 text-[13px] text-ink-3">Treatment costs are confirmed by the dentist after examining you.</p>
        </div>
        {me ? (
          <button type="button" onClick={confirm} disabled={busy} className={primary}>
            {busy ? "Booking…" : f.start ? "Confirm booking" : "Send request"}
          </button>
        ) : (
          <>
            <p className="text-[14.5px] text-ink-2">Log in or create an account to confirm. We&apos;ll keep what you&apos;ve chosen.</p>
            <button type="button" onClick={logInFirst} className={primary}>
              Log in to confirm
            </button>
          </>
        )}
        <p className="text-[13px] text-ink-3">Nothing is booked until you confirm. FMD AI never books for you.</p>
      </div>
    );
  }

  /* ---- 1. choose: what, when, for whom; the summary bar follows along ---- */
  const picked = start ? `${dayLabel(start)}, ${timeLabel(start)}` : f.window ? windowLabel(f.window) : null;
  return (
    <div className="mx-auto grid w-full max-w-[860px] gap-5 pb-40 lg:pb-28">
      <Link href={`/dentists/${p.id}`} className={`inline-flex min-h-11 w-fit items-center gap-1.5 rounded-lg text-[14.5px] text-ink-3 hover:text-ink ${focus}`}>
        <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} /> Back to profile
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Who p={p} />
        <Steps at={0} />
      </div>
      <h1 className="text-[26px] font-bold text-ink">{avail.mode === "live" ? "Book an appointment" : "Request an appointment"}</h1>
      {err && <Notice kind="error">{err.msg}</Notice>}

      <section aria-labelledby="when-h" className={`grid gap-4 ${card}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="when-h" className="text-[18px] font-semibold text-ink">
            {avail.mode === "live" ? "Pick a day and time" : "Pick a day and part of the day"}
          </h2>
          <p className="flex items-center gap-1.5 text-[13px] text-ink-3">
            {avail.mode === "live" ? (
              <>
                <Clock3 aria-hidden className="size-4" strokeWidth={1.75} /> India time, at least 2 hours ahead
              </>
            ) : (
              <>
                <MapPin aria-hidden className="size-4" strokeWidth={1.75} /> The clinic confirms an exact time
              </>
            )}
          </p>
        </div>
        <SlotPicker avail={avail} start={start} window={f.window} onPick={(v) => set(v)} />
      </section>

      <section aria-labelledby="what-h" className={`grid gap-4 ${card}`}>
        <h2 id="what-h" className="text-[18px] font-semibold text-ink">
          What is the visit for?
        </h2>
        <div role="radiogroup" aria-labelledby="what-h" className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(TYPES) as TypeKey[]).map((t) => {
            const on = f.type === t;
            const I = TYPE_ICON[t];
            return (
              <label
                key={t}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition-colors has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-sky-400 ${
                  on ? "border-sky-500 bg-sky-500/15" : "border-line hover:border-line-strong"
                }`}
              >
                <input type="radio" name="type" className="sr-only" checked={on} onChange={() => set({ type: t })} />
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${on ? "bg-sky-600 text-white" : "bg-white/[0.06] text-ink-2"}`}>
                  <I aria-hidden className="size-5" strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink">{TYPES[t].label}</span>
                  <span className="block text-[13px] text-ink-3">
                    {TYPES[t].text}, about {TYPES[t].minutes} min
                  </span>
                </span>
                {on && <Check aria-hidden className="size-5 shrink-0 text-sky-400" strokeWidth={2.5} />}
              </label>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="who-h" className={`grid gap-4 ${card}`}>
        <h2 id="who-h" className="text-[18px] font-semibold text-ink">
          Who is it for?
        </h2>
        <div role="radiogroup" aria-labelledby="who-h" className="grid grid-cols-2 gap-1 rounded-2xl bg-white/[0.05] p-1 sm:w-fit">
          {[false, true].map((other) => {
            const on = f.other === other;
            const I = other ? Users : UserRound;
            return (
              <label
                key={String(other)}
                className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold transition-colors has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-sky-400 ${
                  on ? "bg-sky-600 text-white" : "text-ink-2 hover:text-ink"
                }`}
              >
                <input type="radio" name="for" className="sr-only" checked={on} onChange={() => set({ other })} />
                <I aria-hidden className="size-[18px]" strokeWidth={1.9} /> {other ? "Someone else" : "Me"}
              </label>
            );
          })}
        </div>
        {f.other && (
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <Field label="Their name">
              <input className={fieldCls} value={f.name} onChange={(e) => set({ name: e.target.value })} maxLength={120} autoComplete="off" />
            </Field>
            <Field label="Age (optional)">
              <input className={fieldCls} type="number" inputMode="numeric" min={0} max={120} value={f.age} onChange={(e) => set({ age: e.target.value })} />
            </Field>
          </div>
        )}
        {/* the note, only when wanted */}
        {noteOpen || f.notes ? (
          <Field label="Note for the clinic (optional)" hint={`Only what helps the clinic prepare. ${f.notes.length}/300`}>
            <textarea className={`${fieldCls} h-24 resize-y py-2.5`} value={f.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={300} placeholder="e.g. sensitivity on the lower left side for a week" />
          </Field>
        ) : (
          <button type="button" onClick={() => setNoteOpen(true)} className={`inline-flex min-h-11 w-fit items-center gap-1.5 rounded-lg text-[14.5px] font-medium text-sky-400 hover:text-sky-300 ${focus}`}>
            <ChevronDown aria-hidden className="size-4" strokeWidth={2} /> Add a note for the clinic
          </button>
        )}
      </section>

      {/* the summary bar: what's chosen so far, the fee, and the one way on (above the phone tab bar) */}
      <div className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-30 px-3 lg:bottom-4">
        <div className="mx-auto flex max-w-[860px] items-center gap-3 rounded-2xl border border-line bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.45)] backdrop-blur sm:p-4">
          <div className="min-w-0 flex-1 leading-tight" aria-live="polite">
            {picked ? (
              <>
                <p className="truncate text-[15px] font-semibold text-ink">{picked}</p>
                <p className="truncate text-[13px] text-ink-3">
                  {TYPES[f.type].label}
                  {fee ? `, ${fee}` : ""}
                </p>
              </>
            ) : (
              <>
                <p className="text-[15px] font-semibold text-ink">{avail.mode === "live" ? "Pick a time" : "Pick a part of the day"}</p>
                <p className="text-[13px] text-ink-3">{fee ? `Consultation ${fee}` : "The clinic confirms the fee"}</p>
              </>
            )}
          </div>
          <button type="button" onClick={review} disabled={!picked} className={`${primary} shrink-0`}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
