/**
 * Client for the FMD FastAPI backend (repo main-websie/server). The browser calls /api/v1/* on this site and
 * next.config rewrites it to FMD_API_URL, so the backend's HttpOnly cookies (fmd_access, fmd_refresh) stay first-party.
 * Kept free of React so it can be tested with node --test.
 */

import { demoFetch } from "./fmdDemo.ts";

const BASE = "/api/v1";
/** No backend: answer from the in-browser demo accounts in fmdDemo.ts. */
/** the browser demo, same rule as DEMO_MODE in toggle.ts; read on each call (Next inlines it at build time anyway) */
const isDemo = () => process.env.NEXT_PUBLIC_FMD_DEMO !== "0";

/** UserRead in server/app/schemas/user.py */
export type User = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  email_verified: boolean;
  mfa_enabled: boolean;
  year_of_birth: number | null;
  gender: string | null;
  city: string | null;
  created_at: string;
};

/** DentistProfileRead. Verification is set by FMD staff; changing council or registration number resets it to unverified. */
export type DentistProfile = {
  council: string;
  registration_no: string;
  qualifications: string | null;
  specialisation: string | null;
  verification_status: "unverified" | "pending" | "verified" | "rejected";
};

/** MeRead: GET /auth/me */
export type Me = User & {
  mfa_method: string | null;
  mfa_methods: string[];
  dentist_profile: DentistProfile | null;
  workspaces: { clinic_id: string; clinic_name: string; role: "owner" | "dentist" | "receptionist" }[];
};

export type MfaChallenge = { mfa_required: true; challenge_token: string };

// fields written out (not constructor parameter properties) so Node's test runner can strip the types
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** The backend's message: AppError gives {error: {code, message}}; FastAPI validation gives {detail: [{msg}]}. */
export function errorMessage(status: number, data: unknown): string {
  const d = data as { error?: { message?: string }; detail?: { msg?: string }[] } | null;
  if (d?.error?.message) return d.error.message;
  const msg = Array.isArray(d?.detail) ? d.detail[0]?.msg : undefined;
  if (msg) return msg.replace(/^Value error, /, "");
  if (status === 429) return "Too many tries. Wait a minute and try again.";
  return "Something went wrong. Please try again.";
}

/**
 * The backend's 401 for a missing or expired access token (server/app/api/deps.py). Every other 401 is a wrong code or
 * password, and retrying it would only burn one of the user's OTP tries.
 */
const EXPIRED = "Not authenticated";

let refreshing: Promise<boolean> | null = null;
/** One refresh at a time: the refresh token rotates, so parallel refreshes would look like token theft. */
const refresh = () =>
  (refreshing ??= fetch(`${BASE}/auth/refresh`, { method: "POST" })
    .then((r) => r.ok, () => false)
    .finally(() => (refreshing = null)));

type Init = { method?: string; body?: unknown };

export async function fmd<T>(path: string, init: Init = {}, retry = true): Promise<T> {
  let res: Response;
  try {
    res = isDemo() ? demoFetch(path, init) : await fetch(BASE + path, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: init.body === undefined ? undefined : { "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError("Can't reach FMD right now. Check your connection and try again.", 0, "network");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  const expired = res.status === 401 && (data as { error?: { message?: string } } | null)?.error?.message === EXPIRED;
  if (expired && retry && (await refresh())) return fmd<T>(path, init, false);
  if (!res.ok) throw new ApiError(errorMessage(res.status, data), res.status, (data as { error?: { code?: string } } | null)?.error?.code ?? "error");
  return data as T;
}

export type OtpPurpose = "signup" | "login" | "reset_password";

export const auth = {
  sendOtp: (identifier: string, purpose: OtpPurpose) => fmd<void>("/auth/otp", { body: { identifier, purpose } }),
  /** Non-production backends hand back the last OTP so the demo works without SMS. */
  devOtp: () => fmd<{ code: string | null }>("/auth/otp/dev").then((r) => r.code, () => null),
  register: (b: { full_name: string; phone: string; password: string; otp: string; marketing_opt_in: boolean }) =>
    fmd<User>("/auth/register", { body: { ...b, accept_terms: true, age_confirmed: true } }),
  loginPassword: (login: string, password: string) => fmd<User | MfaChallenge>("/auth/login/password", { body: { login, password } }),
  verifyMfa: (challenge_token: string, code: string) => fmd<User>("/auth/mfa/verify", { body: { challenge_token, code } }),
  loginOtp: (identifier: string, code: string) => fmd<User>("/auth/login/otp", { body: { identifier, code } }),
  verifyResetOtp: (identifier: string, code: string) =>
    fmd<{ proof_token: string }>("/auth/otp/verify", { body: { identifier, code, purpose: "reset_password" } }),
  resetPassword: (identifier: string, proof_token: string, new_password: string) =>
    fmd<void>("/auth/password/reset", { body: { identifier, proof_token, new_password } }),
  /** after a reset code: log in without changing the password (the proof is used up either way) */
  loginWithProof: (identifier: string, proof_token: string) => fmd<User>("/auth/login/proof", { body: { identifier, proof_token } }),
  logout: () => fmd<void>("/auth/logout", { method: "POST" }),
  logoutAll: () => fmd<void>("/auth/logout-all", { method: "POST" }),
  me: () => fmd<Me>("/auth/me"),
};

/** SessionRead: GET /me/sessions */
export type Session = {
  id: string;
  created_at: string;
  last_seen_at: string;
  auth_method: string;
  ip: string | null;
  user_agent: string | null;
  current: boolean;
};

/** ProfileUpdateRequest: PATCH /me */
export type ProfileUpdate = {
  full_name: string;
  year_of_birth: number | null;
  gender: "female" | "male" | "other" | "undisclosed" | null;
  city: string | null;
};

/**
 * /me/*: account settings. Changing a verified email and removing an email are confirmed with a code texted to the
 * phone; changing the password and turning two-step off need the current password.
 */
export const account = {
  updateProfile: (p: ProfileUpdate) => fmd<Me>("/me", { method: "PATCH", body: p }),
  /** the backend signs every device out afterwards, this one included */
  changePassword: (current_password: string, new_password: string) => fmd<void>("/me/password", { body: { current_password, new_password } }),
  /** a new email, or (with the code from startEmailChange) one replacing a verified email; then a code goes to it */
  addEmail: (email: string, otp_code?: string) => fmd<void>("/me/email", { body: { email, otp_code } }),
  /** texts a code to the phone, to confirm replacing a verified email */
  startEmailChange: () => fmd<void>("/me/email/change-start", { method: "POST" }),
  verifyEmail: (code: string) => fmd<void>("/me/email/verify", { body: { code } }),
  /** texts a code to the phone, to confirm removing the email */
  startEmailRemove: () => fmd<void>("/me/email/remove", { method: "POST" }),
  removeEmail: (otp_code: string) => fmd<void>("/me/email", { method: "DELETE", body: { otp_code } }),
  startMfa: () => fmd<void>("/me/mfa/start", { method: "POST" }),
  enableMfa: (code: string) => fmd<void>("/me/mfa", { body: { code } }),
  disableMfa: (password: string) => fmd<void>("/me/mfa", { method: "DELETE", body: { password } }),
  sessions: () => fmd<Session[]>("/me/sessions"),
  revokeSession: (id: string) => fmd<void>(`/me/sessions/${id}`, { method: "DELETE" }),
  /** 409 when the registration number belongs to another FMD account */
  saveDentistProfile: (p: Omit<DentistProfile, "verification_status">) => fmd<DentistProfile>("/me/dentist-profile", { method: "PUT", body: p }),
  /** 404 when there's none yet (GET /auth/me carries it too) */
  dentistProfile: () => fmd<DentistProfile>("/me/dentist-profile"),
};

/* ---------------- clinics and invitations: server/app/schemas/clinic.py ---------------- */

export type Role = "owner" | "dentist" | "receptionist";
export type Clinic = {
  id: string;
  name: string;
  city: string;
  phone: string;
  email: string | null;
  gstin: string | null;
  timezone: string;
  status: string;
  created_at: string;
};
export type ClinicWrite = { name: string; city: string; phone: string; email?: string | null; gstin?: string | null };
export type Member = {
  user: { id: string; full_name: string; phone: string; email: string | null };
  role: Role;
  status: "active" | "deactivated";
  created_at: string;
};
export type Invite = { id: string; email: string; role: Role; expires_at: string; created_at: string };
export type InvitePreview = { clinic_name: string; clinic_city: string; role: Role; email_hint: string; expires_at: string };

/** /clinics/*: a clinic's workspace. Editing it, its members and its invitations is for the owner only. */
export const clinics = {
  create: (c: ClinicWrite) => fmd<Clinic>("/clinics", { body: c }),
  /** the clinic, and your role in it */
  get: (id: string) => fmd<{ clinic: Clinic; role: Role }>(`/clinics/${id}`),
  update: (id: string, c: Partial<ClinicWrite>) => fmd<Clinic>(`/clinics/${id}`, { method: "PATCH", body: c }),
  members: (id: string) => fmd<Member[]>(`/clinics/${id}/members`),
  updateMember: (id: string, userId: string, m: { role?: Role; status?: Member["status"] }) =>
    fmd<Member>(`/clinics/${id}/members/${userId}`, { method: "PATCH", body: m }),
  invite: (id: string, email: string, role: Role) => fmd<Invite & { url: string }>(`/clinics/${id}/invitations`, { body: { email, role } }),
  invitations: (id: string) => fmd<Invite[]>(`/clinics/${id}/invitations`),
  revokeInvite: (id: string, inviteId: string) => fmd<void>(`/clinics/${id}/invitations/${inviteId}`, { method: "DELETE" }),
};

/** /invitations/*: an invitation link, before and after signing in */
export const invitations = {
  preview: (token: string) => fmd<InvitePreview>(`/invitations/${encodeURIComponent(token)}`),
  accept: (token: string) => fmd<{ clinic_id: string; role: Role }>(`/invitations/${encodeURIComponent(token)}/accept`, { method: "POST" }),
};

/** Same rules as Password in server/app/schemas/auth.py; the server still checks, and also rejects breached passwords. */
const RULES: [RegExp, string][] = [
  [/^.{8,128}$/, "8 or more characters"],
  [/[a-z]/, "a lowercase letter"],
  [/[A-Z]/, "an uppercase letter"],
  [/[0-9]/, "a number"],
  [/[^A-Za-z0-9]/, "a special character"],
];
export const passwordRules = (pw: string) => RULES.map(([re, label]) => ({ label, ok: re.test(pw) }));

/** "+919876543210" → "+91 98765 43210"; other numbers as stored */
export const fmtPhone = (p: string) => p.replace(/^\+91(\d{5})(\d{5})$/, "+91 $1 $2");

/** "Priya Ramesh Sharma" → "PS" */
/** "Dr. Ananya Rao" → "AR": honorifics are skipped, so doctors' avatars show their own initials. */
export const initials = (name: string) => {
  const all = name.trim().split(/\s+/).filter(Boolean);
  const named = all.filter((x) => !/^(dr|mr|mrs|ms|miss|prof)\.?$/i.test(x));
  const w = named.length ? named : all;
  return ((w[0]?.[0] ?? "") + (w.length > 1 ? (w.at(-1)?.[0] ?? "") : "")).toUpperCase() || "?";
};

/** "Chrome on Windows" from a User-Agent; plain fallbacks for anything unknown */
export function deviceName(ua: string | null) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge"
    : /OPR\//.test(ua) ? "Opera"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : null;
  const os = /Android/.test(ua) ? "Android"
    : /iPhone|iPad|iPod/.test(ua) ? "iOS"
    : /Windows/.test(ua) ? "Windows"
    : /Mac OS X/.test(ua) ? "macOS"
    : /CrOS/.test(ua) ? "ChromeOS"
    : /Linux/.test(ua) ? "Linux"
    : null;
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os ?? "Other device";
}
