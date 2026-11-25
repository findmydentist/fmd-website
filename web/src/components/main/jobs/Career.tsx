"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/app/kit";
import { Field, fieldCls } from "@/components/app/Sheet";
import { Notice } from "@/components/Page";
import { safeNext } from "@/lib/demo";
import { useViewer } from "@/lib/useViewer";
import { getProfile, myApplications, profileGaps, saveProfile, STATUS_LABEL, type Application, type ApplicantProfile, type AppStatus } from "@/sample/applications";
import type { Job } from "@/sample/jobs";
import { EmployerLogo, postedAgo } from "./JobCard";

const blank = (userId: string, name: string): ApplicantProfile => ({ userId, name, phone: "", email: "", city: "", headline: "", qualifications: [], experience: [], skills: [], languages: [], cv: null });
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

function SignIn({ next }: { next: string }) {
  return (
    <div className="card mx-auto grid max-w-[520px] justify-items-center gap-3 px-6 py-14 text-center">
      <p className="text-[17px] font-semibold text-ink">Log in to apply for jobs</p>
      <ButtonLink href={`/login?next=${encodeURIComponent(next)}`}>Log in</ButtonLink>
    </div>
  );
}

/** /account/career: the profile every application sends. Filled once, reused for every job. */
export function CareerProfilePage() {
  const viewer = useViewer();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [p, setP] = useState<ApplicantProfile | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const isDentist = viewer?.kind === "dentist" || viewer?.kind === "clinic_owner";
  useEffect(() => {
    if (viewer) getProfile(viewer.id).then((x) => setP(x ?? blank(viewer.id, viewer.name)));
  }, [viewer]);
  if (viewer === undefined) return <div className="card h-96 animate-pulse" aria-busy />;
  if (!viewer) return <SignIn next="/account/career" />;
  if (!p) return <div className="card h-96 animate-pulse" aria-busy />;

  const edit = (patch: Partial<ApplicantProfile>) => (setSaved(false), setP({ ...p, ...patch }));
  const job = p.experience[0] ?? { title: "", place: "", from: "", to: null };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await saveProfile(p);
      setSaved(true);
      if (next) router.push(safeNext(next));
    } catch (x) {
      setErr((x as Error).message);
    }
  };
  const gaps = profileGaps(p, isDentist ? "dentist" : "team");

  return (
    <form onSubmit={save} className="mx-auto grid w-full max-w-[760px] gap-6 pb-10">
      <header className="grid gap-2">
        <Link href="/jobs" className="w-fit text-[13.5px] font-semibold text-ink-3 hover:text-ink">
          ← FMD Jobs
        </Link>
        <h1 className="text-[32px] font-bold tracking-[-0.03em] text-ink">Career profile</h1>
        <p className="text-[15px] text-ink-2">Fill it once. Every application you send uses it, and employers see it as it was when you applied.</p>
        {gaps.length > 0 && <p className="text-[13.5px] text-ink-3">Still needed to apply: {gaps.join(", ")}.</p>}
      </header>

      <section className="card grid gap-4 p-6">
        <h2 className="text-[17px] font-bold text-ink">You</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input className={fieldCls} value={p.name} onChange={(e) => edit({ name: e.target.value })} maxLength={100} autoComplete="name" />
          </Field>
          <Field label="City">
            <input className={fieldCls} value={p.city} onChange={(e) => edit({ city: e.target.value })} maxLength={60} autoComplete="address-level2" />
          </Field>
          <Field label="Mobile number">
            <input className={fieldCls} value={p.phone} onChange={(e) => edit({ phone: e.target.value })} inputMode="tel" autoComplete="tel" maxLength={20} />
          </Field>
          <Field label="Email">
            <input className={fieldCls} value={p.email} onChange={(e) => edit({ email: e.target.value })} type="email" autoComplete="email" maxLength={120} />
          </Field>
        </div>
        <Field label="Headline" hint="One line, e.g. General dentist, 4 years, rotary endo.">
          <input className={fieldCls} value={p.headline} onChange={(e) => edit({ headline: e.target.value })} maxLength={100} />
        </Field>
      </section>

      {isDentist && (
        <section className="card grid gap-4 p-6">
          <h2 className="text-[17px] font-bold text-ink">Registration</h2>
          <p className="text-[13.5px] text-ink-3">Dentist roles need your council registration. Employers see it with your application.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="State dental council">
              <input className={fieldCls} value={p.dentist?.council ?? ""} onChange={(e) => edit({ dentist: { degree: "BDS", years: 0, registration_no: "", ...p.dentist, council: e.target.value } })} maxLength={80} />
            </Field>
            <Field label="Registration number">
              <input className={fieldCls} value={p.dentist?.registration_no ?? ""} onChange={(e) => edit({ dentist: { degree: "BDS", years: 0, council: "", ...p.dentist, registration_no: e.target.value } })} maxLength={30} />
            </Field>
            <Field label="Highest degree">
              <select className={fieldCls} value={p.dentist?.degree ?? "BDS"} onChange={(e) => edit({ dentist: { council: "", registration_no: "", years: 0, ...p.dentist, degree: e.target.value as "BDS" | "MDS" } })}>
                <option>BDS</option>
                <option>MDS</option>
              </select>
            </Field>
            <Field label="Years in practice">
              <input className={fieldCls} type="number" min={0} max={60} value={p.dentist?.years ?? 0} onChange={(e) => edit({ dentist: { council: "", registration_no: "", degree: "BDS", ...p.dentist, years: Number(e.target.value) } })} />
            </Field>
          </div>
          {p.dentist?.degree === "MDS" && (
            <Field label="Specialisation">
              <input className={fieldCls} value={p.dentist.specialization ?? ""} onChange={(e) => edit({ dentist: { ...p.dentist!, specialization: e.target.value } })} maxLength={60} />
            </Field>
          )}
        </section>
      )}

      <section className="card grid gap-4 p-6">
        <h2 className="text-[17px] font-bold text-ink">Experience and skills</h2>
        <Field label="Qualifications" hint="Separate with commas, e.g. BDS, Diploma in Dental Hygiene.">
          <input className={fieldCls} value={p.qualifications.join(", ")} onChange={(e) => edit({ qualifications: list(e.target.value) })} maxLength={200} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Latest role">
            <input className={fieldCls} value={job.title} onChange={(e) => edit({ experience: [{ ...job, title: e.target.value }] })} maxLength={80} />
          </Field>
          <Field label="Where">
            <input className={fieldCls} value={job.place} onChange={(e) => edit({ experience: [{ ...job, place: e.target.value }] })} maxLength={80} />
          </Field>
          <Field label="Since">
            <input className={fieldCls} type="month" value={job.from} onChange={(e) => edit({ experience: [{ ...job, from: e.target.value }] })} />
          </Field>
        </div>
        <Field label="Skills" hint="Separate with commas.">
          <input className={fieldCls} value={p.skills.join(", ")} onChange={(e) => edit({ skills: list(e.target.value) })} maxLength={300} />
        </Field>
        <Field label="Languages" hint="Separate with commas.">
          <input className={fieldCls} value={p.languages.join(", ")} onChange={(e) => edit({ languages: list(e.target.value) })} maxLength={150} />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-full border border-line px-5 py-2.5 text-[14px] font-semibold text-ink hover:border-line-strong has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-[var(--accent)]">
            {p.cv ? "Replace CV" : "Add your CV (PDF)"}
            <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => e.target.files?.[0] && edit({ cv: { name: e.target.files[0].name, size: e.target.files[0].size } })} />
          </label>
          {p.cv && <span className="text-[13.5px] text-ink-2">{p.cv.name}</span>}
        </div>
      </section>

      {err && <Notice kind="error">{err}</Notice>}
      {saved && !next && <Notice kind="success">Saved. Your next application uses this profile.</Notice>}
      <div className="flex justify-end gap-2">
        <Button type="submit">{next ? "Save and go back to the job" : "Save profile"}</Button>
      </div>
    </form>
  );
}

const TONE: Record<AppStatus, string> = {
  sent: "bg-[var(--background)] text-ink-2",
  seen: "bg-[var(--accent-soft)] text-[var(--accent)]",
  shortlisted: "bg-[#e6f4ea] text-[#1e6b3a]",
  declined: "bg-[var(--background)] text-ink-3",
};

/** /jobs/applications: every job you applied to, with where it stands. */
export function ApplicationsPage() {
  const viewer = useViewer();
  const [items, setItems] = useState<(Application & { job: Job })[] | null>(null);
  useEffect(() => {
    if (viewer) myApplications(viewer.id).then(setItems);
  }, [viewer]);
  if (viewer === undefined) return <div className="card h-64 animate-pulse" aria-busy />;
  if (!viewer) return <SignIn next="/jobs/applications" />;
  return (
    <div className="mx-auto grid w-full max-w-[860px] grid-cols-[minmax(0,1fr)] gap-6 pb-10">
      <header className="grid gap-2">
        <Link href="/jobs" className="w-fit text-[13.5px] font-semibold text-ink-3 hover:text-ink">
          ← FMD Jobs
        </Link>
        <h1 className="text-[32px] font-bold tracking-[-0.03em] text-ink">Your applications</h1>
      </header>
      {items === null ? (
        <div className="card h-48 animate-pulse" aria-busy />
      ) : items.length === 0 ? (
        <div className="card grid justify-items-center gap-3 px-6 py-14 text-center">
          <p className="text-[17px] font-semibold text-ink">You haven&apos;t applied anywhere yet</p>
          <ButtonLink href="/jobs">Browse jobs</ButtonLink>
        </div>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {items.map((a) => (
            <li key={a.id}>
              <Link href={`/jobs/${a.job.id}`} className="card flex items-center gap-4 p-5 transition-shadow hover:shadow-[var(--shadow-lift)]">
                <EmployerLogo e={a.job.employer} size={48} dark={a.job.space === "dentist"} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-bold text-ink">{a.job.title}</span>
                  <span className="block truncate text-[13.5px] text-ink-3">
                    {a.job.employer.name} · applied {postedAgo(a.at).toLowerCase()}
                  </span>
                </span>
                <span className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-bold ${TONE[a.status]}`}>{STATUS_LABEL[a.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
