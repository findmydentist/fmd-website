import assert from "node:assert/strict";
import { test } from "node:test";
import { write } from "./store.ts";
import { checkJob, clinicJobs, closeJob, DENTIST_ROLES, getJob, jobState, myJobs, postJob, renewJob, reportJob, searchJobs, spaceCounts, TEAM_ROLES, type JobInput } from "./jobs.ts";

const NOW = Date.parse("2026-11-10T11:00:00+05:30");
const input: JobInput = { title: "Associate dentist", role: "associate", type: "full_time", employer: "Smile Studio", city: "Bengaluru", area: "Indiranagar", description: "General practice, 5 days a week, with mentoring.", requirements: "BDS\nRegistered", min_years: 1, salary: { min: 40000, max: 60000 }, qualification: "BDS" };

test("search: filters, newest first, expired listings never shown", async () => {
  const all = await searchJobs(null, {}, NOW);
  assert.ok(all.items.every((j, i) => i === 0 || all.items[i - 1].posted_at >= j.posted_at));
  assert.ok(!all.items.some((j) => j.id === "job-expired"));
  assert.ok((await searchJobs(null, { role: "hygienist" }, NOW)).items.every((j) => j.role === "hygienist"));
  assert.ok((await searchJobs(null, { experience: "0" }, NOW)).items.every((j) => j.min_years === 0));
  assert.ok((await searchJobs(null, { salary_min: 50000 }, NOW)).items.every((j) => j.salary && j.salary.max >= 50000));
  assert.equal(jobState((await getJob(null, "job-expired", NOW))!, NOW), "expired");
});

test("posting rules", () => {
  assert.equal(checkJob(input), null);
  assert.match(checkJob({ ...input, salary: { min: 9, max: 1 } })!, /lowest first/);
  assert.match(checkJob({ ...input, title: "x" })!, /title/);
});

test("spaces never mix", async () => {
  const dentist = (await searchJobs(null, { space: "dentist" }, NOW)).items;
  const team = (await searchJobs(null, { space: "team" }, NOW)).items;
  assert.ok(dentist.length >= 6 && team.length >= 6);
  assert.ok(dentist.every((j) => j.role in DENTIST_ROLES && j.space === "dentist"));
  assert.ok(team.every((j) => j.role in TEAM_ROLES && j.space === "team"));
  assert.deepEqual(await spaceCounts(NOW), { dentist: dentist.length, team: team.length });
});

test("companies can post in either space", async () => {
  const a = await postJob("demo-company", { ...input, role: "educator", employer: "Demo Aligner Brand" }, null, NOW, { kind: "company", clinicId: null });
  assert.equal(a.space, "dentist");
  const b = await postJob("demo-company", { ...input, role: "other", title: "Sales coordinator", employer: "Demo Aligner Brand" }, null, NOW, { kind: "company", clinicId: null });
  assert.equal(b.space, "team");
  assert.equal(b.posted_by, "demo-company");
  assert.equal(b.employer.kind, "company");
});

test("employer details", async () => {
  for (const j of (await searchJobs(null, {}, NOW)).items.filter((x) => !x.posted_by)) {
    assert.ok(j.employer.logo, `${j.id} has no logo`);
    if (j.employer.kind !== "dentist") assert.ok(j.employer.photos.length >= 3, `${j.id} needs 3 photos`);
    assert.ok(j.day_to_day.length >= 2, `${j.id} day to day`);
  }
});

test("a new posting is never shown as FMD-checked; edit, close, renew", async () => {
  const j = await postJob("j1", input, null, NOW);
  assert.equal(j.employer.verified, false);
  assert.ok((await searchJobs("j1", { q: "smile studio" }, NOW)).items.some((x) => x.id === j.id));
  await postJob("j1", { ...input, title: "Senior associate dentist" }, j.id, NOW);
  assert.equal((await myJobs("j1")).length, 1);
  await closeJob("j1", j.id);
  assert.ok(!(await searchJobs("j1", {}, NOW)).items.some((x) => x.id === j.id));
  await renewJob("j1", j.id, NOW + 40 * 86_400_000);
  assert.equal(jobState((await myJobs("j1"))[0], NOW + 40 * 86_400_000), "active");
  await assert.rejects(postJob("j1", input, "job-assoc-kor", NOW), /own postings/);
});

test("reporting a job", async () => {
  await assert.rejects(reportJob(null, "job-intern-ady", "fake", ""), /Log in/);
  await reportJob("j2", "job-intern-ady", "fees", "");
  await assert.rejects(reportJob("j2", "job-intern-ady", "fake", ""), /already/);
});

test("a clinic's listings include ones its owner posted and ones that expired", async () => {
  const j = await postJob("demo-owner", { ...input, title: "Weekend associate" }, null, NOW, { kind: "clinic", clinicId: "smile-studio" });
  const ids = (await clinicJobs("smile-studio", NOW)).map((x) => x.id);
  assert.ok(ids.includes(j.id) && ids.includes("job-assoc-smile"));
  assert.ok((await clinicJobs("kor", NOW)).some((x) => x.id === "job-expired"));
});

test("listings saved by an older version are ignored, not a crash", async () => {
  write("fmd-demo:jobs:old-user", [{ id: "job-old", title: "Old", employer: { name: "X" }, status: "active" }]);
  assert.deepEqual(await myJobs("old-user"), []);
});
