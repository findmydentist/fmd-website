import assert from "node:assert/strict";
import { test } from "node:test";
import { checkout, getMembership, WEBHOOK_MS, type PlanId } from "../billing.ts";
import { saveStudent, setAccountType, type AccountType } from "../onboarding.ts";
import { canCreate, canRead, demoMakeStudent, getScholarAccess, scholarPerson } from "./access.ts";

const NOW = Date.parse("2026-11-15T11:00:00+05:30");
const DAY = 86_400_000;
const ID = { name: "student-id.pdf", type: "application/pdf", size: 1000 };

/** an account of `type`, optionally with a paid `plan` and a student ID; returns the time the plan settled */
async function person(id: string, type: AccountType, plan?: PlanId, withId = true) {
  await setAccountType(id, type);
  if (type === "student") await saveStudent(id, { college: "Govt Dental College", course: "BDS", year: "4th year", id_doc: null }, withId ? ID : undefined);
  if (plan) {
    await checkout(id, plan, `k-${id}`, "success", NOW);
    await getMembership(id, NOW + WEBHOOK_MS);
  }
  return NOW + WEBHOOK_MS;
}

test("a paid student with an ID is active until the membership ends", async () => {
  const t = await person("a1", "student", "student");
  const a = await getScholarAccess("a1", t);
  assert.equal(a.status, "active");
  assert.equal(a.ends_at, (await getMembership("a1", t))!.renews_at);
  assert.ok(canCreate(a) && canRead(a));
});

test("a paid student without an ID is asked for it", async () => {
  const t = await person("a2", "student", "student", false);
  assert.equal((await getScholarAccess("a2", t)).status, "id_needed");
});

test("just after the end date: grace, still creating", async () => {
  const t = await person("a3", "student", "student");
  const a = await getScholarAccess("a3", t + 368 * DAY);
  assert.equal(a.status, "grace");
  assert.ok(a.grace_until);
  assert.ok(canCreate(a));
});

test("after grace: read-only", async () => {
  const t = await person("a4", "student", "student");
  const a = await getScholarAccess("a4", t + 380 * DAY);
  assert.equal(a.status, "read_only");
  assert.equal(canCreate(a), false);
  assert.equal(canRead(a), true);
});

test("a student who hasn't paid", async () => {
  await person("a5", "student");
  const a = await getScholarAccess("a5", NOW);
  assert.equal(a.status, "unpaid");
  assert.equal(canRead(a), false);
});

test("a dentist, even with a paid dentist plan, isn't a Scholar user", async () => {
  const t = await person("a6", "dentist", "dentist");
  const a = await getScholarAccess("a6", t);
  assert.equal(a.status, "not_student");
  assert.equal(canRead(a), false);
});

test("demo set-up turns any account into a paid student with an ID", async () => {
  await setAccountType("a7", "dentist");
  await demoMakeStudent("a7", NOW);
  assert.equal((await getScholarAccess("a7", NOW + WEBHOOK_MS)).status, "active");
});

test("a chosen demo person is Scholar's person; otherwise the signed-in account", () => {
  const rhea = { id: "demo-student", name: "Rhea Kapoor" };
  const acct = { id: "u-1", full_name: "Asha Rao" };
  assert.deepEqual(scholarPerson(rhea, acct), { id: "demo-student", full_name: "Rhea Kapoor" });
  assert.deepEqual(scholarPerson(rhea, null), { id: "demo-student", full_name: "Rhea Kapoor" });
  assert.deepEqual(scholarPerson(null, acct), acct);
  assert.equal(scholarPerson(null, null), null, "nobody: ask to sign in");
  assert.equal(scholarPerson(undefined, acct), undefined, "still reading the demo choice");
  assert.equal(scholarPerson(null, undefined), undefined, "still asking the backend");
});
