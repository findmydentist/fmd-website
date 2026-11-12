import assert from "node:assert/strict";
import { test } from "node:test";
import { DEMO_OTP, DEMO_PASSWORD, demoFetch, findDemo } from "./fmdDemo.ts";

const mem = new Map<string, string>();
globalThis.localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) } as Storage;
const call = (path: string, body?: unknown, method?: string) => demoFetch(path, { body, method });

test("demo logins by number in any format, or email", () => {
  assert.equal(findDemo("90000 00001")?.full_name, "Priya Sharma");
  assert.equal(findDemo("+91 90000-00002")?.full_name, "Dr. Karthik Iyer");
  assert.equal(findDemo("OWNER@demo.fmd.test")?.workspaces[0]?.clinic_id, "smile-studio");
  assert.equal(findDemo("98765 43210"), undefined);
});

test("password login, me, logout", async () => {
  assert.equal(call("/auth/me").status, 401);
  assert.equal(call("/auth/login/password", { login: "9000000001", password: "wrong" }).status, 401);
  assert.equal(call("/auth/login/password", { login: "9000000001", password: DEMO_PASSWORD }).status, 200);
  assert.equal((await call("/auth/me").json()).id, "demo-patient");
  assert.equal(call("/auth/logout", undefined, "POST").status, 204);
  assert.equal(call("/auth/me").status, 401);
});

test("OTP login uses the fixed code", async () => {
  assert.equal(call("/auth/otp", { identifier: "9000000002", purpose: "login" }).status, 204);
  assert.equal(call("/auth/login/otp", { identifier: "9000000002", code: "000000" }).status, 401);
  assert.equal((await call("/auth/login/otp", { identifier: "9000000002", code: DEMO_OTP }).json()).id, "demo-dentist");
});

test("the new dentist: registration goes for checking, the demo approves it, and it can start over", async () => {
  assert.equal(call("/auth/login/password", { login: "90000 00004", password: DEMO_PASSWORD }).status, 200);
  assert.equal((await call("/auth/me").json()).dentist_profile, null);
  assert.equal(call("/demo/verify", undefined, "POST").status, 409);
  const saved = await call("/me/dentist-profile", { council: "Kerala State Dental Council", registration_no: "KSDC-9" }, "PUT").json();
  assert.equal(saved.verification_status, "pending");
  assert.equal(call("/demo/verify", undefined, "POST").status, 204);
  assert.equal((await call("/auth/me").json()).dentist_profile.verification_status, "verified");
  // other edits keep the status; a new number goes back for checking
  assert.equal((await call("/me/dentist-profile", { council: "Kerala State Dental Council", registration_no: "KSDC-9", specialisation: "Endodontist" }, "PUT").json()).verification_status, "verified");
  assert.equal((await call("/me/dentist-profile", { council: "Kerala State Dental Council", registration_no: "KSDC-10" }, "PUT").json()).verification_status, "pending");
  assert.equal(call("/demo/reset-dentist", undefined, "POST").status, 204);
  assert.equal((await call("/auth/me").json()).dentist_profile, null);
});
