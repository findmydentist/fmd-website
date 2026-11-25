/**
 * Jobs (plan part 7.1, PDR §4.9; redesign 2026-11): two separate spaces, Dentist roles and Clinic team roles, never
 * mixed. Clinics, dentists and dental companies post; anyone can browse; people apply inside FMD
 * (sample/applications.ts). Sample data until the backend has it. Proposed API:
 *   GET  /jobs?space&q&role&city&type&experience&salary_min&page → {items: Job[], total}
 *   GET  /jobs/{id} · POST /jobs · PATCH /jobs/{id} · POST /jobs/{id}/renew · POST /jobs/{id}/close · GET /me/jobs
 *   POST /reports {target_type: "job", target_id, category, note}
 * Rules: a listing runs 30 days and can be renewed. "Verified" appears only when FMD actually checked the employer.
 * Expired and closed listings never show in search.
 */
import { CITIES } from "../lib/catalog.ts";
import { read, write } from "./store.ts";

export type Space = "dentist" | "team";
export const DENTIST_ROLES = {
  associate: "Associate dentist",
  specialist: "Specialist (MDS)", // visiting consultants for a case are in Consultation (consults.ts)
  locum: "Locum dentist",
  educator: "Clinical educator",
} as const;
export const TEAM_ROLES = {
  intern: "Internship",
  assistant: "Dental assistant",
  hygienist: "Dental hygienist",
  front_desk: "Front desk / coordinator",
  manager: "Clinic manager",
  other: "Other roles",
} as const;
export const ROLES = { ...DENTIST_ROLES, ...TEAM_ROLES } as const;
export type Role = keyof typeof ROLES;
export const spaceOf = (role: Role): Space => (role in DENTIST_ROLES ? "dentist" : "team");
export const SPACES: Record<Space, { title: string; line: string }> = {
  dentist: { title: "Dentist roles", line: "Associates, specialists and locums. For verified dentists." },
  team: { title: "Clinic team", line: "Assistants, hygienists, front desk, interns and more." },
};

export const TYPES = { full_time: "Full time", part_time: "Part time", contract: "Contract" } as const;
export type JobType = keyof typeof TYPES;
export const EXPERIENCE = { "0": "Freshers welcome", "2": "2+ years", "5": "5+ years" } as const;
export const QUALIFICATIONS = { BDS: "BDS", MDS: "MDS", Diploma: "Diploma", Any: "Any" } as const;
export const LISTING_DAYS = 30;

export type Employer = {
  id: string;
  kind: "clinic" | "dentist" | "company";
  name: string;
  verified: boolean;
  /** Find a dentist clinic id (or FMD Clinic id for Smile Studio); null for companies and new posters */
  clinic_id: string | null;
  /** short mark shown on the logo tile */
  logo: string;
  /** media library keys */
  photos: string[];
  about: string;
  city: string;
  size?: string;
};
export type Job = {
  id: string;
  title: string;
  role: Role;
  space: Space;
  type: JobType;
  employer: Employer;
  city: string;
  area: string;
  description: string;
  day_to_day: string[];
  requirements: string[];
  benefits: string[];
  qualification: keyof typeof QUALIFICATIONS;
  specialization?: string;
  min_years: number;
  salary: { min: number; max: number } | null;
  posted_at: string;
  expires_at: string;
  status: "active" | "closed";
  /** who posted it in FMD (a user id); null for the seeded sample listings */
  posted_by: string | null;
  mine?: boolean;
  demo: true;
};
export type JobFilters = { space?: Space; q?: string; role?: string; city?: string; type?: string; experience?: string; salary_min?: number };

const day = 86_400_000;
const iso = (t: number) => new Date(t).toISOString();
const newId = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`;

const E: Record<string, Employer> = {
  kor: { id: "kor", kind: "clinic", name: "Demo Dental Studio", verified: true, clinic_id: "kor", logo: "DS", photos: ["lab-desk", "instruments", "kid-checkup", "teeth-closeup"], about: "A busy four-chair general practice in Koramangala with a strong mentoring culture.", city: "Bengaluru", size: "12 people" },
  hsr: { id: "hsr", kind: "clinic", name: "Demo Ortho Care", verified: true, clinic_id: "hsr", logo: "OC", photos: ["smile-1", "teeth-closeup", "lab-desk"], about: "Braces and clear aligners for teens and adults, with in-house scanning.", city: "Bengaluru", size: "8 people" },
  "smile-studio": { id: "smile-studio", kind: "clinic", name: "Smile Studio Dental", verified: true, clinic_id: "smile-studio", logo: "SS", photos: ["instruments", "lab-desk", "implant-surgery", "smile-2"], about: "Four chairs, one calm team in Indiranagar. Same-day appointments on Saturdays; FMD Clinic runs our day.", city: "Bengaluru", size: "15 people" },
  bnd: { id: "bnd", kind: "clinic", name: "Demo Seaside Dental", verified: true, clinic_id: "bnd", logo: "SD", photos: ["family-smile", "lab-desk", "smile-3"], about: "A family practice by the sea in Bandra West, open seven days.", city: "Mumbai", size: "10 people" },
  bjh: { id: "bjh", kind: "clinic", name: "Demo Pearl Dental", verified: true, clinic_id: "bjh", logo: "PD", photos: ["smile-4", "instruments", "teeth-closeup"], about: "Family dentistry and cosmetic care in Banjara Hills since 2009.", city: "Hyderabad", size: "14 people" },
  skt: { id: "skt", kind: "clinic", name: "Demo Capital Dental", verified: true, clinic_id: "skt", logo: "CD", photos: ["implant-surgery", "lab-desk", "family-smile", "xray-implant"], about: "Multi-speciality dental care in South Delhi, with an implant suite and CBCT.", city: "Delhi NCR", size: "22 people" },
  ady: { id: "ady", kind: "clinic", name: "Demo Adyar Smiles", verified: false, clinic_id: null, logo: "AS", photos: ["kid-checkup", "toothbrush", "lab-desk"], about: "A neighbourhood clinic in Adyar that trains new graduates every year.", city: "Chennai", size: "6 people" },
  aligner: { id: "aligner", kind: "company", name: "Demo Aligner Brand", verified: false, clinic_id: null, logo: "AB", photos: ["students-group", "smile-1", "teeth-closeup"], about: "Clear aligner treatment planning and training for clinics across India.", city: "Pune", size: "120 people" },
  "kavya-reddy": { id: "kavya-reddy", kind: "dentist", name: "Dr. Kavya Reddy", verified: true, clinic_id: null, logo: "KR", photos: ["smile-2", "teeth-closeup"], about: "A cosmetic practice run by Dr. Kavya Reddy: whitening, bonding and veneers.", city: "Hyderabad" },
};

function seed(now: number): Job[] {
  const j = (x: Omit<Job, "posted_at" | "expires_at" | "status" | "demo" | "space" | "posted_by" | "benefits"> & { ago: number; benefits?: string[] }): Job => {
    const { ago, ...rest } = x;
    return { benefits: [], ...rest, space: spaceOf(x.role), posted_by: null, posted_at: iso(now - ago * day), expires_at: iso(now - ago * day + LISTING_DAYS * day), status: "active", demo: true };
  };
  return [
    /* ---- dentist roles ---- */
    j({ id: "job-assoc-kor", title: "Associate dentist, general practice", role: "associate", type: "full_time", employer: E.kor!, city: "Bengaluru", area: "Koramangala", qualification: "BDS", min_years: 2, salary: { min: 45000, max: 70000 }, ago: 3,
      description: "Join a busy four-chair practice. You'll see your own patients for check-ups, fillings and root canals, with a senior dentist on hand.",
      day_to_day: ["Your own list of 10–14 patients a day", "Rotary endodontics with a senior to review cases", "Monthly case discussions with the team"],
      requirements: ["BDS, registered with a state dental council", "Comfortable with rotary endodontics", "Kannada or Hindi helpful"], benefits: ["Paid CDE courses", "Incentive on treatment completed", "Sundays off"] }),
    j({ id: "job-ortho-hsr", title: "Consultant orthodontist, 2 days a week", role: "specialist", type: "part_time", employer: E.hsr!, city: "Bengaluru", area: "HSR Layout", qualification: "MDS", specialization: "Orthodontics", min_years: 5, salary: null, ago: 6,
      description: "Take on our braces and aligner cases on Tuesdays and Saturdays, with an intraoral scanner and a dedicated assistant.",
      day_to_day: ["New consultations and treatment plans", "Aligner case set-ups on the planning software", "Reviews and wire changes"],
      requirements: ["MDS (Orthodontics)", "Aligner certification preferred"], benefits: ["Per-case fee plus a fixed day rate", "Your own assistant on clinic days"] }),
    j({ id: "job-assoc-smile", title: "Associate dentist", role: "associate", type: "full_time", employer: E["smile-studio"]!, city: "Bengaluru", area: "Indiranagar", qualification: "BDS", min_years: 1, salary: { min: 50000, max: 75000 }, ago: 1,
      description: "A calm, well-run practice looking for a dentist who explains things well. Everything runs on FMD Clinic, so your notes, charts and bills are in one place.",
      day_to_day: ["General dentistry for families and working professionals", "Clear treatment plans that patients actually understand", "Saturday walk-in clinic once a month"],
      requirements: ["BDS, registered", "1+ year in practice or a strong internship", "Good with anxious patients"], benefits: ["Fixed salary plus incentive", "Paid CDE every year", "Lunch at the clinic"] }),
    j({ id: "job-implant-smile", title: "Visiting implantologist", role: "specialist", type: "contract", employer: E["smile-studio"]!, city: "Bengaluru", area: "Indiranagar", qualification: "MDS", specialization: "Implantology or periodontics", min_years: 4, salary: null, ago: 5,
      description: "We plan implants in-house and want a visiting specialist two Thursdays a month.",
      day_to_day: ["Surgical placement with our assistant", "Planning reviews on CBCT", "Follow-up reviews"],
      requirements: ["MDS (Periodontics, Prosthodontics or Oral Surgery) or a recognised implant fellowship", "Own surgical kit preferred"] }),
    j({ id: "job-locum-skt", title: "Locum dentist, weekends", role: "locum", type: "contract", employer: E.skt!, city: "Delhi NCR", area: "Saket", qualification: "BDS", min_years: 2, salary: { min: 4000, max: 5000 }, ago: 12,
      description: "Cover Saturday and Sunday clinics for three months while our associate is on leave.",
      day_to_day: ["General dentistry and emergencies", "Handing over cleanly to the weekday team"],
      requirements: ["BDS, registered", "Own transport"] }),
    j({ id: "job-endo-bjh", title: "Consultant endodontist", role: "specialist", type: "part_time", employer: E.bjh!, city: "Hyderabad", area: "Banjara Hills", qualification: "MDS", specialization: "Endodontics", min_years: 3, salary: null, ago: 2,
      description: "Microscope-assisted root canal treatment, three mornings a week.",
      day_to_day: ["Referred endodontic cases from our general dentists", "Retreatments under the microscope"],
      requirements: ["MDS (Conservative Dentistry and Endodontics)", "Microscope experience"], benefits: ["Fixed fee per case", "Flexible mornings"] }),
    j({ id: "job-assoc-bnd", title: "Associate dentist, family practice", role: "associate", type: "full_time", employer: E.bnd!, city: "Mumbai", area: "Bandra West", qualification: "BDS", min_years: 2, salary: { min: 55000, max: 80000 }, ago: 4,
      description: "Children to grandparents: a varied list in a practice that has served Bandra for twenty years.",
      day_to_day: ["Check-ups, fillings and extractions", "Paediatric patients two afternoons a week"],
      requirements: ["BDS, registered", "Marathi or Hindi"] }),
    j({ id: "job-educator-aligner", title: "Clinical educator, clear aligners", role: "educator", type: "full_time", employer: E.aligner!, city: "Pune", area: "Koregaon Park", qualification: "BDS", min_years: 2, salary: { min: 60000, max: 90000 }, ago: 9,
      description: "Train clinics on aligner planning software and case selection. Travel across Maharashtra.",
      day_to_day: ["Hands-on workshops at partner clinics", "Reviewing case set-ups with dentists", "Building training material"],
      requirements: ["BDS or MDS, registered", "Good presentation skills"], benefits: ["Travel allowance", "Health insurance"] }),
    j({ id: "job-cosmetic-kavya", title: "Associate, cosmetic dentistry", role: "associate", type: "full_time", employer: E["kavya-reddy"]!, city: "Hyderabad", area: "Jubilee Hills", qualification: "BDS", min_years: 3, salary: { min: 60000, max: 90000 }, ago: 7,
      description: "Work alongside me on whitening, bonding and veneer cases. I'll train you in my approach to natural-looking smiles.",
      day_to_day: ["Smile design consultations", "Composite bonding and whitening", "Photography for every case"],
      requirements: ["BDS, registered", "An eye for detail and a portfolio of composite work"] }),
    j({ id: "job-expired", title: "Associate dentist (old listing)", role: "associate", type: "full_time", employer: E.kor!, city: "Bengaluru", area: "Whitefield", qualification: "BDS", min_years: 0, salary: null, ago: 45,
      description: "Expired.", day_to_day: ["-", "-"], requirements: [] }),
    /* ---- clinic team ---- */
    j({ id: "job-assist-kor", title: "Dental assistant", role: "assistant", type: "full_time", employer: E.kor!, city: "Bengaluru", area: "Koramangala", qualification: "Diploma", min_years: 0, salary: { min: 18000, max: 25000 }, ago: 1,
      description: "Chairside assistance for general and surgical work, instrument care and sterilisation.",
      day_to_day: ["Preparing the room and instruments", "Assisting chairside", "Sterilisation logs"],
      requirements: ["Diploma in dental mechanics or hygiene, or chairside experience", "Willing to learn surgical assisting"] }),
    j({ id: "job-hyg-bnd", title: "Dental hygienist", role: "hygienist", type: "full_time", employer: E.bnd!, city: "Mumbai", area: "Bandra West", qualification: "Diploma", min_years: 2, salary: { min: 25000, max: 35000 }, ago: 8,
      description: "Scaling, polishing and patient education for a family practice.",
      day_to_day: ["Hygiene appointments", "Teaching brushing and flossing", "Recall reminders"],
      requirements: ["Diploma in Dental Hygiene", "Marathi or Hindi"] }),
    j({ id: "job-desk-bjh", title: "Front desk coordinator", role: "front_desk", type: "full_time", employer: E.bjh!, city: "Hyderabad", area: "Banjara Hills", qualification: "Any", min_years: 0, salary: { min: 20000, max: 26000 }, ago: 4,
      description: "Greet patients, manage the calendar and explain estimates clearly.",
      day_to_day: ["Welcoming patients", "Booking and reminders", "Bills and payments"],
      requirements: ["Good English and Telugu", "Calm with anxious patients"] }),
    j({ id: "job-intern-ady", title: "Internship for BDS graduates", role: "intern", type: "full_time", employer: E.ady!, city: "Chennai", area: "Adyar", qualification: "BDS", min_years: 0, salary: { min: 10000, max: 12000 }, ago: 2,
      description: "Six months of supervised practice across general dentistry.",
      day_to_day: ["Supervised patient care", "Weekly case presentations"],
      requirements: ["BDS completed or in internship year", "Tamil helpful"] }),
    j({ id: "job-assist-smile", title: "Chairside assistant", role: "assistant", type: "full_time", employer: E["smile-studio"]!, city: "Bengaluru", area: "Indiranagar", qualification: "Diploma", min_years: 1, salary: { min: 20000, max: 28000 }, ago: 2,
      description: "Assist our dentists and keep the rooms running smoothly. We'll train you on FMD Clinic.",
      day_to_day: ["Chairside assisting", "Sterilisation", "Stock checks"],
      requirements: ["Chairside experience", "Kannada or Hindi"], benefits: ["Uniforms provided", "Annual bonus"] }),
    j({ id: "job-desk-smile", title: "Patient coordinator", role: "front_desk", type: "full_time", employer: E["smile-studio"]!, city: "Bengaluru", area: "Indiranagar", qualification: "Any", min_years: 1, salary: { min: 22000, max: 30000 }, ago: 6,
      description: "Be the first person patients meet, on the phone and at the desk.",
      day_to_day: ["Calls and WhatsApp", "Calendar on FMD Clinic", "Explaining estimates"],
      requirements: ["Clear English and Kannada", "A year at a front desk"] }),
    j({ id: "job-manager-skt", title: "Clinic manager", role: "manager", type: "full_time", employer: E.skt!, city: "Delhi NCR", area: "Saket", qualification: "Any", min_years: 5, salary: { min: 45000, max: 65000 }, ago: 10,
      description: "Run day-to-day operations for a 22-person multi-speciality clinic.",
      day_to_day: ["Rosters and stock", "Patient experience", "Monthly reports for the owners"],
      requirements: ["5+ years running a clinic or hospital department"] }),
    j({ id: "job-hyg-hsr", title: "Hygienist, part time", role: "hygienist", type: "part_time", employer: E.hsr!, city: "Bengaluru", area: "HSR Layout", qualification: "Diploma", min_years: 1, salary: { min: 15000, max: 20000 }, ago: 5,
      description: "Three days a week of hygiene appointments for our orthodontic patients.",
      day_to_day: ["Cleaning around braces", "Oral hygiene coaching"],
      requirements: ["Diploma in Dental Hygiene"] }),
    j({ id: "job-sales-aligner", title: "Clinic partnerships coordinator", role: "other", type: "full_time", employer: E.aligner!, city: "Pune", area: "Koregaon Park", qualification: "Any", min_years: 2, salary: { min: 35000, max: 50000 }, ago: 3,
      description: "Look after our partner clinics in Pune and Mumbai.",
      day_to_day: ["Visiting clinics", "Coordinating training days"],
      requirements: ["2+ years in healthcare sales or support"] }),
  ];
}

const mineKey = (userId: string) => `fmd-demo:jobs:${userId}`;
const allPostedKey = "fmd-demo:jobs:all-posted";
const reportsKey = (userId: string) => `fmd-demo:job-reports:${userId}`;
const live = (j: Job, now: number) => j.status === "active" && Date.parse(j.expires_at) > now;
export const jobState = (j: Job, now = Date.now()) => (j.status === "closed" ? "closed" : Date.parse(j.expires_at) <= now ? "expired" : "active");

/** Posted listings are visible to everyone browsing in this browser, not only to the poster. */
/** Listings saved by an older version of the demo (no space, old apply field) are skipped, never a crash. */
const current = (js: Job[] | null) => (js ?? []).filter((j) => j && typeof j === "object" && "space" in j && "employer" in j && Array.isArray(j.employer?.photos));

function everything(userId: string | null, now: number) {
  const posted = current(read<Job[]>(allPostedKey));
  const mine = userId ? new Set(current(read<Job[]>(mineKey(userId))).map((j) => j.id)) : new Set<string>();
  return [...posted.map((j) => (mine.has(j.id) ? { ...j, mine: true } : j)), ...seed(now)];
}

export async function searchJobs(userId: string | null, f: JobFilters, now = Date.now()) {
  const q = (f.q ?? "").trim().toLowerCase();
  const items = everything(userId, now)
    .filter((j) => live(j, now))
    .filter(
      (j) =>
        (!f.space || j.space === f.space) &&
        (!q || [j.title, j.employer.name, j.area, j.city, j.description, j.specialization ?? ""].some((x) => x.toLowerCase().includes(q))) &&
        (!f.role || j.role === f.role) &&
        (!f.city || j.city === f.city) &&
        (!f.type || j.type === f.type) &&
        (f.experience === undefined || f.experience === "" || j.min_years <= Number(f.experience)) &&
        (!f.salary_min || (j.salary && j.salary.max >= f.salary_min)),
    )
    .sort((a, b) => b.posted_at.localeCompare(a.posted_at));
  return { items, total: items.length };
}

/** How many open listings each space has. */
export async function spaceCounts(now = Date.now()): Promise<Record<Space, number>> {
  const open = everything(null, now).filter((j) => live(j, now));
  return { dentist: open.filter((j) => j.space === "dentist").length, team: open.filter((j) => j.space === "team").length };
}

/** An expired or closed listing still opens from a saved link, but says it's no longer open. */
export async function getJob(userId: string | null, id: string, now = Date.now()) {
  return everything(userId, now).find((j) => j.id === id) ?? null;
}

export async function cardsForJobs(userId: string, ids: string[], now = Date.now()) {
  const all = everything(userId, now);
  return ids.flatMap((id) => all.filter((j) => j.id === id));
}

/** The sample employers, for "featured employers" on the Jobs landing page. */
export const employerById = (id: string): Employer | undefined => E[id];
export const FEATURED_EMPLOYERS: Employer[] = [E["smile-studio"]!, E.skt!, E.bjh!, E.bnd!, E.kor!, E.aligner!];

/* ---------------- posting ---------------- */

export type JobInput = Pick<Job, "title" | "role" | "type" | "city" | "area" | "description" | "min_years" | "salary" | "qualification"> & {
  employer: string;
  requirements: string;
  day_to_day?: string;
  benefits?: string;
  specialization?: string;
};
export type Poster = { kind: Employer["kind"]; clinicId: string | null };

export function checkJob(i: JobInput): string | null {
  if (i.title.trim().length < 5) return "Give the job a title of at least 5 characters.";
  if (!i.employer.trim()) return "Enter the clinic or company name.";
  if (!(CITIES as readonly string[]).includes(i.city)) return "Choose a city.";
  if (i.description.trim().length < 20) return "Describe the job in at least 20 characters.";
  if (i.salary && (i.salary.min < 0 || i.salary.max < i.salary.min)) return "Enter the salary range lowest first, or leave it empty.";
  if (!(i.role in ROLES)) return "Choose a role.";
  return null;
}

export async function myJobs(userId: string): Promise<Job[]> {
  return current(read<Job[]>(mineKey(userId))).map((j) => ({ ...j, mine: true }));
}

/** Every listing of a clinic, open or not, including ones its people posted in FMD (for the owner and front desk). */
export async function clinicJobs(clinicId: string, now = Date.now()): Promise<Job[]> {
  return everything(null, now).filter((j) => j.employer.clinic_id === clinicId);
}

const lines = (s?: string) => (s ?? "").split("\n").map((r) => r.trim()).filter(Boolean);
const initials = (name: string) =>
  name
    .replace(/^(Dr\.?|Demo)\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export async function postJob(userId: string, i: JobInput, editId: string | null, now = Date.now(), as: Poster = { kind: "clinic", clinicId: null }): Promise<Job> {
  const bad = checkJob(i);
  if (bad) throw new Error(bad);
  const all = await myJobs(userId);
  const old = editId ? all.find((j) => j.id === editId) : undefined;
  if (editId && !old) throw new Error("You can only edit your own postings.");
  const job: Job = {
    id: old?.id ?? newId("job"),
    title: i.title.trim(),
    role: i.role,
    space: spaceOf(i.role),
    type: i.type,
    // FMD hasn't checked an employer just because someone typed its name
    employer: { id: as.clinicId ?? userId, kind: as.kind, name: i.employer.trim(), verified: false, clinic_id: as.clinicId, logo: initials(i.employer.trim()) || "FM", photos: [], about: "", city: i.city },
    city: i.city,
    area: i.area.trim(),
    description: i.description.trim(),
    day_to_day: lines(i.day_to_day),
    requirements: lines(i.requirements),
    benefits: lines(i.benefits),
    qualification: i.qualification,
    ...(i.specialization?.trim() ? { specialization: i.specialization.trim() } : {}),
    min_years: i.min_years,
    salary: i.salary,
    posted_at: old?.posted_at ?? iso(now),
    expires_at: old?.expires_at ?? iso(now + LISTING_DAYS * day),
    status: "active",
    posted_by: userId,
    demo: true,
  };
  write(mineKey(userId), [...all.filter((j) => j.id !== job.id), job]);
  write(allPostedKey, [...(read<Job[]>(allPostedKey) ?? []).filter((j) => j.id !== job.id), job]);
  return { ...job, mine: true };
}

async function update(userId: string, id: string, patch: (j: Job) => Job) {
  write(mineKey(userId), (await myJobs(userId)).map((j) => (j.id === id ? patch(j) : j)));
  write(allPostedKey, (read<Job[]>(allPostedKey) ?? []).map((j) => (j.id === id && j.posted_by === userId ? patch(j) : j)));
}
/** Another 30 days from today, and open again if it had expired. */
export async function renewJob(userId: string, id: string, now = Date.now()) {
  await update(userId, id, (j) => ({ ...j, status: "active", expires_at: iso(now + LISTING_DAYS * day) }));
}
export async function closeJob(userId: string, id: string) {
  await update(userId, id, (j) => ({ ...j, status: "closed" }));
}

/* ---------------- reports ---------------- */

export const JOB_REPORTS = {
  fake: "Looks fake or a scam",
  fees: "Asks applicants to pay",
  misleading: "Misleading pay or details",
  discrimination: "Discriminatory",
  expired: "Job is already filled",
  other: "Something else",
} as const;

export async function reportJob(userId: string | null, id: string, reason: keyof typeof JOB_REPORTS | "", note: string) {
  if (!userId) throw new Error("Log in to report a job.");
  if (!reason) throw new Error("Choose what's wrong.");
  if (reason === "other" && !note.trim()) throw new Error("Tell us what's wrong.");
  const all = read<string[]>(reportsKey(userId)) ?? [];
  if (all.includes(id)) throw new Error("You've already reported this job. FMD's team is reviewing it.");
  write(reportsKey(userId), [...all, id]);
}
