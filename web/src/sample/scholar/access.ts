/**
 * Who can use FMD Scholar (Scholar plan part 1.1, PDR §8.1): sample data until the backend has it. Proposed API:
 *   GET /scholar/entitlement → ScholarAccess
 * Rules: Scholar comes only with an active student membership and an uploaded student ID. After the end date it stays
 * open for the grace period, then turns read-only (work is kept, nothing new is made). Dentists, companies and
 * patients don't get Scholar; there's no way to switch it on yourself.
 */
import { checkout, getMembership } from "../billing.ts";
import { getAccountType, getStudent, saveStudent, setAccountType } from "../onboarding.ts";

export type AccessStatus = "active" | "grace" | "read_only" | "id_needed" | "unpaid" | "not_student";
export type ScholarAccess = { status: AccessStatus; ends_at: string | null; grace_until: string | null };

export async function getScholarAccess(userId: string, now = Date.now()): Promise<ScholarAccess> {
  const m = await getMembership(userId, now);
  if (m?.plan !== "student") {
    const type = await getAccountType(userId);
    return { status: type === "student" ? "unpaid" : "not_student", ends_at: null, grace_until: null };
  }
  const base = { ends_at: m.renews_at, grace_until: m.grace_until };
  if (m.status === "expired") return { status: "read_only", ...base };
  if (!(await getStudent(userId))?.id_doc) return { status: "id_needed", ...base };
  return { status: m.status === "grace" ? "grace" : "active", ...base };
}

export const canCreate = (a: ScholarAccess) => a.status === "active" || a.status === "grace";
export const canRead = (a: ScholarAccess) => canCreate(a) || a.status === "read_only";

/**
 * Demo control on the access gate, so visitors can try Scholar without the full sign-up: makes this account a student
 * with a sample ID and pays the student membership through the demo gateway (it settles a few seconds later).
 * Nothing real is charged. Remove when real payments and verification exist.
 */
export async function demoMakeStudent(userId: string, now = Date.now()) {
  await setAccountType(userId, "student");
  await saveStudent(userId, { college: "Demo Dental College", course: "BDS", year: "4th year", id_doc: null }, { name: "student-id-demo.pdf", type: "application/pdf", size: 120_000 });
  await checkout(userId, "student", `demo-scholar-${userId}-${now}`, "success", now);
}

export type ScholarPerson = { id: string; full_name: string };
/**
 * Who Scholar is for. A person chosen in the demo picker (e.g. Rhea Kapoor, the demo student) is used as they are,
 * with no backend sign-in needed; otherwise the signed-in FMD account. undefined while either is still being read,
 * null when there's nobody (Scholar then asks to sign in).
 */
export function scholarPerson(demo: { id: string; name: string } | null | undefined, me: ScholarPerson | null | undefined): ScholarPerson | null | undefined {
  if (demo) return { id: demo.id, full_name: demo.name };
  if (demo === undefined || me === undefined) return undefined;
  return me ? { id: me.id, full_name: me.full_name } : null;
}
