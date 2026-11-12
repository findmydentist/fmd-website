/**
 * Frontend-only stand-in for the FastAPI backend, on when NEXT_PUBLIC_FMD_DEMO=1 (see fmd()). Three fixed accounts, one
 * password, OTP always 123456; the "session" is the account id in localStorage. Nothing leaves the browser.
 */
import type { DentistProfile, Me } from "./fmd";

export const DEMO_PASSWORD = "Demo@1234";
export const DEMO_OTP = "123456";

const base = {
  email_verified: true, mfa_enabled: false, mfa_method: null, mfa_methods: [], year_of_birth: null, gender: null,
  city: "Bengaluru", created_at: "2026-01-15T10:00:00Z", dentist_profile: null, workspaces: [],
};
const verified = (registration_no: string, specialisation: string): DentistProfile => ({
  council: "Karnataka State Dental Council", registration_no, qualifications: "BDS, MDS", specialisation, verification_status: "verified",
});

export const DEMO_ACCOUNTS: Me[] = [
  { ...base, id: "demo-patient", full_name: "Priya Sharma", phone: "+919000000001", email: "patient@demo.fmd.test" },
  { ...base, id: "demo-dentist", full_name: "Dr. Karthik Iyer", phone: "+919000000002", email: "dentist@demo.fmd.test", dentist_profile: verified("KSDC-A-12345", "Endodontics") },
  {
    ...base, id: "demo-owner", full_name: "Dr. Ananya Rao", phone: "+919000000003", email: "owner@demo.fmd.test",
    dentist_profile: verified("KSDC-A-67890", "Prosthodontics"), workspaces: [{ clinic_id: "smile-studio", clinic_name: "Smile Studio", role: "owner" }],
  },
];

const KEY = "fmd-demo-session";
const session = {
  get: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  set: (id: string | null) => { try { if (id) localStorage.setItem(KEY, id); else localStorage.removeItem(KEY); } catch {} },
};

/** "98765 43210", "+91 98765-43210" or an email → the demo account, if any */
export const findDemo = (login: unknown) => {
  const s = String(login ?? "").trim().toLowerCase();
  const digits = s.replace(/\D/g, "").slice(-10);
  return DEMO_ACCOUNTS.find((a) => a.email === s || (digits.length === 10 && a.phone.endsWith(digits)));
};

const res = (status: number, data?: unknown) => new Response(data === undefined ? null : JSON.stringify(data), { status });
const err = (status: number, message: string) => res(status, { error: { code: "demo", message } });
const ONLY = "Use a demo account: 90000 00001, 90000 00002 or 90000 00003.";

/** Answers like the backend would, as a Response, so fmd() handles it exactly as a real one. */
export function demoFetch(path: string, init: { method?: string; body?: unknown }): Response {
  const b = (init.body ?? {}) as Record<string, string>;
  const me = DEMO_ACCOUNTS.find((a) => a.id === session.get());
  const signIn = (a: Me) => (session.set(a.id), res(200, a));

  switch (`${init.method ?? (init.body === undefined ? "GET" : "POST")} ${path}`) {
    case "POST /auth/login/password": {
      const a = findDemo(b.login);
      return a && b.password === DEMO_PASSWORD ? signIn(a) : err(401, `Wrong number or password. ${ONLY} Password ${DEMO_PASSWORD}.`);
    }
    case "POST /auth/otp":
      if (b.purpose === "reset_password") return err(403, `Passwords can't be changed in the demo. It is ${DEMO_PASSWORD}.`);
      return findDemo(b.identifier) ? res(204) : err(404, ONLY);
    case "GET /auth/otp/dev":
      return res(200, { code: DEMO_OTP });
    case "POST /auth/login/otp": {
      const a = findDemo(b.identifier);
      return a && b.code === DEMO_OTP ? signIn(a) : err(401, "Wrong code.");
    }
    case "POST /auth/password/check":
      return err(403, `Sign-up is off in the demo. ${ONLY}`);
    case "GET /auth/me":
      return me ? res(200, me) : err(401, "Signed out (demo)"); // not the backend's "Not authenticated", so no refresh
    case "POST /auth/logout":
    case "POST /auth/logout-all":
      session.set(null);
      return res(204);
    case "GET /me/sessions":
      if (!me) return err(401, "Signed out (demo)");
      return res(200, [{ id: "demo", created_at: me.created_at, last_seen_at: new Date().toISOString(), auth_method: "password", ip: null, user_agent: globalThis.navigator?.userAgent ?? null, current: true }]);
    default:
      return err(501, "Not available in the frontend demo.");
  }
}
