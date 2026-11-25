"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/app/kit";
import { Field, fieldCls, Sheet } from "@/components/app/Sheet";
import { Notice } from "@/components/Page";
import { Monogram } from "@/components/main/explore/Monogram";
import { CITIES } from "@/lib/catalog";
import { useViewer } from "@/lib/useViewer";
import { canManageApplicants, canPostJobs, type Viewer } from "@/lib/viewer";
import { applicantCounts, applicantsFor, setStatus, STATUS_LABEL, type Application, type AppStatus } from "@/sample/applications";
import {
  clinicJobs,
  closeJob,
  DENTIST_ROLES,
  getJob,
  jobState,
  myJobs,
  postJob,
  QUALIFICATIONS,
  renewJob,
  SPACES,
  TEAM_ROLES,
  TYPES,
  type Job,
  type JobInput,
  type Poster,
  type Space,
} from "@/sample/jobs";
import { openThread } from "@/sample/messages";
import { JobCard, postedAgo } from "./JobCard";

const posterOf = (v: Viewer): Poster => (v.kind === "company" ? { kind: "company", clinicId: null } : v.kind === "dentist" ? { kind: "dentist", clinicId: null } : { kind: "clinic", clinicId: v.clinicId });
const employerName = (v: Viewer) => (v.kind === "clinic_owner" && v.clinicId === "smile-studio" ? "Smile Studio Dental" : v.name);

function Gate({ viewer, what }: { viewer: Viewer | null; what: string }) {
  return (
    <div className="card mx-auto grid max-w-[560px] justify-items-center gap-3 px-6 py-14 text-center">
      <p className="text-[17px] font-semibold text-ink">{viewer ? `Only clinic owners, verified dentists and dental companies can ${what}` : `Log in to ${what}`}</p>
      {viewer?.kind === "clinic_staff" && <p className="text-[14px] text-ink-3">Ask your clinic owner to post it. You can still reply to applicants from Your listings.</p>}
      {viewer ? <ButtonLink href="/jobs">Back to jobs</ButtonLink> : <ButtonLink href="/login?next=/jobs/new">Log in</ButtonLink>}
    </div>
  );
}

/* ---------------- post a job ---------------- */

export function NewJobPage() {
  const viewer = useViewer();
  const router = useRouter();
  const [space, setSpace] = useState<Space | null>(null);
  const [f, setF] = useState<JobInput>({ title: "", role: "associate", type: "full_time", employer: "", city: "Bengaluru", area: "", description: "", requirements: "", day_to_day: "", benefits: "", min_years: 0, salary: null, qualification: "BDS" });
  const [err, setErr] = useState<string | null>(null);
  if (viewer === undefined) return <div className="card h-96 animate-pulse" aria-busy />;
  if (!canPostJobs(viewer)) return <Gate viewer={viewer} what="post jobs" />;
  const me = viewer!;
  const set = <K extends keyof JobInput>(k: K, v: JobInput[K]) => (setErr(null), setF((x) => ({ ...x, [k]: v })));
  const roles = space === "team" ? TEAM_ROLES : DENTIST_ROLES;
  const pick = (s: Space) => {
    setSpace(s);
    setF((x) => ({ ...x, employer: x.employer || employerName(me), role: s === "team" ? "assistant" : "associate", qualification: s === "team" ? "Diploma" : "BDS" }));
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await postJob(me.id, f, null, Date.now(), posterOf(me));
      router.push("/jobs/mine");
    } catch (x) {
      setErr((x as Error).message);
    }
  };
  const preview: Job = { ...f, id: "preview", space: space ?? "dentist", employer: { id: me.id, kind: posterOf(me).kind, name: f.employer || employerName(me), verified: false, clinic_id: null, logo: (f.employer || employerName(me)).slice(0, 2).toUpperCase(), photos: [], about: "", city: f.city }, day_to_day: [], requirements: [], benefits: [], posted_at: new Date().toISOString(), expires_at: new Date().toISOString(), status: "active", posted_by: me.id, demo: true };

  return (
    <div className="mx-auto grid w-full max-w-[880px] gap-6 pb-10">
      <header className="grid gap-2">
        <Link href="/jobs" className="w-fit text-[13.5px] font-semibold text-ink-3 hover:text-ink">
          ← FMD Jobs
        </Link>
        <h1 className="text-[32px] font-bold tracking-[-0.03em] text-ink">Post a job</h1>
        <p className="text-[15px] text-ink-2">It runs for 30 days and you can renew it. People apply inside FMD with their career profile.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Which space">
        {(["dentist", "team"] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={space === s}
            onClick={() => pick(s)}
            className={`grid gap-2 rounded-[24px] p-6 text-left transition-shadow ${space === s ? (s === "dentist" ? "bg-[#1d1d1f] text-white" : "bg-[var(--accent)] text-white") : "card hover:shadow-[var(--shadow-lift)]"}`}
          >
            <span className="text-[20px] font-bold tracking-[-0.02em]">{SPACES[s].title}</span>
            <span className={`text-[14px] ${space === s ? "text-white/85" : "text-ink-3"}`}>{SPACES[s].line}</span>
          </button>
        ))}
      </section>

      {space && (
        <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="card grid gap-4 p-6">
            <Field label="Job title">
              <input className={fieldCls} value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={90} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Role">
                <select className={fieldCls} value={f.role} onChange={(e) => set("role", e.target.value as JobInput["role"])}>
                  {Object.entries(roles).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Type">
                <select className={fieldCls} value={f.type} onChange={(e) => set("type", e.target.value as JobInput["type"])}>
                  {Object.entries(TYPES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Employer name">
                <input className={fieldCls} value={f.employer} onChange={(e) => set("employer", e.target.value)} maxLength={80} />
              </Field>
              <Field label="City">
                <select className={fieldCls} value={f.city} onChange={(e) => set("city", e.target.value)}>
                  {CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Area">
                <input className={fieldCls} value={f.area} onChange={(e) => set("area", e.target.value)} maxLength={60} />
              </Field>
              <Field label="Qualification">
                <select className={fieldCls} value={f.qualification} onChange={(e) => set("qualification", e.target.value as JobInput["qualification"])}>
                  {Object.keys(QUALIFICATIONS).map((q) => (
                    <option key={q}>{q}</option>
                  ))}
                </select>
              </Field>
              {space === "dentist" && (
                <Field label="Specialisation (optional)">
                  <input className={fieldCls} value={f.specialization ?? ""} onChange={(e) => set("specialization", e.target.value)} maxLength={60} placeholder="e.g. Orthodontics" />
                </Field>
              )}
              <Field label="Minimum experience (years)">
                <input className={fieldCls} type="number" min={0} max={40} value={f.min_years} onChange={(e) => set("min_years", Number(e.target.value))} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Pay from (₹ a month, optional)">
                <input className={fieldCls} type="number" min={0} value={f.salary?.min ?? ""} onChange={(e) => set("salary", e.target.value ? { min: Number(e.target.value), max: f.salary?.max ?? Number(e.target.value) } : null)} />
              </Field>
              <Field label="Pay up to">
                <input className={fieldCls} type="number" min={0} value={f.salary?.max ?? ""} disabled={!f.salary} onChange={(e) => f.salary && set("salary", { ...f.salary, max: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="About the role">
              <textarea className={`${fieldCls} h-28 resize-y py-2.5`} value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={1500} />
            </Field>
            <Field label="Day to day" hint="One per line.">
              <textarea className={`${fieldCls} h-24 resize-y py-2.5`} value={f.day_to_day} onChange={(e) => set("day_to_day", e.target.value)} maxLength={800} />
            </Field>
            <Field label="What they'll need" hint="One per line.">
              <textarea className={`${fieldCls} h-24 resize-y py-2.5`} value={f.requirements} onChange={(e) => set("requirements", e.target.value)} maxLength={800} />
            </Field>
            <Field label="What they get (optional)" hint="One per line.">
              <textarea className={`${fieldCls} h-20 resize-y py-2.5`} value={f.benefits} onChange={(e) => set("benefits", e.target.value)} maxLength={600} />
            </Field>
            {err && <Notice kind="error">{err}</Notice>}
            <div className="flex justify-end">
              <Button type="submit">Post job</Button>
            </div>
          </div>
          <aside className="grid gap-3 lg:sticky lg:top-24">
            <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-ink-3">Preview</p>
            <JobCard j={preview} />
          </aside>
        </form>
      )}
    </div>
  );
}

/* ---------------- your listings ---------------- */

/** Jobs this viewer posted, plus (owners and front desk) the clinic's own listings. */
async function listingsFor(v: Viewer): Promise<Job[]> {
  const mine = await myJobs(v.id);
  // owner and front desk see all of the clinic's listings (open or not); a dentist who works there sees only their own
  const forClinic = (v.kind === "clinic_owner" || v.kind === "clinic_staff") && v.clinicId ? await clinicJobs(v.clinicId) : [];
  return [...mine, ...forClinic.filter((j) => !mine.some((m) => m.id === j.id))];
}

export function MyJobsPage() {
  const viewer = useViewer();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [counts, setCounts] = useState<Record<string, { total: number; fresh: number }>>({});
  const [now, setNow] = useState(0);
  const load = useCallback(() => {
    if (!viewer) return;
    listingsFor(viewer).then(async (js) => {
      setNow(Date.now());
      setJobs(js);
      setCounts(await applicantCounts(js.map((j) => j.id)));
    });
  }, [viewer]);
  useEffect(load, [load]);
  if (viewer === undefined) return <div className="card h-64 animate-pulse" aria-busy />;
  if (!canManageApplicants(viewer)) return <Gate viewer={viewer} what="manage job listings" />;

  return (
    <div className="mx-auto grid w-full max-w-[920px] grid-cols-[minmax(0,1fr)] gap-6 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-2">
          <Link href="/jobs" className="w-fit text-[13.5px] font-semibold text-ink-3 hover:text-ink">
            ← FMD Jobs
          </Link>
          <h1 className="text-[32px] font-bold tracking-[-0.03em] text-ink">Your listings</h1>
        </div>
        {canPostJobs(viewer) && <ButtonLink href="/jobs/new">Post a job</ButtonLink>}
      </header>
      {jobs === null ? (
        <div className="card h-48 animate-pulse" aria-busy />
      ) : jobs.length === 0 ? (
        <div className="card grid justify-items-center gap-3 px-6 py-14 text-center">
          <p className="text-[17px] font-semibold text-ink">No listings yet</p>
          {canPostJobs(viewer) && <ButtonLink href="/jobs/new">Post your first job</ButtonLink>}
        </div>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {jobs.map((j) => {
            const state = jobState(j);
            const days = Math.max(0, Math.ceil((Date.parse(j.expires_at) - now) / 86_400_000));
            const c = counts[j.id] ?? { total: 0, fresh: 0 };
            return (
              <li key={j.id} className="card flex flex-wrap items-center gap-4 p-5">
                <span className="min-w-0 flex-1">
                  <Link href={`/jobs/mine/${j.id}`} className="block truncate text-[16.5px] font-bold text-ink hover:underline">
                    {j.title}
                  </Link>
                  <span className="block text-[13.5px] text-ink-3">
                    {SPACES[j.space].title} · {state === "active" ? `${days} days left` : state === "closed" ? "Closed" : "Expired"} · posted {postedAgo(j.posted_at).toLowerCase()}
                  </span>
                </span>
                <Link href={`/jobs/mine/${j.id}`} className="flex items-center gap-2 rounded-full bg-[var(--background)] px-4 py-2 text-[13.5px] font-bold text-ink">
                  {c.total} applicant{c.total === 1 ? "" : "s"}
                  {c.fresh > 0 && <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11.5px] text-white">{c.fresh} new</span>}
                </Link>
                {j.mine && (
                  <span className="flex gap-2">
                    {state !== "active" ? (
                      <Button size="sm" variant="secondary" onClick={() => renewJob(viewer!.id, j.id).then(load)}>
                        Renew
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => closeJob(viewer!.id, j.id).then(load)}>
                        Close
                      </Button>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ---------------- one job's applicants ---------------- */

const FILTERS: ("all" | AppStatus)[] = ["all", "sent", "seen", "shortlisted", "declined"];

export function ApplicantsPage() {
  const { id } = useParams<{ id: string }>();
  const viewer = useViewer();
  const router = useRouter();
  const [job, setJob] = useState<Job | null | undefined>(undefined);
  const [apps, setApps] = useState<Application[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [open, setOpen] = useState<Application | null>(null);
  const load = useCallback(() => {
    if (!viewer) return;
    getJob(viewer.id, id).then(setJob);
    applicantsFor(viewer, id).then(setApps, (e: Error) => setErr(e.message));
  }, [viewer, id]);
  useEffect(load, [load]);
  if (viewer === undefined) return <div className="card h-64 animate-pulse" aria-busy />;
  if (!viewer) return <Gate viewer={null} what="see applicants" />;
  if (err) return <Notice kind="error">{err === "Not your job" ? "Only the employer who listed this job can see its applicants." : err}</Notice>;
  if (!job || !apps) return <div className="card h-64 animate-pulse" aria-busy />;

  const act = (a: Application, s: Exclude<AppStatus, "sent">) => setStatus(viewer, a.id, s).then((n) => (setOpen(open && open.id === a.id ? n : open), load()));
  const message = async (a: Application) => {
    const t = await openThread(viewer, { id: a.userId, name: a.snapshot.name, avatar: null, kind: a.snapshot.dentist ? "dentist" : "patient", verified: false }, { jobId: job.id });
    router.push(`/messages/${t.id}`);
  };
  const shown = apps.filter((a) => filter === "all" || a.status === filter);

  return (
    <div className="mx-auto grid w-full max-w-[920px] grid-cols-[minmax(0,1fr)] gap-6 pb-10">
      <header className="grid gap-2">
        <Link href="/jobs/mine" className="w-fit text-[13.5px] font-semibold text-ink-3 hover:text-ink">
          ← Your listings
        </Link>
        <h1 className="text-[28px] font-bold tracking-[-0.03em] text-ink">{job.title}</h1>
        <p className="text-[14px] text-ink-3">
          {apps.length} applicant{apps.length === 1 ? "" : "s"} · <Link href={`/jobs/${job.id}`}>View listing</Link>
        </p>
      </header>
      <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-1 rounded-full bg-[var(--background-secondary)] p-1">
        {FILTERS.map((s) => (
          <button key={s} role="tab" aria-selected={filter === s} onClick={() => setFilter(s)} className={`h-9 rounded-full px-4 text-[13px] font-bold ${filter === s ? "bg-[var(--surface)] text-ink shadow-[var(--shadow-card)]" : "text-ink-3"}`}>
            {s === "all" ? "All" : STATUS_LABEL[s]} {s === "all" ? apps.length : apps.filter((a) => a.status === s).length}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="card px-6 py-12 text-center text-[14.5px] text-ink-3">Nobody here yet.</p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {shown.map((a) => (
            <li key={a.id} className="card flex flex-wrap items-center gap-4 p-5">
              <button type="button" onClick={() => setOpen(a)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <Monogram name={a.snapshot.name} size={48} />
                <span className="min-w-0">
                  <span className="block truncate text-[15.5px] font-bold text-ink">{a.snapshot.name}</span>
                  <span className="block truncate text-[13px] text-ink-3">
                    {a.snapshot.headline} · applied {postedAgo(a.at).toLowerCase()}
                  </span>
                </span>
              </button>
              <span className="rounded-full bg-[var(--background)] px-3 py-1 text-[12px] font-bold text-ink-2">{STATUS_LABEL[a.status]}</span>
              <span className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => act(a, "shortlisted")} disabled={a.status === "shortlisted"}>
                  Shortlist
                </Button>
                <Button size="sm" variant="secondary" onClick={() => act(a, "declined")} disabled={a.status === "declined"}>
                  Decline
                </Button>
                <Button size="sm" variant="secondary" onClick={() => message(a)}>
                  Message
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <Sheet title={open.snapshot.name} onClose={() => setOpen(null)}>
          <div className="grid gap-4 text-[14.5px] text-ink-2">
            <p className="font-semibold text-ink">{open.snapshot.headline}</p>
            {open.snapshot.dentist && (
              <p>
                {open.snapshot.dentist.degree}
                {open.snapshot.dentist.specialization && ` (${open.snapshot.dentist.specialization})`} · {open.snapshot.dentist.years} years · {open.snapshot.dentist.council}, reg. {open.snapshot.dentist.registration_no}
              </p>
            )}
            <p>Qualifications: {open.snapshot.qualifications.join(", ")}</p>
            {open.snapshot.experience[0] && (
              <p>
                Latest: {open.snapshot.experience[0].title}, {open.snapshot.experience[0].place}
              </p>
            )}
            {open.snapshot.skills.length > 0 && <p>Skills: {open.snapshot.skills.join(", ")}</p>}
            <p>Languages: {open.snapshot.languages.join(", ")}</p>
            <p>
              {open.snapshot.city} · {open.snapshot.phone} · {open.snapshot.email}
            </p>
            <p>CV: {open.snapshot.cv?.name ?? "not attached"}</p>
            {open.note && <p className="rounded-[14px] bg-[var(--background)] p-3 italic">&ldquo;{open.note}&rdquo;</p>}
          </div>
        </Sheet>
      )}
    </div>
  );
}
