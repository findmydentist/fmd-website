"use client";

import { BadgeCheck, CalendarClock, Clock3, ExternalLink, MapPin, Sparkles, Stethoscope, X } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Tag } from "@/components/app/kit";
import { istDate } from "@/lib/format";
import { getClinicPage, type ClinicPage, type ProviderCard } from "@/sample/providers";
import { coverOf } from "../explore/Explore";
import { Back, NotFound } from "./common";
import { chip, chipOff, chipOn, DentistCard, TREATMENT_ART, TREATMENT_ICON } from "./Search";

/* ---------------- /clinics/[id] ---------------- */

/** the quick filters, as on Find a dentist: one tap each, for this clinic's dentists */
const QUICK: [key: string, label: string, keep: (d: ProviderCard) => boolean][] = [
  ["today", "Available today", (d) => !!d.nextAvailable && istDate(d.nextAvailable) === istDate(Date.now())],
  ["verified", "Verified", (d) => d.verification.status === "verified"],
  ["woman", "Woman dentist", (d) => d.gender === "female"],
  ["fee", "Up to ₹500", (d) => !!d.fee && d.fee.min <= 500],
];

/**
 * A clinic, laid out like Find a dentist: the clinic's details at the top, its treatments down the side (pick one to
 * see who offers it), quick filters, and its dentists as the same cards in the same grid.
 */
export function ClinicView() {
  const { id } = useParams<{ id: string }>();
  const [c, setC] = useState<ClinicPage | null | undefined>(undefined);
  const [service, setService] = useState<string | null>(null);
  const [quick, setQuick] = useState<string[]>([]);
  useEffect(() => {
    getClinicPage(id).then(setC);
  }, [id]);
  if (c === undefined) return <div className="app-panel h-64 animate-pulse" aria-busy />;
  if (c === null) return <NotFound what="clinic" />;

  const shown = c.dentists.filter((d) => (!service || d.services.includes(service)) && QUICK.every(([k, , keep]) => !quick.includes(k) || keep(d)));
  const toggle = (k: string) => setQuick((q) => (q.includes(k) ? q.filter((x) => x !== k) : [...q, k]));
  const reset = () => (setService(null), setQuick([]));
  const filtered = !!service || quick.length > 0;

  return (
    <div className="mx-auto grid w-full max-w-[1240px] grid-cols-[minmax(0,1fr)] gap-6">
      <Back />

      {/* the clinic, as the page's heading */}
      <header className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[26px] font-semibold text-ink sm:text-[30px]">{c.name}</h1>
          <Tag tone="muted">Demo</Tag>
          <span className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${c.live ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.06] text-ink-2"}`}>
            <CalendarClock aria-hidden className="size-4" strokeWidth={1.9} />
            {c.live ? "Books online" : "Confirms times by request"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[14.5px] text-ink-2">
          <span className="inline-flex items-start gap-2">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-3" strokeWidth={1.75} />
            {c.address}, {c.city}
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock3 aria-hidden className="size-4 shrink-0 text-ink-3" strokeWidth={1.75} />
            {c.hours}
          </span>
          <a href={c.mapUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg font-medium text-[var(--accent)] hover:underline">
            Open in Google Maps <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.9} />
          </a>
        </div>
        {c.facilities.length > 0 && (
          <ul aria-label="Facilities" className="flex flex-wrap gap-2">
            {c.facilities.map((x) => (
              <li key={x} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-[var(--surface-elevated)] px-3 text-[13.5px] text-ink-2">
                <BadgeCheck aria-hidden className="size-4 text-ink-3" strokeWidth={1.75} /> {x}
              </li>
            ))}
          </ul>
        )}
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8">
        {/* its treatments: a row of circles on smaller screens, a sidebar on desktop (as on Find a dentist) */}
        <aside aria-label="Treatments at this clinic" className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:sticky lg:top-[92px]">
          <h2 className="text-[20px] font-semibold text-ink lg:text-[18px]">Treatments here</h2>
          <ul className="-mx-3 flex gap-3 overflow-x-auto px-3 py-2 [scrollbar-width:none] sm:mx-0 sm:gap-6 sm:px-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:py-0">
            {[null, ...c.services].map((t) => {
              const on = service === t;
              const art = t && TREATMENT_ART[t];
              const Icon = t ? (TREATMENT_ICON[t] ?? Sparkles) : Stethoscope;
              return (
                <li key={t ?? "all"} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setService(t && !on ? t : null)}
                    className={`group grid w-[84px] justify-items-center gap-2 text-center sm:w-28 lg:flex lg:w-full lg:items-center lg:gap-3 lg:rounded-xl lg:px-2 lg:py-1.5 lg:text-left ${on ? "lg:bg-[rgb(var(--accent-rgb)/0.15)]" : "lg:hover:bg-[var(--surface-glass)]"}`}
                  >
                    <span
                      className={`relative grid size-[72px] shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br ${coverOf(t ?? "All")} to-[var(--surface-elevated)] ring-offset-[3px] ring-offset-[var(--background)] sm:size-24 lg:size-11 lg:ring-offset-2 ${on ? "ring-2 ring-[var(--accent)]" : ""}`}
                    >
                      {art ? (
                        <Image src={art} alt="" fill sizes="(min-width: 1024px) 44px, 96px" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <Icon aria-hidden className="size-8 text-ink sm:size-10 lg:size-5" strokeWidth={1.5} />
                      )}
                    </span>
                    <span className={`text-[12.5px] leading-tight sm:text-[14.5px] lg:text-[14.5px] ${on ? "font-semibold text-[var(--accent)]" : "font-medium text-ink-2 group-hover:text-ink"}`}>
                      {t ?? "All treatments"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
          {/* quick filters, kept in reach */}
          <div className="sticky top-[84px] z-20 -mx-3 bg-[color-mix(in_srgb,var(--background)_85%,transparent)] px-3 py-2 backdrop-blur sm:-mx-5 sm:px-5 lg:mx-0 lg:px-0">
            <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
              {QUICK.map(([k, label]) => {
                const on = quick.includes(k);
                return (
                  <button key={k} type="button" aria-pressed={on} onClick={() => toggle(k)} className={`${chip} ${on ? chipOn : chipOff}`}>
                    {label}
                    {on && <X aria-hidden className="size-3.5" strokeWidth={2} />}
                  </button>
                );
              })}
              {filtered && (
                <button type="button" onClick={reset} className="inline-flex h-9 shrink-0 items-center px-2 text-[13.5px] font-medium text-[var(--accent)] hover:underline">
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[24px] font-semibold text-ink sm:text-[28px]">{service ? `${service} at ${c.name}` : `Dentists at ${c.name}`}</h2>
            <p aria-live="polite" className="text-[14px] text-ink-3">
              {shown.length} {shown.length === 1 ? "dentist" : "dentists"}
            </p>
          </div>

          {shown.length ? (
            <section aria-label="Dentists" className="grid gap-x-4 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((d) => (
                <DentistCard key={d.id} p={d} />
              ))}
            </section>
          ) : (
            <div className="grid justify-items-start gap-3 rounded-2xl border border-line bg-[var(--surface)] p-6">
              <p className="text-[17px] font-semibold text-ink">No dentists here match those filters</p>
              <p className="text-[14.5px] text-ink-3">Try fewer filters, or see every dentist at this clinic.</p>
              <button type="button" onClick={reset} className={`${chip} ${chipOn}`}>
                Show all dentists
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
