import assert from "node:assert/strict";
import { test } from "node:test";
import type { Viewer } from "../lib/viewer.ts";
import { applicantCounts, applicantsFor, apply, getProfile, myApplications, profileGaps, saveProfile, setStatus, type ApplicantProfile } from "./applications.ts";

const v = (id: string, kind: Viewer["kind"], extra: Partial<Viewer> = {}): Viewer => ({ id, name: "Asha Rao", initials: "AR", kind, verifiedDentist: false, clinicId: null, ...extra });
const full = (userId: string, dentist = false): ApplicantProfile => ({
  userId,
  name: "Asha Rao",
  phone: "+91 98450 11111",
  email: "asha@example.com",
  city: "Bengaluru",
  headline: "Dental assistant, 3 years",
  qualifications: ["Diploma in Dental Hygiene"],
  experience: [{ title: "Assistant", place: "A clinic", from: "2022-01", to: null }],
  skills: ["Chairside assisting"],
  languages: ["English", "Kannada"],
  cv: { name: "asha-cv.pdf", size: 120_000 },
  ...(dentist ? { dentist: { council: "Karnataka State Dental Council", registration_no: "KA-12345", degree: "BDS" as const, years: 3 } } : {}),
});

test("signed out, unverified dentists and incomplete profiles can't apply", async () => {
  await assert.rejects(apply(null, "job-assist-kor", ""), /^Error: Log in to apply$/);
  const unverified = v("ap1", "dentist");
  await saveProfile(full("ap1", true));
  await assert.rejects(apply(unverified, "job-assoc-kor", ""), /^Error: Only verified dentists can apply to dentist roles$/);
  await saveProfile({ ...full("ap2"), phone: "", cv: null });
  const gaps = profileGaps(await getProfile("ap2"), "team");
  assert.deepEqual(gaps, ["Phone", "CV"]);
  await assert.rejects(apply(v("ap2", "patient"), "job-assist-kor", ""), new RegExp(`^Error: Finish your profile first: ${gaps.join(", ")}$`));
  assert.ok(profileGaps(null, "team").includes("Name"));
  assert.ok(profileGaps(full("x"), "dentist").includes("Dental council registration"));
});

test("applying twice returns the same application; it shows in my applications", async () => {
  await saveProfile(full("ap3"));
  const a = await apply(v("ap3", "student"), "job-assist-kor", "  Keen to learn.  ");
  const b = await apply(v("ap3", "student"), "job-assist-kor", "again");
  assert.equal(a.id, b.id);
  assert.equal(a.note, "Keen to learn.");
  assert.equal(a.status, "sent");
  const mine = await myApplications("ap3");
  assert.equal(mine.length, 1);
  assert.equal(mine[0]!.job.id, "job-assist-kor");
});

test("a verified dentist can apply to a dentist role", async () => {
  await saveProfile(full("ap4", true));
  const a = await apply(v("ap4", "dentist", { verifiedDentist: true }), "job-assoc-smile", "");
  assert.equal(a.snapshot.dentist?.registration_no, "KA-12345");
});

test("the employer sees applicants (sent becomes seen) and only they can change status", async () => {
  await saveProfile(full("ap5"));
  const a = await apply(v("ap5", "patient"), "job-assist-smile", "");
  const owner = v("demo-owner", "clinic_owner", { clinicId: "smile-studio", verifiedDentist: true });
  const desk = v("demo-desk", "clinic_staff", { clinicId: "smile-studio" });
  const list = await applicantsFor(owner, "job-assist-smile");
  assert.ok(list.some((x) => x.id === a.id));
  assert.equal((await myApplications("ap5"))[0]!.status, "seen");
  await setStatus(desk, a.id, "shortlisted");
  assert.equal((await myApplications("ap5"))[0]!.status, "shortlisted");
  const stranger = v("other-owner", "clinic_owner", { clinicId: "kor", verifiedDentist: true });
  await assert.rejects(setStatus(stranger, a.id, "declined"), /^Error: Not your job$/);
  await assert.rejects(applicantsFor(stranger, "job-assist-smile"), /^Error: Not your job$/);
  const seeded = await applicantsFor(owner, "job-assoc-smile");
  assert.ok(seeded.length >= 3, "the demo clinic has sample applicants");
});

test("applicant counts per job, without marking anything seen", async () => {
  const c = await applicantCounts(["job-assist-smile", "job-hyg-bnd"]);
  assert.ok(c["job-assist-smile"]!.total >= 2);
  assert.equal(c["job-hyg-bnd"]!.total, 0);
  const before = c["job-assist-smile"]!.fresh;
  assert.equal((await applicantCounts(["job-assist-smile"]))["job-assist-smile"]!.fresh, before, "counting changes nothing");
});

test("a dentist who works at the clinic can't manage its applicants; owner and front desk can", async () => {
  const associate = v("demo-dentist", "dentist", { clinicId: "smile-studio", verifiedDentist: true });
  await assert.rejects(applicantsFor(associate, "job-assoc-smile"), /^Error: Not your job$/);
  const desk = v("demo-desk", "clinic_staff", { clinicId: "smile-studio" });
  assert.ok((await applicantsFor(desk, "job-assoc-smile")).length >= 1);
});
