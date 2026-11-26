import assert from "node:assert/strict";
import { test } from "node:test";
import { findDemoUser } from "./demo.ts";
import type { Me } from "./fmd.ts";
import { clinicPerson, workspacesOf } from "./workspaces.ts";

const owner = { id: "demo-owner", full_name: "Dr. Ananya Rao", workspaces: [{ clinic_id: "smile-studio", clinic_name: "Smile Studio", role: "owner" }] } as unknown as Me;
const patient = { id: "demo-patient", full_name: "Priya Sharma", workspaces: [] } as unknown as Me;

test("a clinic owner who logged in by number opens her clinic, without a demo role", () => {
  const p = clinicPerson(owner, null, "smile-studio");
  assert.equal(p?.role, "clinic_owner");
  assert.equal(p?.title, "Owner");
  assert.equal(p?.initials, "AR");
  assert.equal(clinicPerson(owner, null, "another-clinic"), null, "only her own clinic");
  assert.equal(clinicPerson(patient, null, "smile-studio"), null);
});

test("a demo role that works at the clinic wins; one that doesn't falls back to the account", () => {
  assert.equal(clinicPerson(patient, findDemoUser("demo-desk"), "smile-studio")?.role, "clinic_front_desk");
  assert.equal(clinicPerson(owner, findDemoUser("demo-patient"), "smile-studio")?.role, "clinic_owner");
});

test("the profile menu offers each person's own workspaces, and nothing to a patient", () => {
  assert.deepEqual(workspacesOf(owner, null).map((w) => [w.title, w.href]), [["FMD Clinic", "/clinic/smile-studio"]]);
  assert.deepEqual(workspacesOf(owner, findDemoUser("demo-owner")).length, 1, "the same clinic isn't listed twice");
  assert.deepEqual(workspacesOf(patient, null), []);
  assert.deepEqual(workspacesOf(null, findDemoUser("demo-student")).map((w) => w.href), ["/scholar"]);
});
