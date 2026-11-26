/**
 * Demo accounts for the preview: pick a person, no password. Real sign-in replaces this when the backend lands.
 * Kept free of React so it can be tested with node --test; the hook lives in useDemoUser.ts.
 */

export type DemoRole = "patient" | "dentist" | "clinic_owner" | "clinic_front_desk" | "student";

export type DemoUser = {
  id: string;
  name: string;
  initials: string;
  role: DemoRole;
  title: string;
  /** the clinic this person works at; null for people outside FMD Clinic */
  clinicId: string | null;
};

export const DEMO_USERS: DemoUser[] = [
  { id: "demo-patient", name: "Priya Sharma", initials: "PS", role: "patient", title: "Patient", clinicId: null },
  { id: "demo-dentist", name: "Dr. Karthik Iyer", initials: "KI", role: "dentist", title: "Dentist", clinicId: null },
  { id: "demo-owner", name: "Dr. Ananya Rao", initials: "AR", role: "clinic_owner", title: "Owner", clinicId: "smile-studio" },
  { id: "demo-desk", name: "Kavya Menon", initials: "KM", role: "clinic_front_desk", title: "Front desk", clinicId: "smile-studio" },
  { id: "demo-student", name: "Rhea Kapoor", initials: "RK", role: "student", title: "Dental student", clinicId: null },
];

export const findDemoUser = (id: string | null) => DEMO_USERS.find((u) => u.id === id) ?? null;

export const canOpenClinic = (user: DemoUser | null, clinicId: string) => user?.clinicId === clinicId;

/**
 * Only same-site paths. Parsed the way a browser would (it drops tabs and newlines, so "/\t/evil.com" means
 * "//evil.com"), then kept only if it stays on this site.
 */
/**
 * Where a demo log-in lands: the page that sent them here (?next=) when this person can use it, else their own home.
 * A link back into FMD Scholar only fits the student, one into FMD Clinic only the clinic team; everyone else goes to
 * their own home, so a ?next= left over from someone else's session never drops a patient into Scholar.
 */
export function demoLanding(role: DemoUser | null, next: string | null): string {
  const home = role ? homeOf(role) : "/";
  if (!next) return home;
  const to = safeNext(next);
  const fits = to.startsWith("/clinic") ? Boolean(role?.clinicId) : to.startsWith("/scholar") ? role?.role === "student" : true;
  return fits && to !== "/" ? to : home;
}

export function safeNext(next: string | null) {
  if (!next?.startsWith("/")) return "/";
  const base = "http://same.site";
  const u = new URL(next, base);
  return u.origin === base ? u.pathname + u.search + u.hash : "/";
}

/** Where a person lands after choosing them. */
/** Where a person lands after choosing them: their clinic, FMD Scholar for the student, else home. */
export const homeOf = (user: DemoUser) => (user.clinicId ? `/clinic/${user.clinicId}` : user.role === "student" ? "/scholar" : "/");
