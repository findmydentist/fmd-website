import assert from "node:assert/strict";
import { test } from "node:test";
import { DEMO_USERS } from "./demo.ts";
import type { Me } from "./fmd.ts";
import { canApplyDentistRole, canCreate, canManageApplicants, canPostJobs, fromDemo, fromMe } from "./viewer.ts";

const me = (over: Partial<Me> = {}): Me =>
  ({ id: "u1", full_name: "Asha Rao", dentist_profile: null, workspaces: [], ...over }) as Me;
const profile = (status: string) => ({ verification_status: status }) as unknown as Me["dentist_profile"];

test("demo roles map to viewers", () => {
  const vs = DEMO_USERS.map(fromDemo);
  assert.deepEqual(vs.map((v) => v.kind), ["patient", "dentist", "clinic_owner", "clinic_staff"]);
  assert.deepEqual(vs.map((v) => v.verifiedDentist), [false, true, true, false]);
  assert.equal(vs[2].clinicId, "smile-studio");
  assert.equal(vs[0].initials, "PS");
});

test("real accounts map by workspace and profile", () => {
  assert.equal(fromMe(me({ workspaces: [{ clinic_id: "c1", clinic_name: "C", role: "owner" }] })).kind, "clinic_owner");
  assert.equal(fromMe(me({ workspaces: [{ clinic_id: "c1", clinic_name: "C", role: "owner" }] })).clinicId, "c1");
  assert.equal(fromMe(me({ workspaces: [{ clinic_id: "c1", clinic_name: "C", role: "receptionist" }] })).kind, "clinic_staff");
  const pending = fromMe(me({ dentist_profile: profile("pending") }));
  assert.equal(pending.kind, "dentist");
  assert.equal(pending.verifiedDentist, false);
  assert.equal(fromMe(me({ dentist_profile: profile("verified") })).verifiedDentist, true);
  assert.equal(fromMe(me()).kind, "patient");
  assert.equal(fromMe(me()).initials, "AR");
});

test("permissions", () => {
  const [patient, dentist, owner, desk] = DEMO_USERS.map(fromDemo);
  // students and companies aren't demo roles any more; real accounts of those kinds still exist
  const student = { ...patient, kind: "student" as const };
  const company = { ...patient, kind: "company" as const };
  const unverified = fromMe(me({ dentist_profile: profile("pending") }));
  assert.equal(canCreate(null), false);
  assert.equal(canCreate(patient), false);
  assert.equal(canCreate(student), true);
  assert.equal(canCreate(dentist), true);
  assert.equal(canCreate(owner), true);
  assert.equal(canCreate(unverified), false);
  assert.equal(canPostJobs(company), true);
  assert.equal(canPostJobs(student), false);
  assert.equal(canPostJobs(desk), false);
  assert.equal(canManageApplicants(desk), true);
  assert.equal(canManageApplicants(patient), false);
  assert.equal(canApplyDentistRole(unverified), false);
  assert.equal(canApplyDentistRole(dentist), true);
  assert.equal(canApplyDentistRole(null), false);
});
