import assert from "node:assert/strict";
import { test } from "node:test";
import { canOpenClinic, demoLanding, DEMO_USERS, findDemoUser, homeOf, safeNext } from "./demo.ts";

test("five demo people: the student opens FMD Scholar", () => {
  assert.deepEqual(
    DEMO_USERS.map((u) => u.id),
    ["demo-patient", "demo-dentist", "demo-owner", "demo-desk", "demo-student"],
  );
  assert.equal(homeOf(findDemoUser("demo-student")!), "/scholar");
  assert.equal(homeOf(findDemoUser("demo-owner")!), "/clinic/smile-studio");
});

test("findDemoUser", () => {
  assert.equal(findDemoUser("demo-owner")?.name, "Dr. Ananya Rao");
  assert.equal(findDemoUser("nope"), null);
  assert.equal(findDemoUser(null), null);
});

test("canOpenClinic: only that clinic's people", () => {
  assert.equal(canOpenClinic(findDemoUser("demo-owner"), "smile-studio"), true);
  assert.equal(canOpenClinic(findDemoUser("demo-desk"), "smile-studio"), true);
  assert.equal(canOpenClinic(findDemoUser("demo-patient"), "smile-studio"), false);
  assert.equal(canOpenClinic(findDemoUser("demo-owner"), "other"), false);
  assert.equal(canOpenClinic(null, "smile-studio"), false);
});

test("safeNext: same-site paths only", () => {
  assert.equal(safeNext("/clinic/smile-studio"), "/clinic/smile-studio");
  assert.equal(safeNext("//evil.com"), "/");
  assert.equal(safeNext("https://evil.com"), "/");
  assert.equal(safeNext("/\\evil.com"), "/");
  assert.equal(safeNext(null), "/");
  assert.equal(safeNext("/\t/evil.com"), "/"); // browsers drop tabs: would become //evil.com
  assert.equal(safeNext("/\n/evil.com"), "/");
  assert.equal(safeNext("/clinic/smile-studio?date=2026-11-10#x"), "/clinic/smile-studio?date=2026-11-10#x");
});

test("each demo card lands in its own app, whatever ?next= is left over", () => {
  const who = (id: string) => findDemoUser(id);
  // no ?next=: everyone goes home
  assert.equal(demoLanding(who("demo-patient"), null), "/");
  assert.equal(demoLanding(who("demo-dentist"), null), "/");
  assert.equal(demoLanding(who("demo-owner"), null), "/clinic/smile-studio");
  assert.equal(demoLanding(who("demo-desk"), null), "/clinic/smile-studio");
  assert.equal(demoLanding(who("demo-student"), null), "/scholar");
  assert.equal(demoLanding(null, null), "/", "the new dentist has no demo role");
  // a leftover link into Scholar or a clinic only fits the people who can use it
  assert.equal(demoLanding(who("demo-patient"), "/scholar"), "/");
  assert.equal(demoLanding(who("demo-student"), "/scholar/ask"), "/scholar/ask");
  assert.equal(demoLanding(who("demo-patient"), "/clinic/smile-studio"), "/");
  assert.equal(demoLanding(who("demo-owner"), "/clinic/smile-studio/billing"), "/clinic/smile-studio/billing");
  // an ordinary FMD Main page is followed for anyone
  assert.equal(demoLanding(who("demo-patient"), "/jobs/consult"), "/jobs/consult");
});
