"use client";

import { BadgeCheck, Building2, CalendarClock, Check, Clock3, Sparkles, ExternalLink, Flag, GraduationCap, Info, Languages, MapPin, PhoneOff, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Tag } from "@/components/app/kit";
import { Verification } from "@/components/providers";
import { SponsoredBadge } from "@/components/ui";
import { dayLabel, feeRange, istDate, noonOf, timeLabel } from "@/lib/format";
import { useMe } from "@/lib/me";
import { POLICY } from "@/sample/providers";
import { ASPECTS, dentistReviews, type Aspect } from "@/sample/reviews";
import { MascotLoop } from "@/components/MascotLoop";
import { hy } from "../../ProfileHybrid";
import { ReportReview } from "../../trust/Trust";
import type { DentistView } from "./useDentistProfile";

/**
 * Layout 3's tab panels (About, Reviews, Book & fees, Clinic): one clear heading each, labelled rows instead of loose
 * text, the one thing to do as the blue button, numbers lined up. Posts are drawn by HybridLayout itself.
 */
export function HybridPanel({ v }: { v: DentistView }) {
  return (
    <div key={v.tab} role="tabpanel" className="fmd-enter">
      {v.tab === "about" && <About v={v} />}
      {v.tab === "reviews" && <Reviews dentistId={v.p.id} />}
      {v.tab === "book" && <Book v={v} />}
      {v.tab === "clinic" && <Clinic v={v} />}
    </div>
  );
}

const h2 = "text-[18px] font-semibold text-ink";

/** a labelled row: icon, what it is, then the value */
/** `even`: the same padding on every row (rows side by side in a grid, where first/last mean nothing) */
function Row({ icon: Icon, label, children, even = false }: { icon: typeof Info; label: string; children: ReactNode; even?: boolean }) {
  return (
    <div className={`grid grid-cols-[20px_minmax(0,1fr)] gap-x-3 gap-y-0.5 ${even ? "py-2.5" : "py-3 first:pt-0 last:pb-0"}`}>
      <Icon aria-hidden className="row-span-2 mt-0.5 size-5 text-ink-3" strokeWidth={1.75} />
      <dt className="text-[13.5px] text-ink-3">{label}</dt>
      <dd className="text-[15px] text-ink">{children}</dd>
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <ul className="mt-1 flex flex-wrap gap-1.5">
      {items.map((x) => (
        <li key={x} className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[14px] text-ink">
          {x}
        </li>
      ))}
    </ul>
  );
}

/* ---------------- About: as LinkedIn lays out a profile ---------------- */

/** a section of the About tab: a heading, then its entries */
function LiSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={`grid gap-4 ${hy.card}`}>
      <h2 id={id} className="text-[20px] font-semibold text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** one entry: a square "logo" tile, a title, then lines under it */
function Entry({ tile, title, lines, extra }: { tile: ReactNode; title: ReactNode; lines: ReactNode[]; extra?: ReactNode }) {
  return (
    <li className="flex gap-3.5 border-t border-line pt-4 first:border-t-0 first:pt-0">
      <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-white/[0.07] text-ink-2">{tile}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[15.5px] font-semibold text-ink">{title}</p>
        {lines.map((l, i) => (
          <p key={i} className={i === 0 ? "text-[14.5px] text-ink-2" : "text-[14px] text-ink-3"}>
            {l}
          </p>
        ))}
        {extra}
      </div>
    </li>
  );
}

function About({ v }: { v: DentistView }) {
  const { p, c } = v;
  const [more, setMore] = useState(false);
  const verified = p.verification.status === "verified";
  const since = p.experienceYears ? new Date().getFullYear() - p.experienceYears : null;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid gap-4">
        <LiSection id="li-about" title="About">
          <div>
            <p className={`max-w-[70ch] text-[15.5px] leading-relaxed text-ink-2 ${more ? "" : "line-clamp-3"}`}>{p.bio}</p>
            {!more && p.bio.length > 180 && (
              <button type="button" onClick={() => setMore(true)} className={`mt-1 min-h-9 rounded text-[14.5px] font-semibold text-ink-2 hover:text-ink ${hy.focus}`}>
                …see more
              </button>
            )}
          </div>
        </LiSection>

        <LiSection id="li-exp" title="Experience">
          <ul className="grid gap-4">
            <Entry
              tile={<Building2 aria-hidden className="size-6" strokeWidth={1.6} />}
              title={p.specialty}
              lines={[
                <Link key="c" href={`/clinics/${c.id}`} className={`rounded hover:underline ${hy.focus}`}>
                  {c.name}
                </Link>,
                since ? `${since} – present · ${p.experienceYears} years` : "Present",
                `${c.area}, ${c.city}`,
              ]}
            />
          </ul>
        </LiSection>

        <LiSection id="li-edu" title="Education">
          <ul className="grid gap-4">
            {p.qualifications.map((q) => (
              <Entry key={q} tile={<GraduationCap aria-hidden className="size-6" strokeWidth={1.6} />} title={q} lines={[q.startsWith("BDS") ? "Bachelor of Dental Surgery" : q.startsWith("MDS") ? "Master of Dental Surgery" : "Qualification"]} />
            ))}
          </ul>
        </LiSection>

        <LiSection id="li-lic" title="Licenses & certifications">
          <ul className="grid gap-4">
            <Entry
              tile={<ShieldCheck aria-hidden className={`size-6 ${verified ? "text-[var(--accent)]" : ""}`} strokeWidth={1.6} />}
              title="Dental council registration"
              lines={[verified ? "Checked by FMD" : "Not checked by FMD yet", p.verification.checks]}
              extra={
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Verification v={p.verification} />
                  {p.sponsored && <SponsoredBadge />}
                </div>
              }
            />
          </ul>
        </LiSection>

        {p.serviceFees.length > 0 && (
          <LiSection id="li-skills" title="Skills">
            <ul className="grid gap-0">
              {p.serviceFees.map((f) => (
                <li key={f.service} className="flex items-center justify-between gap-3 border-t border-line py-3 first:border-t-0 first:pt-0 last:pb-0">
                  <span className="text-[15.5px] font-semibold text-ink">{f.service}</span>
                  <button type="button" onClick={() => v.pickTab("book")} className={`inline-flex min-h-9 items-center rounded-full border border-line px-3.5 text-[13.5px] font-semibold text-ink-2 hover:border-[var(--accent)] hover:text-ink ${hy.focus}`}>
                    See fees
                  </button>
                </li>
              ))}
            </ul>
          </LiSection>
        )}

        <LiSection id="li-lang" title="Languages">
          <ul className="grid gap-0">
            {p.languages.map((l) => (
              <li key={l} className="border-t border-line py-3 first:border-t-0 first:pt-0 last:pb-0">
                <p className="text-[15.5px] font-semibold text-ink">{l}</p>
                <p className="text-[14px] text-ink-3">Consults in {l}</p>
              </li>
            ))}
          </ul>
        </LiSection>
      </div>

      {/* the side column, as LinkedIn's: the short version */}
      <aside className="grid gap-4 lg:sticky lg:top-[152px]">
        <section aria-labelledby="li-glance" className={`grid gap-3 ${hy.card}`}>
          {/* FMD AI's short summary of this profile, with its mascot explaining */}
          <div className="flex items-center gap-3">
            <span className="relative block h-[88px] w-[66px] shrink-0">
              <MascotLoop still="/models/stills/assistant-explaining.webp" video="/models/videos/assistant-explaining.webm?v=1" sizes="66px" />
            </span>
            <div className="min-w-0">
              <h2 id="li-glance" className="text-[16px] font-semibold text-ink">
                At a glance
              </h2>
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent)]">
                <Sparkles aria-hidden className="size-3.5" strokeWidth={2} /> Summary by FMD AI
              </p>
            </div>
          </div>
          <dl className="grid gap-2.5 text-[14.5px]">
            <div className="flex items-center gap-2.5">
              <ShieldCheck aria-hidden className={`size-[18px] ${verified ? "text-[var(--accent)]" : "text-ink-3"}`} strokeWidth={1.75} />
              <dt className="sr-only">Verification</dt>
              <dd className="text-ink">{verified ? "Registration checked by FMD" : "Not verified yet"}</dd>
            </div>
            {p.experienceYears ? (
              <div className="flex items-center gap-2.5">
                <Clock3 aria-hidden className="size-[18px] text-ink-3" strokeWidth={1.75} />
                <dt className="sr-only">Experience</dt>
                <dd className="text-ink">{p.experienceYears} years in practice</dd>
              </div>
            ) : null}
            <div className="flex items-center gap-2.5">
              <Languages aria-hidden className="size-[18px] text-ink-3" strokeWidth={1.75} />
              <dt className="sr-only">Languages</dt>
              <dd className="text-ink">{p.languages.join(", ")}</dd>
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin aria-hidden className="size-[18px] text-ink-3" strokeWidth={1.75} />
              <dt className="sr-only">Where</dt>
              <dd className="text-ink">
                {c.area}, {c.city}
              </dd>
            </div>
          </dl>
          <p className="text-[13px] text-ink-3">Verified means FMD checked the registration with the dental council. It isn&apos;t a rating of the care.</p>
          <p className="border-t border-line pt-3 text-[12.5px] text-ink-3">FMD AI made this from the details on this profile. Check anything important with the clinic.</p>
        </section>
      </aside>
    </div>
  );
}

/* ---------------- Reviews ---------------- */

function Stars({ n, size = "size-4" }: { n: number; size?: string }) {
  return (
    <span className="inline-flex" aria-label={`${n} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} aria-hidden className={`${size} ${i <= Math.round(n) ? "fill-amber-300 text-amber-300" : "text-white/20"}`} strokeWidth={1.5} />
      ))}
    </span>
  );
}

function Reviews({ dentistId }: { dentistId: string }) {
  const me = useMe();
  const [data, setData] = useState<Awaited<ReturnType<typeof dentistReviews>> | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [reported, setReported] = useState<string[]>([]);
  const userId = me === undefined ? undefined : (me?.id ?? null);
  useEffect(() => {
    if (userId !== undefined) dentistReviews(userId, dentistId).then(setData);
  }, [userId, dentistId]);
  if (!data) return <div className={`h-40 animate-pulse ${hy.card}`} aria-busy />;
  const when = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      {/* the summary first */}
      <section aria-labelledby="rev-h" className={`grid gap-4 ${hy.card}`}>
        <h2 id="rev-h" className={h2}>
          Patient reviews
        </h2>
        {data.count === 0 ? (
          <p className="text-[15px] text-ink-2">No reviews yet. Only patients who visited through FMD can review.</p>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <span className="text-[44px] font-semibold leading-none tabular-nums text-ink">{data.averages.overall?.toFixed(1)}</span>
              <span className="grid gap-1">
                <Stars n={data.averages.overall ?? 0} size="size-5" />
                <span className="text-[14px] text-ink-3">
                  {data.count} {data.count === 1 ? "review" : "reviews"}, all from verified visits
                </span>
              </span>
            </div>
            <dl className="grid gap-2.5">
              {(Object.keys(ASPECTS) as Aspect[])
                .filter((a) => a !== "overall")
                .map((a) => (
                  <div key={a} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                    <dt className="text-[14px] text-ink-2">{ASPECTS[a]}</dt>
                    <dd className="text-[14px] font-medium tabular-nums text-ink">{data.averages[a]?.toFixed(1)} / 5</dd>
                    <span aria-hidden className="col-span-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                      <span className="block h-full rounded-full bg-[var(--accent)]" style={{ width: `${((data.averages[a] ?? 0) / 5) * 100}%` }} />
                    </span>
                  </div>
                ))}
            </dl>
          </>
        )}
        <p className="text-[13px] text-ink-3">Every review from a verified visit is shown, low ones too. Ratings are about the experience, not clinical results.</p>
      </section>
      {data.count > 0 && (
        <ul aria-label="Reviews" className="grid gap-3">
          {data.items.map((r) => (
            <li key={r.id} className={`grid gap-2 ${hy.card}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[15px] font-semibold text-ink">{r.mine ? "You" : r.author}</span>
                {r.verified_visit && (
                  <span className="inline-flex items-center gap-1 text-[13px] text-[var(--accent)]">
                    <BadgeCheck aria-hidden className="size-4" strokeWidth={1.9} /> Verified visit
                  </span>
                )}
                <span className="ml-auto text-[13px] text-ink-3">{when(r.at)}</span>
              </div>
              <Stars n={r.ratings.overall} />
              {r.comment && <p className="max-w-[68ch] text-[15px] leading-relaxed text-ink-2">{r.comment}</p>}
              {r.response && (
                <p className="rounded-xl bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-ink-2">
                  <span className="font-semibold text-ink">The clinic replied: </span>
                  {r.response.text}
                </p>
              )}
              {!r.mine &&
                (reported.includes(r.id) ? (
                  <p className="text-[13px] text-ink-3">Reported. Thanks, FMD will look at it.</p>
                ) : (
                  <button type="button" onClick={() => setReporting(r.id)} className={`inline-flex min-h-9 w-fit items-center gap-1.5 rounded-lg text-[13px] text-ink-3 hover:text-ink ${hy.focus}`}>
                    <Flag aria-hidden className="size-3.5" strokeWidth={1.75} /> Report review
                  </button>
                ))}
            </li>
          ))}
        </ul>
      )}
      {reporting && <ReportReview userId={me?.id ?? null} id={reporting} onClose={() => setReporting(null)} onDone={() => (setReported((x) => [...x, reporting]), setReporting(null))} />}
    </div>
  );
}

/* ---------------- Book & fees: as a travel site books a trip ---------------- */

/**
 * The open days as a strip with how many times each has, then that day's times; the visit options as cards to select
 * (like room types); and a price summary that follows along, with the one Book button and what's assured.
 */
function Book({ v }: { v: DentistView }) {
  const { p, avail, bookLabel } = v;
  const live = avail.mode === "live";
  const days = live ? [...new Set(avail.slots.map(istDate))] : [];
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState<number | null>(null);
  const [visit, setVisit] = useState<string>("Consultation");
  const d = days[Math.min(day, Math.max(days.length - 1, 0))];
  const times = live ? avail.slots.filter((t) => istDate(t) === d) : [];
  const per = (x: string) => (live ? avail.slots.filter((t) => istDate(t) === x).length : 0);
  const options = [{ service: "Consultation", note: "First visit and check-up", range: p.fee ? feeRange(p.fee) : "Set by the clinic" }, ...p.serviceFees.map((f) => ({ service: f.service, note: "Estimate, confirmed after your check-up", range: feeRange(f) }))];
  const chosen = options.find((o) => o.service === visit) ?? options[0];
  const href = `/book/${p.id}${slot ? `?slot=${slot}` : ""}`;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid gap-4">
        <section aria-labelledby="bk-when" className={`grid gap-4 ${hy.card}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="bk-when" className={h2}>
              {live ? "When would you like to come?" : "Ask for an appointment"}
            </h2>
            {live && (
              <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-3">
                <CalendarClock aria-hidden className="size-4" strokeWidth={1.75} /> Live from the clinic&apos;s calendar (demo)
              </span>
            )}
          </div>
          {!live ? (
            <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
              This clinic hasn&apos;t connected its calendar. Ask for a day and a part of the day; the clinic confirms an exact time, usually within a day.
            </p>
          ) : !days.length ? (
            <p className="text-[15px] text-ink-2">No open times this week. Check back soon, or ask FMD Edge to help.</p>
          ) : (
            <>
              {/* the date strip: each day with how many times are open, like fares under dates */}
              <div role="group" aria-label="Day" className="-mx-5 flex overflow-x-auto border-y border-line [scrollbar-width:none] sm:-mx-6">
                {days.map((x, i) => {
                  const on = x === d;
                  const n = per(x);
                  return (
                    <button
                      key={x}
                      type="button"
                      aria-pressed={on}
                      onClick={() => (setDay(i), setSlot(null))}
                      className={`relative grid min-w-[104px] shrink-0 gap-0.5 border-r border-line px-4 py-3 text-left transition-colors last:border-r-0 hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)] ${
                        on ? "bg-[rgb(var(--accent-rgb)/0.15)] after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-[var(--accent)]" : ""
                      }`}
                    >
                      <span className={`text-[14px] font-semibold ${on ? "text-ink" : "text-ink-2"}`}>{dayLabel(noonOf(x))}</span>
                      <span className={`text-[13px] tabular-nums ${n <= 4 ? "text-amber-300" : "text-[var(--accent)]"}`}>
                        {n} {n === 1 ? "time" : "times"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <ul aria-label={`Times on ${dayLabel(noonOf(d))}`} className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {times.map((t) => {
                  const on = t === slot;
                  return (
                    <li key={t}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => setSlot(on ? null : t)}
                        className={`flex min-h-11 w-full items-center justify-center rounded-xl border text-[15px] font-medium tabular-nums transition-colors ${hy.focus} ${
                          on ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_78%,black)] text-white" : "border-line text-ink hover:border-[var(--accent)] hover:bg-[rgb(var(--accent-rgb)/0.15)]"
                        }`}
                      >
                        {timeLabel(t)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        {/* the visit options, like room types: what it is, the price, Select */}
        <section aria-labelledby="bk-what" className={`grid gap-3 ${hy.card}`}>
          <h2 id="bk-what" className={h2}>
            Choose your visit
          </h2>
          <ul className="grid gap-2.5">
            {options.map((o) => {
              const on = o.service === visit;
              return (
                <li key={o.service} className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 rounded-xl border p-4 transition-colors ${on ? "border-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.15)]" : "border-line"}`}>
                  {/* left: what it is */}
                  <div className="row-span-2 min-w-0 self-center">
                    <p className="text-[15.5px] font-semibold text-ink">{o.service}</p>
                    <p className="mt-0.5 text-[13.5px] leading-snug text-ink-3">{o.note}</p>
                  </div>
                  {/* top right: the choice */}
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={`${on ? "Selected" : "Select"}: ${o.service}`}
                    onClick={() => setVisit(o.service)}
                    className={`inline-flex min-h-10 min-w-[104px] items-center justify-center gap-1.5 justify-self-end rounded-lg border px-4 text-[14px] font-semibold transition-colors ${hy.focus} ${
                      on ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_78%,black)] text-white" : "border-[rgb(var(--accent-rgb)/0.6)] text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                    }`}
                  >
                    {on ? (
                      <>
                        <Check aria-hidden className="size-4" strokeWidth={2.5} /> Selected
                      </>
                    ) : (
                      "Select"
                    )}
                  </button>
                  {/* bottom right: the price */}
                  <p className="self-end text-right">
                    <span className="block whitespace-nowrap text-[16px] font-bold tabular-nums text-ink">{o.range}</span>
                    <span className="block text-[12.5px] text-ink-3">{o.service === "Consultation" ? "per visit" : "typical range"}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* the price summary, kept in view on wide screens */}
      <aside aria-labelledby="bk-sum" className={`grid gap-4 lg:sticky lg:top-[152px] ${hy.card}`}>
        <h2 id="bk-sum" className={h2}>
          Price summary
        </h2>
        <dl className="grid gap-2.5 text-[14.5px]">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-2">When</dt>
            <dd className="text-right font-medium text-ink">{slot ? `${dayLabel(slot)}, ${timeLabel(slot)}` : live ? "Pick a time" : "You choose next"}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-2">Consultation</dt>
            <dd className="tabular-nums text-ink">{p.fee ? feeRange(p.fee) : "Set by the clinic"}</dd>
          </div>
          {chosen.service !== "Consultation" && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-2">{chosen.service}</dt>
              <dd className="tabular-nums text-ink">{chosen.range}</dd>
            </div>
          )}
        </dl>
        <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-[var(--border)] pt-3">
          <span className="text-[15px] font-semibold text-ink">Pay today</span>
          <span className="text-[22px] font-bold tabular-nums text-ink">₹0</span>
        </div>
        <p className="-mt-2 text-[13px] text-ink-3">You pay at the clinic, after the dentist confirms the cost.</p>
        <Link href={href} className={`${hy.primary} w-full`}>
          <CalendarClock aria-hidden className="size-[18px]" strokeWidth={2} /> {slot ? "Book this time" : bookLabel}
        </Link>
        <ul aria-label="What's assured" className="grid gap-2 text-[13.5px] text-ink-2">
          <li className="flex items-center gap-2">
            <Check aria-hidden className="size-4 text-[var(--accent)]" strokeWidth={2.5} /> Free to change or cancel up to {POLICY.freeCancelHours} hours before
          </li>
          <li className="flex items-center gap-2">
            <Check aria-hidden className="size-4 text-[var(--accent)]" strokeWidth={2.5} /> No payment online, pay at the clinic
          </li>
          {p.verification.status === "verified" && (
            <li className="flex items-center gap-2">
              <Check aria-hidden className="size-4 text-[var(--accent)]" strokeWidth={2.5} /> Registration checked by FMD
            </li>
          )}
        </ul>
        <p className="flex gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5 text-[13px] text-ink-3">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          Fees are typical ranges (demo estimates), not quotes.
        </p>
      </aside>
    </div>
  );
}

/* ---------------- Clinic ---------------- */

function Clinic({ v }: { v: DentistView }) {
  const { p, c, avail } = v;
  return (
    <section aria-labelledby="clinic-h" className={`grid gap-4 ${hy.card}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="clinic-h" className={h2}>
          {c.name}
        </h2>
        <Tag tone={avail.mode === "live" ? "ok" : "muted"}>{avail.mode === "live" ? "Books online" : "Confirms times by request"}</Tag>
      </div>
      <dl className="grid gap-x-8 divide-y divide-[var(--border)] sm:grid-cols-2 sm:divide-y-0">
        <Row even icon={MapPin} label="Address">
          {c.address}, {c.city}
        </Row>
        <Row even icon={Clock3} label="Hours">
          {c.hours}
        </Row>
        <Row even icon={PhoneOff} label="Phone">
          <span className="text-ink-2">Demo clinic: no number</span>
        </Row>
        {c.facilities.length > 0 && (
          <Row even icon={Building2} label="Facilities">
            <Chips items={c.facilities} />
          </Row>
        )}
      </dl>
      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <Link href={`/book/${p.id}`} className={`${hy.primary} flex-1 sm:flex-none`}>
          <CalendarClock aria-hidden className="size-[18px]" strokeWidth={2} /> Book here
        </Link>
        <a href={c.mapUrl} target="_blank" rel="noreferrer" className={`${hy.secondary} flex-1 sm:flex-none`}>
          Open in Google Maps <ExternalLink aria-hidden className="size-4" strokeWidth={1.9} />
        </a>
        <Link href={`/clinics/${c.id}`} className={`${hy.secondary} flex-1 sm:flex-none`}>
          View clinic page
        </Link>
      </div>
    </section>
  );
}
