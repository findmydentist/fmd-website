/**
 * Applying for jobs inside FMD: one career profile, filled once and reused for every application, and the status of
 * each application (Sent, Seen, Shortlisted, Not this time). Sample data until the backend has it. Proposed API:
 *   GET/PUT /me/career-profile · POST /jobs/{id}/applications {note} · GET /me/applications
 *   GET /jobs/{id}/applications (the employer) · PATCH /applications/{id} {status}
 * Rules: dentist roles take verified dentists only, with their council registration on the profile. An application
 * keeps a snapshot of the profile as it was sent. Only the employer (its owner and front desk, or whoever posted the
 * job) sees applicants and changes their status.
 */
import { canApplyDentistRole, canManageApplicants, type Viewer } from "../lib/viewer.ts";
import { getJob, type Job, type Space } from "./jobs.ts";
import { read, write } from "./store.ts";

export type Experience = { title: string; place: string; from: string; to: string | null };
export type ApplicantProfile = {
  userId: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  headline: string;
  qualifications: string[];
  experience: Experience[];
  skills: string[];
  languages: string[];
  cv: { name: string; size: number } | null;
  dentist?: { council: string; registration_no: string; degree: "BDS" | "MDS"; specialization?: string; years: number };
};
export type AppStatus = "sent" | "seen" | "shortlisted" | "declined";
export const STATUS_LABEL: Record<AppStatus, string> = { sent: "Sent", seen: "Seen", shortlisted: "Shortlisted", declined: "Not this time" };
export type Application = { id: string; jobId: string; userId: string; note: string; status: AppStatus; at: string; updated_at: string; snapshot: ApplicantProfile };

const profileKey = (userId: string) => `fmd-demo:career:${userId}`;
const APPS = "fmd-demo:applications";
const newId = () => `app-${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();

/** What's still missing before someone can apply in this space, in plain labels. */
export function profileGaps(p: ApplicantProfile | null, space: Space): string[] {
  const gaps: string[] = [];
  if (!p?.name.trim()) gaps.push("Name");
  if (!p?.phone.trim()) gaps.push("Phone");
  if (!p?.email.trim()) gaps.push("Email");
  if (!p?.city.trim()) gaps.push("City");
  if (!p?.qualifications.length) gaps.push("Qualifications");
  if (!p?.cv) gaps.push("CV");
  if (space === "dentist" && !(p?.dentist?.council.trim() && p.dentist.registration_no.trim())) gaps.push("Dental council registration");
  return gaps;
}

export async function getProfile(userId: string): Promise<ApplicantProfile | null> {
  return read<ApplicantProfile>(profileKey(userId));
}

export async function saveProfile(p: ApplicantProfile): Promise<ApplicantProfile> {
  const clean: ApplicantProfile = {
    ...p,
    name: p.name.trim(),
    phone: p.phone.trim(),
    email: p.email.trim().toLowerCase(),
    city: p.city.trim(),
    headline: p.headline.trim(),
    qualifications: p.qualifications.map((q) => q.trim()).filter(Boolean),
    skills: p.skills.map((s) => s.trim()).filter(Boolean),
    languages: p.languages.map((s) => s.trim()).filter(Boolean),
  };
  if (clean.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean.email)) throw new Error("Enter a valid email.");
  write(profileKey(p.userId), clean);
  return clean;
}

/* ---------------- sample applicants for the demo clinic ---------------- */

const person = (userId: string, name: string, headline: string, dentist?: ApplicantProfile["dentist"]): ApplicantProfile => ({
  userId,
  name,
  phone: "+91 90000 00000",
  email: `${userId}@example.com`,
  city: "Bengaluru",
  headline,
  qualifications: dentist ? [dentist.degree === "MDS" ? "BDS, MDS" : "BDS"] : ["Diploma in Dental Hygiene"],
  experience: [{ title: headline, place: "A clinic in Bengaluru", from: "2022-06", to: null }],
  skills: dentist ? ["Rotary endodontics", "Composite restorations"] : ["Chairside assisting", "Sterilisation"],
  languages: ["English", "Kannada", "Hindi"],
  cv: { name: `${userId}-cv.pdf`, size: 140_000 },
  ...(dentist ? { dentist } : {}),
});
function seed(): Application[] {
  const at = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  const a = (id: string, jobId: string, p: ApplicantProfile, note: string, status: AppStatus, h: number): Application => ({ id, jobId, userId: p.userId, note, status, at: at(h), updated_at: at(h), snapshot: p });
  return [
    a("app-s1", "job-assoc-smile", person("cand-meera", "Dr. Meera Nair", "General dentist, 3 years", { council: "Kerala State Dental Council", registration_no: "KL-20871", degree: "BDS", years: 3 }), "I'd love to work in a practice that takes time to explain treatment.", "sent", 5),
    a("app-s2", "job-assoc-smile", person("cand-rahul", "Dr. Rahul Varma", "Associate dentist, 5 years", { council: "Karnataka State Dental Council", registration_no: "KA-11204", degree: "BDS", years: 5 }), "Rotary endo is my strongest area. Available from next month.", "seen", 30),
    a("app-s3", "job-assoc-smile", person("cand-sana", "Dr. Sana Qureshi", "Endodontics postgraduate", { council: "Telangana State Dental Council", registration_no: "TS-30982", degree: "MDS", specialization: "Endodontics", years: 2 }), "", "shortlisted", 50),
    a("app-s4", "job-assoc-smile", person("cand-vikram", "Dr. Vikram Singh", "Recent graduate", { council: "Karnataka State Dental Council", registration_no: "KA-40117", degree: "BDS", years: 1 }), "Finished my internship in June.", "declined", 80),
    a("app-s5", "job-assist-smile", person("cand-divya", "Divya Shetty", "Dental assistant, 4 years"), "I've used FMD Clinic at my current job.", "sent", 3),
    a("app-s6", "job-assist-smile", person("cand-arun", "Arun Kumar", "Chairside assistant, 2 years"), "", "seen", 26),
  ];
}
const load = () => read<Application[]>(APPS) ?? seed();
const save = (apps: Application[]) => write(APPS, apps);

/** May this viewer act for the employer behind this job? */
function owns(viewer: Viewer, job: Job) {
  // the clinic's owner and front desk act for it; a dentist who works there only for jobs they posted themselves
  const forClinic = (viewer.kind === "clinic_owner" || viewer.kind === "clinic_staff") && !!job.employer.clinic_id && viewer.clinicId === job.employer.clinic_id;
  return canManageApplicants(viewer) && (forClinic || job.posted_by === viewer.id);
}

/** Sends the profile (as it is now) to the employer, once per job. */
export async function apply(viewer: Viewer | null, jobId: string, note: string): Promise<Application> {
  if (!viewer) throw new Error("Sign in to apply");
  const job = await getJob(viewer.id, jobId);
  if (!job) throw new Error("This job isn't listed any more.");
  if (job.space === "dentist" && !canApplyDentistRole(viewer)) throw new Error("Only verified dentists can apply to dentist roles");
  const apps = load();
  const existing = apps.find((a) => a.jobId === jobId && a.userId === viewer.id);
  if (existing) return existing;
  const profile = await getProfile(viewer.id);
  const gaps = profileGaps(profile, job.space);
  if (gaps.length) throw new Error(`Finish your profile first: ${gaps.join(", ")}`);
  const text = note.trim();
  if (text.length > 1000) throw new Error("Keep the note under 1000 characters.");
  const app: Application = { id: newId(), jobId, userId: viewer.id, note: text, status: "sent", at: now(), updated_at: now(), snapshot: profile! };
  save([...apps, app]);
  return app;
}

export async function myApplications(userId: string): Promise<(Application & { job: Job })[]> {
  const mine = load().filter((a) => a.userId === userId);
  const withJobs = await Promise.all(mine.map(async (a) => ({ ...a, job: await getJob(userId, a.jobId) })));
  return withJobs.filter((a): a is Application & { job: Job } => !!a.job).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

/** The employer's view of a job's applicants. Opening it marks new applications as seen. */
export async function applicantsFor(viewer: Viewer, jobId: string): Promise<Application[]> {
  const job = await getJob(viewer.id, jobId);
  if (!job || !owns(viewer, job)) throw new Error("Not your job");
  const apps = load();
  const touched = apps.map((a) => (a.jobId === jobId && a.status === "sent" ? { ...a, status: "seen" as const, updated_at: now() } : a));
  save(touched);
  return touched.filter((a) => a.jobId === jobId).sort((a, b) => b.at.localeCompare(a.at));
}

export async function setStatus(viewer: Viewer, applicationId: string, status: Exclude<AppStatus, "sent">): Promise<Application> {
  const apps = load();
  const app = apps.find((a) => a.id === applicationId);
  if (!app) throw new Error("This application doesn't exist any more.");
  const job = await getJob(viewer.id, app.jobId);
  if (!job || !owns(viewer, job)) throw new Error("Not your job");
  const next = { ...app, status, updated_at: now() };
  save(apps.map((a) => (a.id === applicationId ? next : a)));
  return next;
}

/** How many applications each job has, and how many are new (not yet seen). Read only: nothing is marked seen. */
export async function applicantCounts(jobIds: string[]): Promise<Record<string, { total: number; fresh: number }>> {
  const apps = load();
  return Object.fromEntries(jobIds.map((id) => {
    const mine = apps.filter((a) => a.jobId === id);
    return [id, { total: mine.length, fresh: mine.filter((a) => a.status === "sent").length }];
  }));
}
