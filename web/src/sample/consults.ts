/**
 * Jobs › Consultation: hiring a specialist for a case, not for a job. Dentist roles are monthly or permanent hires;
 * this is the visiting consultant of Indian dental practice. A general clinic gathers cases that need a specialist (an
 * impacted wisdom tooth, a retreatment, implants, a braces consultation day) and calls an MDS consultant in for a
 * visit. The consultant is paid per case, per visit or a share of the treatment fee, often brings their own kit, and
 * the patient stays the clinic's.
 *
 * Clinics post cases; verified dentists list themselves as consultants. Either side asks; when the other agrees, the
 * visit is an appointment on both sides, tagged "Hired consultant" (the consultant's profile, the clinic's calendar).
 * Sample data until the backend has it. Proposed API:
 *   GET /consult/cases?specialty&city · POST /consult/cases · GET /consult/consultants?specialty&city · PUT /me/consultant
 *   POST /consult/requests {case_id | consultant_id, procedure, date, start, minutes, note}
 *   POST /consult/requests/{id}/accept · POST /consult/requests/{id}/decline · GET /me/consult
 * Rules: only verified dentists list themselves or offer to take a case; only clinics post cases or ask a consultant.
 * A case never carries the patient's name or anything else that identifies them.
 */
import type { Viewer } from "../lib/viewer.ts";
import { read, write } from "./store.ts";

export const SPECIALTIES = {
  oral_surgery: "Oral surgery",
  endodontics: "Endodontics",
  implants: "Implants",
  orthodontics: "Orthodontics",
  periodontics: "Periodontics",
  prosthodontics: "Prosthodontics",
  pedodontics: "Paediatric dentistry",
} as const;
export type Specialty = keyof typeof SPECIALTIES;
export const PAY_BASIS = { per_case: "per case", per_visit: "per visit", share: "of the treatment fee" } as const;
export type Pay = { basis: keyof typeof PAY_BASIS; amount: number };
export type ClinicRef = { id: string; name: string; city: string };

export type ConsultCase = {
  id: string;
  clinic: ClinicRef;
  area: string;
  specialty: Specialty;
  /** what needs doing, never who: "Impacted lower wisdom tooth removal" */
  procedure: string;
  cases: number;
  /** when the clinic can host the visit, in its own words */
  when: string;
  pay: Pay;
  provides: string[];
  bring: string[];
  note: string;
  posted_at: string;
  status: "open" | "filled";
  /** demo only: a sample clinic nobody signs in as, so it agrees at once */
  auto?: true;
};
export type Consultant = {
  /** the dentist's user id (or a sample dentist's id) */
  id: string;
  name: string;
  specialty: Specialty;
  qualification: string;
  years: number;
  procedures: string[];
  cities: string[];
  /** when they usually take visits, in their own words */
  days: string;
  pay: Pay;
  bio: string;
  /** demo only: a sample consultant nobody signs in as, so they agree at once */
  auto?: true;
};
export type RequestStatus = "pending" | "accepted" | "declined";
export type ConsultRequest = {
  id: string;
  /** who asked: the clinic asked a consultant, or a consultant offered to take a case */
  from: "clinic" | "consultant";
  clinic: ClinicRef;
  consultant: Pick<Consultant, "id" | "name" | "specialty">;
  case_id: string | null;
  procedure: string;
  /** the visit: YYYY-MM-DD and HH:MM, India time */
  date: string;
  start: string;
  minutes: number;
  pay: Pay;
  note: string;
  status: RequestStatus;
  at: string;
};

const KEY = "fmd-demo:consult";
type Store = { cases: ConsultCase[]; consultants: Consultant[]; requests: ConsultRequest[] };
const day = 86_400_000;
const newId = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`;
/** today in India, YYYY-MM-DD */
const today = (now: number) => new Date(now + 5.5 * 3_600_000).toISOString().slice(0, 10);

export const payText = (p: Pay) =>
  p.basis === "share" ? `${p.amount}% ${PAY_BASIS.share}` : `₹${p.amount.toLocaleString("en-IN")} ${PAY_BASIS[p.basis]}`;

const C = {
  smile: { id: "smile-studio", name: "Smile Studio Dental", city: "Bengaluru" },
  kor: { id: "kor", name: "Demo Dental Studio", city: "Bengaluru" },
  bjh: { id: "bjh", name: "Demo Pearl Dental", city: "Hyderabad" },
  skt: { id: "skt", name: "Demo Capital Dental", city: "Delhi NCR" },
  bnd: { id: "bnd", name: "Demo Seaside Dental", city: "Mumbai" },
} satisfies Record<string, ClinicRef>;

function seed(now: number): Store {
  const at = (d: number) => new Date(now - d * day).toISOString();
  const kase = (x: Omit<ConsultCase, "status" | "posted_at" | "note"> & { ago: number; note?: string }): ConsultCase => {
    const { ago, ...rest } = x;
    return { note: "", ...rest, posted_at: at(ago), status: "open" };
  };
  const doc = (x: Omit<Consultant, "auto">): Consultant => ({ ...x, auto: true });
  return {
    // Smile Studio is the demo owner's clinic, so its case waits for them to answer; the rest agree at once
    cases: [
      kase({ id: "cc-smile-38", clinic: C.smile, area: "Indiranagar", specialty: "oral_surgery", procedure: "Impacted lower wisdom tooth removal", cases: 2, when: "Friday or Saturday morning", pay: { basis: "per_case", amount: 6000 },
        provides: ["Chair and assistant", "OPG and CBCT on site", "Sterilised surgical tray"], bring: ["Your own elevators and surgical kit"], note: "Both patients are healthy adults; X-rays shared once you agree.", ago: 1 }),
      kase({ id: "cc-kor-retx", clinic: C.kor, area: "Koramangala", specialty: "endodontics", procedure: "Root canal retreatment, lower molar", cases: 1, when: "Any weekday after 4 pm", pay: { basis: "per_case", amount: 4500 },
        provides: ["Chair, assistant and rotary motor", "Apex locator"], bring: ["Microscope or loupes"], ago: 2, auto: true }),
      kase({ id: "cc-bjh-implant", clinic: C.bjh, area: "Banjara Hills", specialty: "implants", procedure: "Two single-tooth implants, upper premolars", cases: 2, when: "Second Thursday of the month", pay: { basis: "share", amount: 40 },
        provides: ["CBCT and planning software", "Implant motor", "Assistant"], bring: ["Implant kit and implants of your system"], ago: 3, auto: true }),
      kase({ id: "cc-bnd-ortho", clinic: C.bnd, area: "Bandra West", specialty: "orthodontics", procedure: "Braces consultation day, five new patients", cases: 5, when: "One Saturday a month", pay: { basis: "per_visit", amount: 10000 },
        provides: ["Chair, assistant and photography set-up"], bring: ["Your own records forms if you prefer them"], ago: 4, auto: true }),
      kase({ id: "cc-skt-pedo", clinic: C.skt, area: "Saket", specialty: "pedodontics", procedure: "Full-mouth treatment for an anxious six-year-old", cases: 1, when: "Weekend morning", pay: { basis: "per_visit", amount: 8000 },
        provides: ["Chair, assistant and a kids' room"], bring: ["Nothing special"], ago: 5, auto: true }),
    ],
    consultants: [
      doc({ id: "vikram-rao", name: "Dr. Vikram Rao", specialty: "oral_surgery", qualification: "MDS (Oral and Maxillofacial Surgery)", years: 11, procedures: ["Impacted wisdom teeth", "Surgical extractions", "Bone grafts", "Biopsies"], cities: ["Bengaluru"], days: "Fridays and Saturdays", pay: { basis: "per_case", amount: 5500 },
        bio: "Visiting oral surgeon for twelve clinics across South and East Bengaluru. I bring my own kit." }),
      doc({ id: "leena-thomas", name: "Dr. Leena Thomas", specialty: "endodontics", qualification: "MDS (Conservative Dentistry and Endodontics)", years: 8, procedures: ["Retreatments", "Calcified canals", "Microscope root canals"], cities: ["Bengaluru"], days: "Weekday evenings", pay: { basis: "per_case", amount: 4000 },
        bio: "Microscope endodontics, with my own portable microscope." }),
      doc({ id: "rohan-mehta", name: "Dr. Rohan Mehta", specialty: "orthodontics", qualification: "MDS (Orthodontics)", years: 12, procedures: ["Braces", "Clear aligners", "Consultation days"], cities: ["Mumbai", "Pune"], days: "Saturdays", pay: { basis: "share", amount: 50 },
        bio: "I see new braces and aligner patients at partner clinics, then follow them up monthly." }),
      doc({ id: "sneha-iyer", name: "Dr. Sneha Iyer", specialty: "implants", qualification: "MDS (Periodontics), implant fellowship", years: 10, procedures: ["Single implants", "Sinus lifts", "Full-arch planning"], cities: ["Chennai", "Bengaluru"], days: "Thursdays", pay: { basis: "share", amount: 40 },
        bio: "Implants planned on CBCT and placed at your clinic; I bring the surgical kit." }),
      doc({ id: "meenakshi-pillai", name: "Dr. Meenakshi Pillai", specialty: "periodontics", qualification: "MDS (Periodontics)", years: 9, procedures: ["Flap surgery", "Gum grafts", "Crown lengthening"], cities: ["Kochi"], days: "Wednesdays", pay: { basis: "per_case", amount: 5000 },
        bio: "Gum surgery at your clinic, with clear notes for your follow-up." }),
      doc({ id: "farah-khan", name: "Dr. Farah Khan", specialty: "pedodontics", qualification: "MDS (Pedodontics)", years: 7, procedures: ["Anxious children", "Full-mouth rehabilitation", "Pulpotomies"], cities: ["Hyderabad"], days: "Weekend mornings", pay: { basis: "per_visit", amount: 7000 },
        bio: "Calm visits for children who find the dentist hard." }),
    ],
    requests: [],
  };
}

function load(now = Date.now()): Store {
  return read<Store>(KEY) ?? seed(now);
}
const save = (s: Store) => write(KEY, s);

/** Who can do what in Consultation */
export const canConsult = (v: Viewer | null | undefined) => v?.verifiedDentist === true;
export const canHire = (v: Viewer | null | undefined) => !!v?.clinicId && (v.kind === "clinic_owner" || v.kind === "clinic_staff");

/* ---------------- browsing ---------------- */

export type ConsultFilters = { specialty?: string; city?: string };
const fits = (f: ConsultFilters, specialty: Specialty, cities: string[]) => (!f.specialty || f.specialty === specialty) && (!f.city || cities.includes(f.city));

export async function listCases(f: ConsultFilters = {}, now = Date.now()): Promise<ConsultCase[]> {
  return load(now)
    .cases.filter((c) => c.status === "open" && fits(f, c.specialty, [c.clinic.city]))
    .sort((a, b) => b.posted_at.localeCompare(a.posted_at));
}

export async function listConsultants(f: ConsultFilters = {}, now = Date.now()): Promise<Consultant[]> {
  return load(now).consultants.filter((c) => fits(f, c.specialty, c.cities));
}

export async function openCaseCount(now = Date.now()) {
  return load(now).cases.filter((c) => c.status === "open").length;
}

export async function myListing(userId: string): Promise<Consultant | null> {
  return load().consultants.find((c) => c.id === userId) ?? null;
}

/* ---------------- listing and posting ---------------- */

export type ListingInput = Omit<Consultant, "id" | "name" | "auto">;

export async function saveListing(v: Viewer | null, i: ListingInput): Promise<Consultant> {
  if (!v || !canConsult(v)) throw new Error("Only dentists verified by FMD can list themselves as consultants.");
  if (!i.qualification.trim()) throw new Error("Add your qualification.");
  if (!i.procedures.length) throw new Error("Add at least one procedure you take on.");
  if (!i.cities.length) throw new Error("Choose at least one city you visit.");
  if (!(i.pay.amount > 0) || (i.pay.basis === "share" && i.pay.amount > 100)) throw new Error("Check your fee.");
  const s = load();
  const c: Consultant = { ...i, id: v.id, name: v.name, qualification: i.qualification.trim(), days: i.days.trim(), bio: i.bio.trim() };
  save({ ...s, consultants: [c, ...s.consultants.filter((x) => x.id !== v.id)] });
  return c;
}

export type CaseInput = Pick<ConsultCase, "area" | "specialty" | "procedure" | "cases" | "when" | "pay" | "provides" | "bring" | "note">;

export async function postCase(v: Viewer | null, clinic: ClinicRef, i: CaseInput, now = Date.now()): Promise<ConsultCase> {
  if (!v || !canHire(v) || v.clinicId !== clinic.id) throw new Error("Only a clinic's own team can post its cases.");
  if (!i.procedure.trim()) throw new Error("Say what needs doing.");
  if (!(i.cases >= 1)) throw new Error("How many cases?");
  if (!(i.pay.amount > 0) || (i.pay.basis === "share" && i.pay.amount > 100)) throw new Error("Check the fee.");
  const s = load(now);
  const c: ConsultCase = { ...i, id: newId("cc"), clinic, procedure: i.procedure.trim(), when: i.when.trim(), note: i.note.trim(), posted_at: new Date(now).toISOString(), status: "open" };
  save({ ...s, cases: [c, ...s.cases] });
  return c;
}

/* ---------------- asking and agreeing ---------------- */

export type VisitInput = { date: string; start: string; minutes: number; note: string };

function checkVisit(i: VisitInput, now: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.date) || i.date < today(now)) throw new Error("Pick a date that hasn't passed.");
  if (!/^\d{2}:\d{2}$/.test(i.start)) throw new Error("Pick a time.");
  if (!(i.minutes >= 15)) throw new Error("How long will it take?");
}

/** A listed, verified consultant offers to take a clinic's open case. Sample clinics agree at once. */
export async function offerToTake(v: Viewer | null, caseId: string, i: VisitInput, now = Date.now()): Promise<ConsultRequest> {
  if (!v || !canConsult(v)) throw new Error("Only dentists verified by FMD can take consultation cases.");
  checkVisit(i, now);
  const s = load(now);
  const me = s.consultants.find((c) => c.id === v.id);
  if (!me) throw new Error("List yourself as a consultant first, so the clinic can see who you are.");
  const c = s.cases.find((x) => x.id === caseId && x.status === "open");
  if (!c) throw new Error("This case has already been taken.");
  if (s.requests.some((r) => r.case_id === caseId && r.consultant.id === v.id && r.status === "pending")) throw new Error("You've already offered to take this case.");
  const r: ConsultRequest = {
    id: newId("cr"), from: "consultant", clinic: c.clinic, consultant: { id: me.id, name: me.name, specialty: me.specialty }, case_id: c.id,
    procedure: c.procedure, date: i.date, start: i.start, minutes: i.minutes, note: i.note.trim(), pay: c.pay, status: "pending", at: new Date(now).toISOString(),
  };
  save({ ...s, requests: [r, ...s.requests] });
  return c.auto ? answer(null, r.id, true, now) : r;
}

/** A clinic asks a listed consultant for a visit. Sample consultants agree at once. */
export async function askConsultant(v: Viewer | null, clinic: ClinicRef, consultantId: string, i: VisitInput & { procedure: string }, now = Date.now()): Promise<ConsultRequest> {
  if (!v || !canHire(v) || v.clinicId !== clinic.id) throw new Error("Only a clinic's team can ask a consultant to visit.");
  if (!i.procedure.trim()) throw new Error("Say what the visit is for.");
  checkVisit(i, now);
  const s = load(now);
  const doc = s.consultants.find((c) => c.id === consultantId);
  if (!doc) throw new Error("This consultant isn't listed any more.");
  const r: ConsultRequest = {
    id: newId("cr"), from: "clinic", clinic, consultant: { id: doc.id, name: doc.name, specialty: doc.specialty }, case_id: null,
    procedure: i.procedure.trim(), date: i.date, start: i.start, minutes: i.minutes, note: i.note.trim(), pay: doc.pay, status: "pending", at: new Date(now).toISOString(),
  };
  save({ ...s, requests: [r, ...s.requests] });
  return doc.auto ? answer(null, r.id, true, now) : r;
}

/** The side that was asked agrees or says no. Agreeing to an offer fills the case and turns down the other offers. */
export async function answer(v: Viewer | null, requestId: string, accept: boolean, now = Date.now()): Promise<ConsultRequest> {
  const s = load(now);
  const r = s.requests.find((x) => x.id === requestId);
  if (!r || r.status !== "pending") throw new Error("This request has already been answered.");
  const kase = r.case_id ? s.cases.find((c) => c.id === r.case_id) : undefined;
  const auto = r.from === "consultant" ? kase?.auto : s.consultants.find((c) => c.id === r.consultant.id)?.auto;
  const mine = r.from === "clinic" ? v?.id === r.consultant.id : canHire(v) && v?.clinicId === r.clinic.id;
  if (!auto && !mine) throw new Error("Only the one who was asked can answer.");
  const done: ConsultRequest = { ...r, status: accept ? "accepted" : "declined" };
  const filled = accept && kase ? kase.id : null;
  save({
    ...s,
    cases: s.cases.map((c) => (c.id === filled ? { ...c, status: "filled" } : c)),
    requests: s.requests.map((x) => (x.id === r.id ? done : filled && x.case_id === filled && x.status === "pending" ? { ...x, status: "declined" } : x)),
  });
  return done;
}

/* ---------------- what each side sees ---------------- */

/** Requests and agreed visits for whoever is looking: as a consultant, as a clinic, or both. */
export async function myConsults(v: Viewer, now = Date.now()) {
  const mine = load(now).requests.filter((r) => r.consultant.id === v.id || (canHire(v) && r.clinic.id === v.clinicId));
  const askedMe = (r: ConsultRequest) => (r.from === "clinic" ? r.consultant.id === v.id : r.clinic.id === v.clinicId);
  const byVisit = (a: ConsultRequest, b: ConsultRequest) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`);
  return {
    visits: mine.filter((r) => r.status === "accepted").sort(byVisit),
    waiting: mine.filter((r) => r.status === "pending" && askedMe(r)),
    sent: mine.filter((r) => r.status !== "accepted" && !askedMe(r)),
  };
}

/** Upcoming agreed visits where this dentist is the hired consultant (their profile). */
export async function visitsAsConsultant(userId: string, now = Date.now()): Promise<ConsultRequest[]> {
  return load(now)
    .requests.filter((r) => r.status === "accepted" && r.consultant.id === userId && r.date >= today(now))
    .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
}

/** Agreed visits at a clinic on one day (its FMD Clinic calendar). Sync: the calendar builds its day synchronously. */
export function visitsAtClinic(clinicId: string, date: string): ConsultRequest[] {
  return (read<Store>(KEY)?.requests ?? []).filter((r) => r.status === "accepted" && r.clinic.id === clinicId && r.date === date);
}
