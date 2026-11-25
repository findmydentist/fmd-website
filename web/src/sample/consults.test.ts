import assert from "node:assert/strict";
import { test } from "node:test";
import type { Viewer } from "../lib/viewer.ts";
import { dayAppointments } from "./clinic.ts";
import { answer, askConsultant, listCases, myConsults, offerToTake, postCase, saveListing, visitsAsConsultant, type ListingInput } from "./consults.ts";

const NOW = Date.parse("2026-11-25T06:00:00Z"); // a Wednesday, India time
const DATE = "2026-11-27"; // Friday
const v = (id: string, kind: Viewer["kind"], extra: Partial<Viewer> = {}): Viewer => ({ id, name: `Dr. ${id}`, initials: "XX", kind, verifiedDentist: kind === "dentist", clinicId: null, ...extra });
const owner = v("demo-owner", "clinic_owner", { clinicId: "smile-studio", verifiedDentist: true });
const smile = { id: "smile-studio", name: "Smile Studio Dental", city: "Bengaluru" };
const listing: ListingInput = { specialty: "oral_surgery", qualification: "MDS (Oral Surgery)", years: 6, procedures: ["Wisdom teeth"], cities: ["Bengaluru"], days: "Fridays", pay: { basis: "per_case", amount: 5000 }, bio: "" };
const visit = { date: DATE, start: "10:30", minutes: 60, note: "" };

test("only verified dentists list themselves, and only listed ones can offer", async () => {
  await assert.rejects(saveListing(v("p1", "patient"), listing), /verified/);
  await assert.rejects(saveListing({ ...v("d0", "dentist"), verifiedDentist: false }, listing), /verified/);
  await assert.rejects(offerToTake(v("d1", "dentist"), "cc-smile-38", visit, NOW), /List yourself/);
  await assert.rejects(postCase(v("d1", "dentist"), smile, { area: "x", specialty: "implants", procedure: "Implant", cases: 1, when: "", pay: { basis: "per_case", amount: 1 }, provides: [], bring: [], note: "" }, NOW), /clinic/);
});

test("a consultant's offer waits for the clinic; agreeing fills the case and books it on both sides", async () => {
  const doc = v("d2", "dentist");
  await saveListing(doc, listing);
  await assert.rejects(offerToTake(doc, "cc-smile-38", { ...visit, date: "2026-11-20" }, NOW), /passed/);
  const r = await offerToTake(doc, "cc-smile-38", { ...visit, procedure: "" } as typeof visit, NOW); // the form also sends an empty procedure
  assert.equal(r.status, "pending");
  await assert.rejects(answer(doc, r.id, true, NOW), /Only the one who was asked/);
  assert.equal((await myConsults(owner, NOW)).waiting[0]?.id, r.id);

  await answer(owner, r.id, true, NOW);
  assert.ok(!(await listCases({}, NOW)).some((c) => c.id === "cc-smile-38"), "a filled case leaves the board");
  assert.equal((await visitsAsConsultant("d2", NOW))[0]?.procedure, "Impacted lower wisdom tooth removal");
  const appt = dayAppointments("main", DATE, new Date(NOW)).find((a) => a.consultant);
  assert.equal(appt?.patientName, "Dr. d2");
  assert.equal(appt?.status, "confirmed");
  assert.equal(dayAppointments("kora", DATE, new Date(NOW)).some((a) => a.consultant), false);
});

test("a clinic asking a sample consultant gets an answer at once; sample clinics agree to offers at once", async () => {
  const r = await askConsultant(owner, smile, "vikram-rao", { ...visit, start: "15:00", procedure: "Two impacted wisdom teeth" }, NOW);
  assert.equal(r.status, "accepted");
  assert.equal((await myConsults(owner, NOW)).visits.some((x) => x.id === r.id), true);
  await assert.rejects(askConsultant(v("d2", "dentist"), smile, "vikram-rao", { ...visit, procedure: "x" }, NOW), /clinic/);

  const offer = await offerToTake(v("d2", "dentist"), "cc-kor-retx", visit, NOW);
  assert.equal(offer.status, "accepted");
});
