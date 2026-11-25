"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CITIES } from "@/lib/catalog";
import { useViewer } from "@/lib/useViewer";
import { canManageApplicants, canPostJobs } from "@/lib/viewer";
import { MEDIA } from "@/sample/media";
import { DENTIST_ROLES, EXPERIENCE, FEATURED_EMPLOYERS, searchJobs, spaceCounts, SPACES, TEAM_ROLES, TYPES, type Job, type Space } from "@/sample/jobs";
import { openCaseCount } from "@/sample/consults";
import { EmployerLogo, JobCard } from "./JobCard";

function JobsTopLinks() {
  const viewer = useViewer();
  return (
    <div className="flex flex-wrap gap-2">
      {viewer && (
        <Link href="/jobs/applications" className="h-10 rounded-full bg-[var(--surface)] px-4 text-[13.5px] font-semibold leading-10 text-ink shadow-[var(--shadow-card)]">
          My applications
        </Link>
      )}
      {viewer && (
        <Link href="/account/career" className="h-10 rounded-full bg-[var(--surface)] px-4 text-[13.5px] font-semibold leading-10 text-ink shadow-[var(--shadow-card)]">
          Career profile
        </Link>
      )}
      {canManageApplicants(viewer ?? null) && (
        <Link href="/jobs/mine" className="h-10 rounded-full bg-[var(--surface)] px-4 text-[13.5px] font-semibold leading-10 text-ink shadow-[var(--shadow-card)]">
          Your listings
        </Link>
      )}
      {canPostJobs(viewer ?? null) && (
        <Link href="/jobs/new" className="h-10 rounded-full bg-[var(--button-primary)] px-4 text-[13.5px] font-semibold leading-10 text-[var(--button-primary-fg)]">
          Post a job
        </Link>
      )}
    </div>
  );
}

/** /jobs: two doors, one for dentists, one for the clinic team. */
export function JobsLanding() {
  const [counts, setCounts] = useState<Record<Space, number> | null>(null);
  const [consults, setConsults] = useState<number | null>(null);
  useEffect(() => {
    spaceCounts().then(setCounts);
    openCaseCount().then(setConsults);
  }, []);
  const hero = (k: string) => MEDIA[k]!.src;
  return (
    <div className="grid gap-[var(--space-section)] pb-10">
      <header className="grid gap-5 pt-4 sm:pt-8">
        <p className="text-[12.5px] font-bold uppercase tracking-[0.22em] text-[var(--accent)]">FMD Jobs</p>
        <h1 className="type-display max-w-[760px]">Careers in dentistry, from India&apos;s most trusted clinics.</h1>
        <p className="max-w-[560px] text-[17px] leading-relaxed text-ink-2">Apply with one profile. Talk to the clinic before you decide. Every listing is free to apply to, always.</p>
        <JobsTopLinks />
      </header>

      <section className="grid gap-5 lg:grid-cols-3" aria-label="Choose a space">
        <Link href="/jobs/dentists" className="group relative isolate grid min-h-[420px] content-end overflow-hidden rounded-[32px] p-8 text-white sm:p-10">
          <Image src={hero("implant-surgery")} alt="" fill sizes="(min-width: 1024px) 620px, 100vw" className="-z-10 object-cover transition-transform duration-700 group-hover:scale-[1.04]" priority />
          <span aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(8_10_18/0.15),rgb(8_10_18/0.88))]" />
          <span className="text-[12.5px] font-bold uppercase tracking-[0.22em] text-white/75">For verified dentists</span>
          <span className="mt-3 text-[clamp(30px,3.6vw,44px)] font-bold leading-[1.05] tracking-[-0.03em]">{SPACES.dentist.title}</span>
          <span className="mt-3 max-w-[420px] text-[15.5px] leading-relaxed text-white/85">{SPACES.dentist.line}</span>
          <span className="mt-6 inline-flex h-12 w-fit items-center gap-2 rounded-full bg-white px-6 text-[14.5px] font-bold text-[#1d1d1f]">
            {counts ? `${counts.dentist} open roles` : "Open roles"} →
          </span>
        </Link>
        <Link href="/jobs/team" className="card group grid min-h-[420px] grid-rows-[1fr_auto] overflow-hidden">
          <span className="relative">
            <Image src={hero("kid-checkup")} alt="" fill sizes="(min-width: 1024px) 620px, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
          </span>
          <span className="grid gap-2 p-8 sm:p-10">
            <span className="text-[12.5px] font-bold uppercase tracking-[0.22em] text-[var(--accent)]">For the whole clinic</span>
            <span className="text-[clamp(28px,3.2vw,40px)] font-bold leading-[1.05] tracking-[-0.03em] text-ink">{SPACES.team.title}</span>
            <span className="text-[15.5px] leading-relaxed text-ink-2">{SPACES.team.line}</span>
            <span className="mt-3 text-[14.5px] font-bold text-[var(--accent)]">{counts ? `${counts.team} open roles →` : "Open roles →"}</span>
          </span>
        </Link>
        <Link href="/jobs/consult" className="card group grid min-h-[420px] grid-rows-[1fr_auto] overflow-hidden">
          <span className="relative">
            <Image src={hero("instruments")} alt="" fill sizes="(min-width: 1024px) 420px, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
          </span>
          <span className="grid gap-2 p-8 sm:p-10">
            <span className="text-[12.5px] font-bold uppercase tracking-[0.22em] text-[var(--accent)]">A specialist for a case</span>
            <span className="text-[clamp(28px,3.2vw,40px)] font-bold leading-[1.05] tracking-[-0.03em] text-ink">Consultation</span>
            <span className="text-[15.5px] leading-relaxed text-ink-2">Clinics bring in visiting consultants for special cases; specialists list the visits they take.</span>
            <span className="mt-3 text-[14.5px] font-bold text-[var(--accent)]">{consults === null ? "Open cases →" : `${consults} open cases →`}</span>
          </span>
        </Link>
      </section>

      <section className="grid gap-6" aria-labelledby="featured">
        <h2 id="featured" className="text-[24px] font-bold tracking-[-0.02em] text-ink">
          Featured employers
        </h2>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {FEATURED_EMPLOYERS.map((e) => (
            <li key={e.id} className="card grid justify-items-center gap-3 px-4 py-6 text-center">
              <EmployerLogo e={e} size={56} />
              <span className="text-[13.5px] font-bold leading-tight text-ink">{e.name}</span>
              <span className="text-[12px] text-ink-3">{e.city}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** True while the reader scrolls down past the header; false as soon as they scroll back up (or reach the top). */
function useHideOnScrollDown(after = 280) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (Math.abs(y - last) < 8) return; // ignore tiny jitters (trackpads, address bars)
        setHidden(y > last && y > after);
        last = y;
      });
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      window.removeEventListener("scroll", on);
      cancelAnimationFrame(raf);
    };
  }, [after]);
  return hidden;
}

/** /jobs/dentists and /jobs/team: one space's listings, its own role chips and filters. */
export function SpaceBoard({ space }: { space: Space }) {
  const router = useRouter();
  const params = useSearchParams();
  const roles = space === "dentist" ? DENTIST_ROLES : TEAM_ROLES;
  const f = {
    q: params.get("q") ?? "",
    role: params.get("role") ?? "",
    city: params.get("city") ?? "",
    type: params.get("type") ?? "",
    experience: params.get("experience") ?? "",
  };
  const [q, setQ] = useState(f.q);
  const [items, setItems] = useState<Job[] | null>(null);
  const viewer = useViewer();
  const [typing, setTyping] = useState(false);
  const hidden = useHideOnScrollDown() && !typing;
  const key = params.toString();
  useEffect(() => {
    searchJobs(viewer?.id ?? null, { space, ...f }).then((r) => setItems(r.items));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the query string is the input
  }, [key, space, viewer?.id]);
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    router.replace(`?${p}`, { scroll: false });
  };
  const select = "h-11 rounded-full bg-[var(--surface)] px-4 text-[13.5px] font-semibold text-ink shadow-[var(--shadow-card)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

  return (
    <div className="grid gap-8 pb-10">
      <header className="grid gap-3 pt-2">
        <Link href="/jobs" className="w-fit text-[13.5px] font-semibold text-ink-3 hover:text-ink">
          ← FMD Jobs
        </Link>
        <h1 className="type-display">{SPACES[space].title}</h1>
        <p className="max-w-[560px] text-[16px] text-ink-2">{SPACES[space].line}</p>
        {space === "dentist" && (
          <p className="w-fit rounded-full bg-[#1d1d1f] px-4 py-2 text-[12.5px] font-semibold text-white">Only dentists verified by FMD can apply to these roles</p>
        )}
      </header>

      {/* one compact bar: hides while scrolling down through results, slides back on any scroll up */}
      <div
        onFocus={() => setTyping(true)}
        onBlur={() => setTyping(false)}
        className={`sticky top-[76px] z-20 -mx-3 grid gap-2.5 bg-[var(--background)] px-3 pb-3 pt-3 shadow-[0_14px_18px_-16px_rgb(0_0_0/0.18)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none sm:-mx-5 sm:px-5 ${
          hidden ? "pointer-events-none -translate-y-[calc(100%+100px)] opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            set("q", q.trim());
          }}
          className="card flex h-12 items-center gap-3 pl-5 pr-1.5"
        >
          <label className="flex-1">
            <span className="sr-only">Search {SPACES[space].title.toLowerCase()}</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by role, clinic or area" className="h-full w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3" />
          </label>
          <button type="submit" className="h-9 rounded-full bg-[var(--button-primary)] px-5 text-[13.5px] font-bold text-[var(--button-primary-fg)]">
            Search
          </button>
        </form>
        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&>*]:shrink-0">
          <button type="button" aria-pressed={!f.role} onClick={() => set("role", "")} className={`h-10 rounded-full px-4 text-[13.5px] font-bold ${!f.role ? "bg-[var(--button-primary)] text-[var(--button-primary-fg)]" : "bg-[var(--surface)] text-ink-2 shadow-[var(--shadow-card)]"}`}>
            All roles
          </button>
          {Object.entries(roles).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={f.role === k} onClick={() => set("role", f.role === k ? "" : k)} className={`h-10 rounded-full px-4 text-[13.5px] font-bold ${f.role === k ? "bg-[var(--button-primary)] text-[var(--button-primary-fg)]" : "bg-[var(--surface)] text-ink-2 shadow-[var(--shadow-card)]"}`}>
              {label}
            </button>
          ))}
          <span aria-hidden className="mx-1 h-6 w-px bg-[var(--border)]" />
          <label>
            <span className="sr-only">City</span>
            <select value={f.city} onChange={(e) => set("city", e.target.value)} className={select}>
              <option value="">Any city</option>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Type</span>
            <select value={f.type} onChange={(e) => set("type", e.target.value)} className={select}>
              <option value="">Any type</option>
              {Object.entries(TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Experience</span>
            <select value={f.experience} onChange={(e) => set("experience", e.target.value)} className={select}>
              <option value="">Any experience</option>
              {Object.entries(EXPERIENCE).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {items === null ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-[330px] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card grid justify-items-center gap-2 px-6 py-14 text-center">
          <p className="text-[17px] font-semibold text-ink">No roles match these filters</p>
          <button type="button" onClick={() => router.replace("?", { scroll: false })} className="text-[14px] font-semibold text-[var(--accent)]">
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <p className="text-[14px] text-ink-3">
            {items.length} open role{items.length > 1 ? "s" : ""}
          </p>
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((j) => (
              <li key={j.id} className="flex">
                <JobCard j={j} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
