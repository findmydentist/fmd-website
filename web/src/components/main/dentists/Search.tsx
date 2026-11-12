"use client";

import { Baby, BadgeCheck, CalendarCheck, CalendarClock, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, Grid2x2, HeartPulse, Languages, LoaderCircle, LocateFixed, MapPin, Search as SearchIcon, ShieldQuestion, SlidersHorizontal, Smile, Sparkles, Stethoscope, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, ButtonLink, Panel } from "@/components/app/kit";
import { Field, fieldCls, Sheet } from "@/components/app/Sheet";
import { Notice } from "@/components/Page";
import { SponsoredBadge } from "@/components/ui";
import { LANGUAGES, SERVICES, SPECIALTIES } from "@/lib/catalog";
import { feeRange, when } from "@/lib/format";
import { noteSearch } from "@/sample/content";
import { useMe } from "@/lib/me";
import { PLACES, searchProviders, type Filters, type ProviderCard, type SearchResult } from "@/sample/providers";
import { track } from "@/lib/analytics";
import { coverOf } from "../explore/Explore";


/* ---------------- URL ⇄ filters (every filter lives in the URL, so results can be shared and Back works) ---------------- */

const num = (v: string | null) => (v && Number.isFinite(Number(v)) ? Number(v) : undefined);
function parse(p: URLSearchParams): Filters {
  const pick = <T extends string>(v: string | null, ok: readonly T[]) => (v && (ok as readonly string[]).includes(v) ? (v as T) : undefined);
  return {
    q: p.get("q") ?? undefined,
    loc: p.get("loc") ?? undefined,
    lat: num(p.get("lat")),
    lng: num(p.get("lng")),
    within: num(p.get("within")),
    specialty: p.get("specialty") ?? undefined,
    service: p.get("service") ?? undefined,
    language: p.get("language") ?? undefined,
    available: pick(p.get("available"), ["today", "week"]),
    fee_max: num(p.get("fee")),
    gender: pick(p.get("gender"), ["female", "male"]),
    sort: pick(p.get("sort"), ["relevance", "distance", "soonest"]),
  };
}

type Opt = [value: string, label: string];
const any = (label = "Any"): Opt => ["", label];
const FILTERS: { key: string; label: string; options: Opt[]; needsLocation?: boolean }[] = [
  { key: "specialty", label: "Specialty", options: [any(), ...SPECIALTIES.map((s): Opt => [s, s])] },
  { key: "service", label: "Treatment", options: [any(), ...SERVICES.map((s): Opt => [s, s])] },
  { key: "available", label: "Available", options: [any("Any time"), ["today", "Today"], ["week", "This week"]] },
  { key: "language", label: "Language", options: [any(), ...LANGUAGES.map((s): Opt => [s, s])] },
  { key: "fee", label: "Consultation fee", options: [any(), ["500", "Up to ₹500"], ["750", "Up to ₹750"], ["1000", "Up to ₹1,000"]] },
  { key: "gender", label: "Dentist", options: [any("Any dentist"), ["female", "Woman"], ["male", "Man"]] },
  { key: "within", label: "Distance", options: [any(), ["5", "Within 5 km"], ["10", "Within 10 km"], ["25", "Within 25 km"]], needsLocation: true },
  { key: "sort", label: "Sort by", options: [["", "Recommended"], ["distance", "Nearest"], ["soonest", "Earliest available"]] },
];

/* ---------------- layout pieces (a food-delivery-style directory: search bar, tabs, circles, chips, photo cards) ---------------- */

/** The tabs under the search bar: when you want to be seen (the `available` filter) */
const WHEN_TABS: [value: string, label: string, Icon: typeof Stethoscope][] = [
  ["", "All dentists", Stethoscope],
  ["today", "Available today", CalendarCheck],
  ["week", "This week", CalendarDays],
];

/** Treatment circles: a photo where the demo has one, otherwise a soft gradient with an icon */
const TREATMENT_ART: Partial<Record<string, string>> = {
  "Clear Aligners": "/img/tx-aligners.png",
  "Teeth Cleaning": "/img/tx-cleaning.png",
  "Dental Implants": "/img/tx-implants.png",
  "Teeth Whitening": "/img/tx-whitening.png",
};
const TREATMENT_ICON: Partial<Record<string, typeof Stethoscope>> = {
  Consultation: Stethoscope,
  "Kids Dentistry": Baby,
  "Smile Design": Smile,
  Veneers: Sparkles,
  "Gum Treatment": HeartPulse,
  Braces: Grid2x2,
};
const TREATMENTS = SERVICES.filter((s) => s !== "Consultation");

/** One-tap filters, shown as chips before the drop-down ones */
const QUICK: [key: string, value: string, label: string][] = [
  ["available", "today", "Available today"],
  ["gender", "female", "Woman dentist"],
  ["fee", "500", "Up to ₹500"],
];

const chip = "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[13.5px] shadow-sm";
const chipOff = "border-line bg-[var(--surface-elevated)] text-ink-2 hover:text-ink";
const chipOn = "border-sky-500/60 bg-sky-500/15 text-ink";

/** /dentists */
export function DentistSearch() {
  const params = useSearchParams();
  const router = useRouter();
  const me = useMe();
  const key = params.toString();
  const f = parse(params);
  const hasLocation = f.lat !== undefined && f.lng !== undefined;

  // the search boxes follow the URL (Back, shared links) and are applied on submit
  const [q, setQ] = useState(f.q ?? "");
  const [loc, setLoc] = useState(f.loc ?? "");
  const [seenKey, setSeenKey] = useState(key);
  if (key !== seenKey) {
    setSeenKey(key);
    setQ(f.q ?? "");
    setLoc(f.loc ?? "");
  }

  const [res, setRes] = useState<{ key: string; r: SearchResult; items: ProviderCard[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [locOpen, setLocOpen] = useState(false);
  const circles = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let live = true;
    const q = new URLSearchParams(key);
    searchProviders({ ...parse(q), page: 1 }).then(
      (r) => {
        if (!live) return;
        setRes({ key, r, items: r.items });
        setErr(null);
        // counts only: never the search words or the concern
        track("dentist_search", { filters: [...q.keys()].filter((k) => k !== "lat" && k !== "lng").length, near_me: q.has("lat"), results: r.total });
      },
      () => live && setErr("Search isn't working right now. Please try again."),
    );
    return () => {
      live = false;
    };
  }, [key]);

  const set = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.replace(p.size ? `/dentists?${p}` : "/dentists", { scroll: false });
  };
  /** typing or picking a place replaces "near me" */
  const placePatch = (where: string): Record<string, string | null> => (where ? { lat: null, lng: null, within: null, sort: f.sort === "distance" ? null : (f.sort ?? null) } : {});
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const where = loc.trim();
    noteSearch(me?.id ?? null, q);
    setLocOpen(false);
    set({ q: q.trim() || null, loc: where || null, ...placePatch(where) });
  };
  const pickPlace = (where: string) => {
    setLoc(where);
    setLocOpen(false);
    set({ loc: where, ...placePatch(where) });
  };
  const locate = () => {
    setGeoErr(null);
    setLocOpen(false);
    if (!navigator.geolocation) return setGeoErr("This browser can't share your location. Type your city or area instead.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        // ~100 m is plenty for "near me" and keeps the URL from carrying an exact position
        set({ lat: pos.coords.latitude.toFixed(3), lng: pos.coords.longitude.toFixed(3), loc: null, sort: "distance" });
      },
      () => {
        setLocating(false);
        setGeoErr("Couldn't get your location. Type your city or area instead.");
      },
      { timeout: 10_000, maximumAge: 600_000 },
    );
  };
  const stopLocation = () => set({ lat: null, lng: null, within: null, sort: null });
  const more = async () => {
    if (!res) return;
    const r = await searchProviders({ ...f, page: res.r.page + 1 });
    setRes({ ...res, r: { ...r, sponsored: res.r.sponsored }, items: [...res.items, ...r.items] });
  };

  const loading = !res || res.key !== key;
  const active = FILTERS.filter((x) => params.get(x.key) && x.key !== "sort");
  const where = f.loc ? ` in ${f.loc}` : hasLocation ? " near you" : "";
  const places = PLACES.filter((p) => p.toLowerCase().includes(loc.trim().toLowerCase())).slice(0, 8);
  const tabLabel = WHEN_TABS.find(([v]) => v === (f.available ?? ""))?.[1] ?? "All dentists";

  const fields = (
    <div className="grid gap-3 sm:grid-cols-2">
      {FILTERS.map((x) => {
        const off = x.needsLocation && !hasLocation;
        return (
          <Field key={x.key} label={x.label} hint={off ? "Use your location first" : undefined}>
            <select className={fieldCls} value={params.get(x.key) ?? ""} disabled={off} onChange={(e) => set({ [x.key]: e.target.value || null })}>
              {x.options.map(([v, l]) => (
                <option key={v} value={v} disabled={v === "distance" && !hasLocation}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto grid w-full max-w-[1240px] grid-cols-[minmax(0,1fr)] gap-6">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <div>
          <h1 className="text-[26px] font-semibold text-ink sm:text-[30px]">Find a dentist</h1>
          <p className="mt-1 text-[14.5px] text-ink-3">Search by problem, treatment, dentist or clinic. Suggestions are based on what you search for; they are not a diagnosis.</p>
        </div>

        {/* one bar: where | what */}
        <form
          onSubmit={submit}
          role="search"
          className="relative flex flex-col rounded-2xl border border-line bg-[var(--surface-elevated)] shadow-[0_6px_28px_rgba(0,0,0,0.35)] sm:h-14 sm:flex-row sm:items-center"
        >
          <div
            className="relative flex h-14 items-center gap-2 border-b border-line px-4 sm:h-full sm:w-[36%] sm:border-b-0 sm:border-r"
            onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setLocOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setLocOpen(false)}
          >
            <MapPin className="size-5 shrink-0 text-sky-400" strokeWidth={1.75} />
            <label className="min-w-0 flex-1">
              <span className="sr-only">City or area</span>
              <input
                className="h-12 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
                value={loc}
                onChange={(e) => (setLoc(e.target.value), setLocOpen(true))}
                onFocus={() => setLocOpen(true)}
                placeholder={hasLocation ? "Near your location" : "City or area"}
                autoComplete="address-level2"
                maxLength={60}
                role="combobox"
                aria-expanded={locOpen}
                aria-controls="fmd-places"
                aria-autocomplete="list"
              />
            </label>
            <button type="button" onClick={() => setLocOpen((o) => !o)} aria-label="Show places" className="text-ink-3 hover:text-ink">
              <ChevronDown className={`size-5 transition-transform ${locOpen ? "rotate-180" : ""}`} strokeWidth={1.75} />
            </button>
            {locOpen && (
              <ul id="fmd-places" className="fmd-enter absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-xl border border-line bg-[var(--surface-elevated)] py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
                <li>
                  <button type="button" onClick={locate} disabled={locating} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[var(--surface-glass)]">
                    {locating ? <LoaderCircle className="mt-0.5 size-5 animate-spin text-sky-400" strokeWidth={1.75} /> : <LocateFixed className="mt-0.5 size-5 text-sky-400" strokeWidth={1.75} />}
                    <span>
                      <span className="block text-[14.5px] font-medium text-sky-400">Use my location</span>
                      <span className="block text-[12.5px] text-ink-3">Using your device&apos;s GPS</span>
                    </span>
                  </button>
                </li>
                {places.map((p) => (
                  <li key={p} className="border-t border-line">
                    <button type="button" onClick={() => pickPlace(p)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14.5px] text-ink hover:bg-[var(--surface-glass)]">
                      <MapPin className="size-4 text-ink-3" strokeWidth={1.75} /> {p}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <label className="flex h-14 min-w-0 flex-1 items-center gap-3 px-4 sm:h-full">
            <span className="sr-only">Problem, treatment, dentist or clinic</span>
            <SearchIcon className="size-5 shrink-0 text-ink-3" strokeWidth={1.75} />
            <input className="h-12 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. bleeding gums, braces, Dr. Iyer" maxLength={80} />
          </label>
          <div className="px-2 pb-2 sm:pb-0">
            <Button type="submit" className="w-full sm:w-auto">
              Search
            </Button>
          </div>
        </form>
        {geoErr && <Notice kind="error">{geoErr}</Notice>}
        {hasLocation && (
          <p className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
            <LocateFixed className="size-3.5" strokeWidth={1.75} /> Showing dentists near your location.
            <button type="button" onClick={stopLocation} className="font-medium text-ink underline underline-offset-4">
              Stop using it
            </button>
          </p>
        )}
      </div>

      {/* tabs */}
      <div role="tablist" aria-label="When" className="flex gap-6 overflow-x-auto border-b border-line [scrollbar-width:none] sm:gap-10">
        {WHEN_TABS.map(([v, label, Icon]) => {
          const on = (f.available ?? "") === v;
          return (
            <button key={label} role="tab" aria-selected={on} onClick={() => set({ available: v || null })} className={`-mb-px flex shrink-0 items-center gap-3 border-b-2 pb-3 pt-1 ${on ? "border-sky-400" : "border-transparent"}`}>
              <span className={`grid size-12 place-items-center rounded-full transition-colors sm:size-14 ${on ? "bg-sky-500/20 text-sky-400" : "bg-[var(--surface-glass)] text-ink-3"}`}>
                <Icon className="size-6" strokeWidth={1.5} />
              </span>
              <span className={`text-[16px] sm:text-[18px] ${on ? "font-semibold text-sky-400" : "text-ink-3"}`}>{label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8 min-[115rem]:grid-cols-[minmax(0,1fr)]">
        {/* treatments: a row of big circles on smaller screens, a sidebar on desktop, and on very wide screens a sidebar in the empty left margin */}
        <aside aria-label="Find by treatment" className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:sticky lg:top-[92px] lg:max-h-[calc(100dvh-110px)] lg:gap-3 lg:overflow-y-auto lg:pr-1 lg:[scrollbar-width:none] min-[115rem]:fixed min-[115rem]:left-5 min-[115rem]:w-[250px]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[22px] font-semibold text-ink sm:text-[26px] lg:text-[18px]">Find by treatment</h2>
            <div className="hidden gap-2 sm:flex lg:hidden">
              {([-1, 1] as const).map((d) => (
                <button key={d} type="button" aria-label={d < 0 ? "Scroll left" : "Scroll right"} onClick={() => circles.current?.scrollBy({ left: d * 480, behavior: "smooth" })} className="grid size-9 place-items-center rounded-full border border-line bg-[var(--surface-elevated)] text-ink hover:bg-[var(--surface-glass)]">
                  {d < 0 ? <ChevronLeft className="size-5" strokeWidth={1.75} /> : <ChevronRight className="size-5" strokeWidth={1.75} />}
                </button>
              ))}
            </div>
          </div>
          <ul ref={circles} className="-mx-3 flex snap-x scroll-px-4 gap-3 overflow-x-auto scroll-smooth px-4 py-2 [scrollbar-width:none] sm:mx-0 sm:gap-8 sm:px-2 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:py-0">
            {[null, ...TREATMENTS].map((t) => {
              const on = (f.service ?? null) === t;
              const art = t && TREATMENT_ART[t];
              const Icon = t ? (TREATMENT_ICON[t] ?? Sparkles) : Stethoscope;
              return (
                <li key={t ?? "all"} className="shrink-0 snap-start">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => set({ service: t && !on ? t : null })}
                    className={`group grid w-[84px] justify-items-center gap-2 text-center sm:w-36 sm:gap-2.5 lg:flex lg:w-full lg:items-center lg:gap-3 lg:rounded-xl lg:px-2 lg:py-1.5 lg:text-left ${on ? "lg:bg-sky-500/15" : "lg:hover:bg-[var(--surface-glass)]"}`}
                  >
                    <span
                      className={`relative grid size-[76px] shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br ${coverOf(t ?? "All")} to-[var(--surface-elevated)] ring-offset-[3px] ring-offset-[var(--background)] transition-shadow sm:ring-offset-4 sm:size-36 lg:size-11 lg:ring-offset-2 ${on ? "ring-2 ring-sky-400" : ""}`}
                    >
                      {art ? (
                        <Image src={art} alt="" fill sizes="(min-width: 1024px) 44px, 144px" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <Icon className="size-8 text-ink transition-transform duration-500 group-hover:scale-110 sm:size-12 lg:size-5" strokeWidth={1.5} />
                      )}
                    </span>
                    <span className={`text-[12.5px] leading-tight sm:text-[16px] sm:leading-normal lg:text-[14.5px] ${on ? "font-semibold text-sky-400" : "font-medium text-ink-2 group-hover:text-ink"}`}>{t ?? "All treatments"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
          {/* chips: every filter, one tap away */}
          <div className="sticky top-[84px] z-20 -mx-3 bg-[color-mix(in_srgb,var(--background)_85%,transparent)] px-3 py-2 backdrop-blur sm:-mx-5 sm:px-5 lg:mx-0 lg:px-0">
            <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
              <button type="button" onClick={() => setSheet(true)} className={`${chip} ${active.length ? chipOn : chipOff}`}>
                <SlidersHorizontal className="size-4" strokeWidth={1.75} /> Filters
                {active.length > 0 && <span className="grid size-5 place-items-center rounded-full bg-sky-500 text-[11px] font-semibold text-white">{active.length}</span>}
              </button>
              <button type="button" onClick={hasLocation ? stopLocation : locate} disabled={locating} aria-pressed={hasLocation} className={`${chip} ${hasLocation ? chipOn : chipOff}`}>
                {locating ? <LoaderCircle className="size-4 animate-spin" strokeWidth={1.75} /> : <LocateFixed className="size-4" strokeWidth={1.75} />} Near me
                {hasLocation && <X className="size-3.5" strokeWidth={2} />}
              </button>
              {QUICK.map(([k, v, label]) => {
                const on = params.get(k) === v;
                return (
                  <button key={k + v} type="button" aria-pressed={on} onClick={() => set({ [k]: on ? null : v })} className={`${chip} ${on ? chipOn : chipOff}`}>
                    {label}
                    {on && <X className="size-3.5" strokeWidth={2} />}
                  </button>
                );
              })}
              {FILTERS.map((x) => {
                const v = params.get(x.key) ?? "";
                if (QUICK.some(([k, qv]) => k === x.key && qv === v && v)) return null; // already shown as a quick chip
                const off = x.needsLocation && !hasLocation;
                const shown = x.options.find(([o]) => o === v)?.[1];
                return (
                  <span key={x.key} className={`${chip} relative ${v ? chipOn : chipOff} ${off ? "opacity-50" : ""}`}>
                    {v && x.key !== "sort" ? shown : x.key === "sort" ? `Sort: ${shown ?? "Recommended"}` : x.label}
                    <ChevronDown className="size-3.5" strokeWidth={2} />
                    {/* the real control: a native select over the chip, so it works with keyboards and screen readers */}
                    <select aria-label={x.label} value={v} disabled={off} onChange={(e) => set({ [x.key]: e.target.value || null })} className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed [&>option]:bg-[var(--surface)]">
                      {x.options.map(([o, l]) => (
                        <option key={o} value={o} disabled={o === "distance" && !hasLocation}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </span>
                );
              })}
              {(active.length > 0 || f.q || f.loc || hasLocation) && (
                <button type="button" onClick={() => router.replace("/dentists", { scroll: false })} className="shrink-0 px-2 text-[13.5px] font-medium text-sky-400 hover:text-sky-300">
                  Clear all
                </button>
              )}
            </div>
            {active.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {active.map((x) => (
                  <button key={x.key} type="button" onClick={() => set({ [x.key]: null })} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-sky-500/50 bg-sky-500/10 px-3 text-[12.5px] text-ink">
                    {x.options.find(([v]) => v === params.get(x.key))?.[1] ?? params.get(x.key)}
                    <X className="size-3.5" strokeWidth={2} />
                    <span className="sr-only">Remove filter</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[22px] font-semibold text-ink sm:text-[26px]">
              {tabLabel === "All dentists" ? "Dentists" : `Dentists ${tabLabel.toLowerCase()}`}
              {where}
            </h2>
            <p aria-live="polite" className="text-[13.5px] text-ink-3">
              {res && !loading ? `${res.r.total} ${res.r.total === 1 ? "dentist" : "dentists"}${where}` : "Searching…"}
            </p>
          </div>

          {err && <Notice kind="error">{err}</Notice>}

          {loading && !err ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" aria-busy>
              {[0, 1, 2].map((i) => (
                <div key={i} className="grid gap-3 p-3">
                  <div className="aspect-[4/3] animate-pulse rounded-2xl bg-[var(--surface-glass)]" />
                  <div className="h-5 w-2/3 animate-pulse rounded bg-[var(--surface-glass)]" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--surface-glass)]" />
                </div>
              ))}
            </div>
          ) : res && res.r.total === 0 ? (
            <Panel className="grid justify-items-start gap-3 p-6">
              <h2 className="text-[17px] font-medium text-ink">No dentists match{where} yet</h2>
              <ul className="list-disc space-y-1 pl-5 text-[14px] text-ink-2">
                {res.r.suggestions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="secondary" onClick={() => router.replace("/dentists", { scroll: false })}>
                  Clear filters
                </Button>
                <ButtonLink href="/concierge" variant="secondary">
                  Ask FMD Edge to help
                </ButtonLink>
              </div>
            </Panel>
          ) : (
            res && (
              <div key={key} className="fmd-enter grid grid-cols-[minmax(0,1fr)] gap-6">
                {res.r.sponsored.length > 0 && (
                  <section aria-label="Sponsored" className="grid grid-cols-[minmax(0,1fr)] gap-2">
                    <p className="text-[12px] uppercase tracking-[0.14em] text-ink-3">Sponsored</p>
                    <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
                      {res.r.sponsored.map((p) => (
                        <DentistCard key={p.id} p={p} />
                      ))}
                    </div>
                  </section>
                )}
                <section aria-label="Results" className="grid gap-x-4 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
                  {res.items.map((p) => (
                    <DentistCard key={p.id} p={p} />
                  ))}
                </section>
                <div className="flex flex-wrap items-center justify-center gap-3 text-[13.5px] text-ink-3">
                  <span>
                    Showing {res.items.length} of {res.r.total}
                  </span>
                  {res.items.length < res.r.total && (
                    <Button variant="secondary" size="sm" onClick={more}>
                      Show more
                    </Button>
                  )}
                </div>
              </div>
            )
          )}

          <p className="text-[12.5px] text-ink-3">
            Sponsored results are paid placements and are always labelled. Other results are ordered by how well they match your search and whether FMD has verified the
            dentist. All profiles here are demo profiles, not real practitioners.
          </p>
        </div>
      </div>

      {sheet && (
        <Sheet title="Filters" onClose={() => setSheet(false)}>
          <div className="grid gap-4">
            {fields}
            <Button onClick={() => setSheet(false)}>{res && !loading ? `Show ${res.r.total} ${res.r.total === 1 ? "dentist" : "dentists"}` : "Show results"}</Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/** Verification as the card's rating-style badge: solid green when FMD has checked the dentist. */
function VerifiedBadge({ v }: { v: ProviderCard["verification"] }) {
  if (v.status === "verified")
    return (
      <span title={v.checks || "Checked by FMD"} className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[12.5px] font-semibold text-white">
        Verified <BadgeCheck className="size-3.5" strokeWidth={2.25} />
      </span>
    );
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[var(--surface-glass)] px-1.5 py-0.5 text-[12px] text-ink-3 ring-1 ring-line">
      {v.status === "pending" ? <Clock3 className="size-3.5" strokeWidth={1.75} /> : <ShieldQuestion className="size-3.5" strokeWidth={1.75} />}
      {v.status === "pending" ? "Verification pending" : "Not verified"}
    </span>
  );
}

export function DentistCard({ p }: { p: ProviderCard }) {
  const extra = p.services.filter((s) => s !== "Consultation");
  return (
    <section className="group relative grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2.5 rounded-3xl p-3 transition-[background-color,box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:bg-[var(--surface-elevated)] hover:shadow-[0_10px_36px_rgba(0,0,0,0.45)]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--surface-elevated)]">
        {p.photo ? (
          <Image src={p.photo} alt={`${p.name}${p.demo ? " (demo profile)" : ""}`} fill sizes="(min-width: 1280px) 340px, (min-width: 640px) 45vw, 92vw" className="object-cover object-[center_22%] transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <span className={`grid size-full place-items-center bg-gradient-to-br ${coverOf(p.specialty)} to-transparent text-[48px] font-light text-ink-2`}>{p.name.replace(/^Dr\.?\s*/, "").split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
        )}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {p.sponsored && (
            <span className="rounded-full bg-black/60 backdrop-blur">
              <SponsoredBadge />
            </span>
          )}
          <span className="rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">Demo</span>
        </div>
        {/* the offer-style banner: when they can see you */}
        <span className="absolute bottom-3 left-0 flex items-center gap-1.5 rounded-r-md bg-sky-600 py-1 pl-2.5 pr-3 text-[12.5px] font-semibold text-white">
          {p.nextAvailable ? (
            <>
              <CalendarClock className="size-3.5" strokeWidth={2} /> Next: {when(p.nextAvailable)}
            </>
          ) : (
            <>
              <Clock3 className="size-3.5" strokeWidth={2} /> Clinic will confirm a time
            </>
          )}
        </span>
        {(p.distanceKm !== null || p.experienceYears) && (
          <span className="absolute bottom-3 right-3 rounded-md bg-white px-2 py-0.5 text-[12px] font-semibold text-black">
            {p.distanceKm !== null ? `${p.distanceKm} km` : `${p.experienceYears} yrs`}
          </span>
        )}
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1 px-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-[17px] font-semibold text-ink">
            {/* the whole card opens the profile */}
            <Link href={`/dentists/${p.id}`} aria-label={`View profile: ${p.name}`} className="after:absolute after:inset-0 after:rounded-3xl after:content-['']">
              {p.name}
            </Link>
          </h2>
          <VerifiedBadge v={p.verification} />
        </div>
        <div className="flex items-center justify-between gap-3 text-[14px] text-ink-3">
          <span className="min-w-0 truncate">
            {p.specialty}
            {p.experienceYears ? ` · ${p.experienceYears} yrs experience` : ""}
          </span>
          <span className="shrink-0 text-ink-2">{p.fee ? `${feeRange(p.fee)} consultation` : "Fee confirmed by the clinic"}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[13.5px] text-ink-3">
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="size-3.5 shrink-0" strokeWidth={1.75} />
            <span className="truncate">
              {p.clinic.name} · {p.clinic.area}, {p.clinic.city}
            </span>
          </span>
          {p.distanceKm !== null && <span className="shrink-0">{p.distanceKm} km away</span>}
        </div>
        <p className="flex items-center gap-1 text-[13px] text-ink-3">
          <Languages className="size-3.5 shrink-0" strokeWidth={1.75} />
          <span className="truncate">{p.languages.join(", ")}</span>
        </p>
        <div className="flex items-center justify-between gap-3 border-t border-dashed border-line pt-2 text-[13px]">
          <span className="min-w-0 truncate text-ink-3">
            {extra.slice(0, 3).join(" · ")}
            {extra.length > 3 && ` · +${extra.length - 3} more`}
          </span>
          <span aria-hidden className="shrink-0 font-medium text-sky-400 group-hover:underline">
            View profile ›
          </span>
        </div>
      </div>
    </section>
  );
}
