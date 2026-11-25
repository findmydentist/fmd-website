"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/app/kit";
import { Field, fieldCls, Sheet } from "@/components/app/Sheet";
import { Notice } from "@/components/Page";
import { Keep, Verified } from "@/components/main/explore/icons";
import { useViewer } from "@/lib/useViewer";
import { canApplyDentistRole, type Viewer } from "@/lib/viewer";
import { apply, getProfile, myApplications, profileGaps, STATUS_LABEL, type Application, type ApplicantProfile } from "@/sample/applications";
import { getJob, JOB_REPORTS, jobState, QUALIFICATIONS, reportJob, ROLES, SPACES, TYPES, type Job } from "@/sample/jobs";
import { MEDIA } from "@/sample/media";
import { MessagesOff, openThread } from "@/sample/messages";
import { getSaved, toggleSaved } from "@/sample/saved";
import { EmployerLogo, pay, postedAgo } from "./JobCard";

function Gallery({ j }: { j: Job }) {
  const photos = j.employer.photos.map((k) => MEDIA[k]).filter((m): m is NonNullable<typeof m> => !!m);
  const [open, setOpen] = useState<number | null>(null);
  if (!photos.length) return null;
  return (
    <>
      <div className="grid h-[280px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-[28px] sm:h-[400px]">
        {photos.slice(0, 5).map((m, i) => (
          <button key={m.key + i} type="button" onClick={() => setOpen(i)} aria-label={`Photo ${i + 1} of ${photos.length}: ${m.alt}`} className={`relative overflow-hidden ${i === 0 ? "col-span-4 row-span-2 sm:col-span-2" : "hidden sm:block"}`}>
            <Image src={m.src} alt="" fill sizes={i === 0 ? "(min-width: 640px) 640px, 100vw" : "320px"} className="object-cover transition-transform duration-500 hover:scale-[1.03]" priority={i === 0} />
          </button>
        ))}
      </div>
      {open !== null && (
        <Sheet title={`${j.employer.name}: photo ${open + 1} of ${photos.length}`} onClose={() => setOpen(null)} wide>
          <div className="grid gap-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-black">
              <Image src={photos[open]!.src} alt={photos[open]!.alt} fill sizes="900px" className="object-contain" />
            </div>
            <div className="flex justify-between">
              <Button variant="secondary" size="sm" disabled={open === 0} onClick={() => setOpen(open - 1)}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={open === photos.length - 1} onClick={() => setOpen(open + 1)}>
                Next
              </Button>
            </div>
          </div>
        </Sheet>
      )}
    </>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="grid gap-3">
      <h2 className="text-[18px] font-bold text-ink">{title}</h2>
      <ul className="grid gap-2.5">
        {items.map((x) => (
          <li key={x} className="flex gap-3 text-[15px] leading-relaxed text-ink-2">
            <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
            {x}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Apply: the career profile as it'll be sent, what's missing, and an optional note. */
function ApplySheet({ j, viewer, onClose, onDone }: { j: Job; viewer: Viewer; onClose: () => void; onDone: (a: Application) => void }) {
  const [p, setP] = useState<ApplicantProfile | null | undefined>(undefined);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    getProfile(viewer.id).then(setP);
  }, [viewer.id]);
  const gaps = p === undefined ? [] : profileGaps(p, j.space);
  const send = async () => {
    setBusy(true);
    setErr(null);
    try {
      onDone(await apply(viewer, j.id, note));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet title={`Apply: ${j.title}`} onClose={onClose}>
      {p === undefined ? (
        <div className="h-40 animate-pulse rounded-[18px] bg-[var(--background)]" aria-busy />
      ) : (
        <div className="grid gap-4">
          {gaps.length > 0 ? (
            <div className="grid gap-3 rounded-[18px] bg-[var(--accent-soft)] p-4">
              <p className="text-[14.5px] text-ink">Your career profile needs: {gaps.join(", ")}.</p>
              <ButtonLink href={`/account/career?next=${encodeURIComponent(`/jobs/${j.id}`)}`} size="sm" className="w-fit">
                Finish your profile
              </ButtonLink>
            </div>
          ) : (
            <div className="grid gap-1 rounded-[18px] border border-line p-4">
              <p className="text-[15px] font-bold text-ink">{p!.name}</p>
              <p className="text-[13.5px] text-ink-2">{p!.headline}</p>
              <p className="text-[13px] text-ink-3">
                {p!.qualifications.join(", ")} · {p!.city} · CV: {p!.cv?.name}
              </p>
              {p!.dentist && (
                <p className="text-[13px] text-ink-3">
                  {p!.dentist.council}, reg. {p!.dentist.registration_no}
                </p>
              )}
              <Link href={`/account/career?next=${encodeURIComponent(`/jobs/${j.id}`)}`} className="mt-1 w-fit text-[13px] font-semibold">
                Edit profile
              </Link>
            </div>
          )}
          <Field label="A note to the employer (optional)">
            <textarea className={`${fieldCls} h-24 resize-y py-2.5`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Why this role, and when you could start." />
          </Field>
          {err && <Notice kind="error">{err}</Notice>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={send} disabled={busy || gaps.length > 0}>
              {busy ? "Sending…" : "Send application"}
            </Button>
          </div>
          <p className="text-[12.5px] text-ink-3">The employer sees this profile as it is now. A real employer never asks you to pay to apply.</p>
        </div>
      )}
    </Sheet>
  );
}

function ReportJob({ userId, id, onClose, onDone }: { userId: string | null; id: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState<keyof typeof JOB_REPORTS | "">("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <Sheet title="Report this job" onClose={onClose}>
      <div className="grid gap-4">
        {err && <Notice kind="error">{err}</Notice>}
        <fieldset className="grid gap-1.5">
          <legend className="mb-1 text-[14px] text-ink-2">What&apos;s wrong with it?</legend>
          {(Object.entries(JOB_REPORTS) as [keyof typeof JOB_REPORTS, string][]).map(([k, v]) => (
            <label key={k} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-[14.5px] text-ink hover:bg-[var(--background)]">
              <input type="radio" name="reason" checked={reason === k} onChange={() => setReason(k)} className="size-4 accent-[var(--accent)]" />
              {v}
            </label>
          ))}
        </fieldset>
        <Field label={reason === "other" ? "Tell us what's wrong" : "Anything to add? (optional)"}>
          <textarea className={`${fieldCls} h-20 resize-y py-2.5`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => reportJob(userId, id, reason, note).then(onDone, (e: Error) => setErr(e.message))}>Send report</Button>
        </div>
      </div>
    </Sheet>
  );
}

/** /jobs/[id] */
export function JobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const viewer = useViewer();
  const [j, setJ] = useState<Job | null | undefined>(undefined);
  const [mine, setMine] = useState<Application | null>(null);
  const [saved, setSaved] = useState(false);
  const [applying, setApplying] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const ready = viewer !== undefined;
  const load = useCallback(() => {
    if (!ready) return;
    getJob(viewer?.id ?? null, id).then(setJ);
    if (viewer) {
      myApplications(viewer.id).then((as) => setMine(as.find((a) => a.jobId === id) ?? null));
      getSaved(viewer.id, "job").then((l) => setSaved(l.includes(id)));
    }
  }, [ready, viewer, id]);
  useEffect(load, [load]);

  if (j === undefined) return <div className="card h-[420px] animate-pulse" aria-busy />;
  if (j === null)
    return (
      <div className="card grid justify-items-center gap-3 px-6 py-14 text-center">
        <p className="text-[17px] font-semibold text-ink">This job isn&apos;t listed any more</p>
        <ButtonLink href="/jobs" variant="secondary">
          Browse jobs
        </ButtonLink>
      </div>
    );

  const state = jobState(j);
  const dentistOnly = j.space === "dentist";
  const blocked = dentistOnly && viewer && !canApplyDentistRole(viewer);
  const login = () => router.push(`/login?next=${encodeURIComponent(`/jobs/${j.id}`)}`);
  const message = async () => {
    if (!viewer) return login();
    try {
      const t = await openThread(viewer, { id: j.employer.id, name: j.employer.name, avatar: null, kind: j.employer.kind === "company" ? "company" : j.employer.kind === "dentist" ? "dentist" : "clinic", verified: j.employer.verified }, { jobId: j.id });
      router.push(`/messages/${t.id}`);
    } catch (e) {
      setNote(e instanceof MessagesOff ? e.message : "Couldn't open a chat. Try again.");
    }
  };

  return (
    <div className="grid gap-8 pb-10">
      <Link href={dentistOnly ? "/jobs/dentists" : "/jobs/team"} className="w-fit text-[13.5px] font-semibold text-ink-3 hover:text-ink">
        ← {SPACES[j.space].title}
      </Link>
      <Gallery j={j} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <article className="grid gap-8">
          <header className="grid gap-4">
            <div className="flex items-center gap-3">
              <EmployerLogo e={j.employer} size={56} dark={dentistOnly} />
              <div>
                <p className="flex items-center gap-1.5 text-[15px] font-bold text-ink">
                  {j.employer.name} {j.employer.verified ? <Verified size={16} /> : <span className="text-[12.5px] font-medium text-ink-3">(not yet checked by FMD)</span>}
                </p>
                <p className="text-[13.5px] text-ink-3">
                  {j.area}, {j.city}
                  {j.employer.size && ` · ${j.employer.size}`}
                </p>
              </div>
            </div>
            <h1 className="text-[clamp(28px,3.6vw,42px)] font-bold leading-[1.1] tracking-[-0.03em] text-ink">{j.title}</h1>
            <div className="flex flex-wrap gap-2 text-[13px] font-semibold">
              {[ROLES[j.role], TYPES[j.type], j.specialization ?? QUALIFICATIONS[j.qualification], j.min_years ? `${j.min_years}+ years` : "Freshers welcome", `Posted ${postedAgo(j.posted_at).toLowerCase()}`].map((x) => (
                <span key={x} className="rounded-full bg-[var(--surface)] px-3.5 py-1.5 text-ink-2 shadow-[var(--shadow-card)]">
                  {x}
                </span>
              ))}
            </div>
            {state !== "active" && <Notice kind="info">This listing is {state === "closed" ? "closed" : "no longer open"}. It stays here so saved links still work.</Notice>}
          </header>
          <section className="grid gap-3">
            <h2 className="text-[18px] font-bold text-ink">About the role</h2>
            <p className="text-[15.5px] leading-relaxed text-ink-2">{j.description}</p>
          </section>
          <List title="Day to day" items={j.day_to_day.filter((x) => x !== "-")} />
          <List title="What you'll need" items={j.requirements} />
          <List title="What you get" items={j.benefits} />
          {j.employer.about && (
            <section className="card grid gap-3 p-6">
              <h2 className="text-[18px] font-bold text-ink">About {j.employer.name}</h2>
              <p className="text-[15px] leading-relaxed text-ink-2">{j.employer.about}</p>
              {j.employer.kind === "clinic" && j.employer.clinic_id && j.employer.clinic_id !== "smile-studio" && (
                <Link href={`/clinics/${j.employer.clinic_id}`} className="w-fit text-[14px] font-semibold">
                  See the clinic on FMD →
                </Link>
              )}
            </section>
          )}
          <div className="flex flex-wrap items-center gap-4 text-[13px] text-ink-3">
            <span>You apply inside FMD. A real employer never asks you to pay to apply.</span>
            <button type="button" onClick={() => (viewer ? setReporting(true) : login())} className="font-semibold hover:text-ink">
              Report this job
            </button>
          </div>
        </article>

        <aside className="card grid gap-4 p-6 lg:sticky lg:top-24">
          <p className="text-[24px] font-bold tracking-[-0.02em] text-ink">{pay(j)}</p>
          {mine ? (
            <div className="grid gap-1 rounded-[16px] bg-[var(--accent-soft)] p-4">
              <p className="text-[14.5px] font-bold text-ink">You applied · {STATUS_LABEL[mine.status]}</p>
              <Link href="/jobs/applications" className="text-[13.5px] font-semibold">
                See your applications
              </Link>
            </div>
          ) : blocked ? (
            <div className="grid gap-2 rounded-[16px] bg-[var(--background)] p-4">
              <p className="text-[14.5px] font-bold text-ink">For verified dentists only</p>
              <p className="text-[13.5px] text-ink-2">Dentist roles open once FMD has checked your registration.</p>
              <Link href="/account/dentist" className="text-[13.5px] font-semibold">
                Get verified
              </Link>
            </div>
          ) : (
            <Button onClick={() => (viewer ? setApplying(true) : login())} disabled={state !== "active"} className="w-full">
              Apply with your FMD profile
            </Button>
          )}
          <Button variant="secondary" onClick={message} className="w-full">
            Message {j.employer.kind === "dentist" ? j.employer.name.split(" ").slice(0, 2).join(" ") : "the clinic"}
          </Button>
          <button
            type="button"
            onClick={() => (viewer ? toggleSaved(viewer.id, "job", j.id).then(setSaved) : login())}
            aria-pressed={saved}
            className={`flex h-11 items-center justify-center gap-2 rounded-full text-[14px] font-semibold ${saved ? "text-[var(--accent)]" : "text-ink-2 hover:text-ink"}`}
          >
            <Keep size={18} filled={saved} /> {saved ? "Kept" : "Keep for later"}
          </button>
          {note && (
            <p role="status" className="text-[13px] text-ink-2">
              {note}
            </p>
          )}
        </aside>
      </div>
      {applying && viewer && (
        <ApplySheet
          j={j}
          viewer={viewer}
          onClose={() => setApplying(false)}
          onDone={(a) => {
            setApplying(false);
            setMine(a);
          }}
        />
      )}
      {reporting && <ReportJob userId={viewer?.id ?? null} id={j.id} onClose={() => setReporting(false)} onDone={() => (setReporting(false), setNote("Thanks, FMD's team will review this job."))} />}
    </div>
  );
}
