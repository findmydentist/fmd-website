/**
 * The person looking at FMD Main, whichever way they signed in: a real account (lib/me.ts, the FastAPI backend) or a
 * preview person (lib/demo.ts). Every Explore, Messages and Jobs permission is decided here, from this one shape.
 * Kept free of React so it can be tested with node --test; the hook lives in useViewer.ts.
 */
import type { DemoUser } from "./demo.ts";
import type { Me } from "./fmd.ts";

export type ViewerKind = "patient" | "dentist" | "clinic_owner" | "clinic_staff" | "student" | "company";
export type Viewer = { id: string; name: string; initials: string; kind: ViewerKind; verifiedDentist: boolean; clinicId: string | null };

const initialsOf = (name: string) =>
  name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export function fromMe(me: Me): Viewer {
  const owner = me.workspaces.find((w) => w.role === "owner");
  const staff = me.workspaces.find((w) => w.role === "receptionist");
  const verified = me.dentist_profile?.verification_status === "verified";
  const kind: ViewerKind = owner ? "clinic_owner" : me.dentist_profile ? "dentist" : staff ? "clinic_staff" : "patient";
  return {
    id: me.id,
    name: me.full_name,
    initials: initialsOf(me.full_name),
    kind,
    verifiedDentist: verified,
    clinicId: (owner ?? staff ?? me.workspaces[0])?.clinic_id ?? null,
  };
}

const DEMO_KIND: Record<DemoUser["role"], ViewerKind> = {
  patient: "patient",
  dentist: "dentist",
  clinic_owner: "clinic_owner",
  clinic_front_desk: "clinic_staff",
};

/** The preview dentist and the preview owner (a dentist who runs the clinic) count as verified. */
export function fromDemo(u: DemoUser): Viewer {
  const kind = DEMO_KIND[u.role];
  return { id: u.id, name: u.name, initials: u.initials, kind, verifiedDentist: kind === "dentist" || kind === "clinic_owner", clinicId: u.clinicId };
}

/** Explore posts, clips and moments: verified dentists, clinic owners (as the clinic) and students. Never patients. */
export const canCreate = (v: Viewer | null) => !!v && ((v.kind === "dentist" && v.verifiedDentist) || v.kind === "clinic_owner" || v.kind === "student");
/** Jobs: verified dentists, clinic owners and dental companies. */
export const canPostJobs = (v: Viewer | null) => !!v && ((v.kind === "dentist" && v.verifiedDentist) || v.kind === "clinic_owner" || v.kind === "company");
/** Reading and answering applicants: whoever can post, plus the clinic's front desk. */
export const canManageApplicants = (v: Viewer | null) => canPostJobs(v) || v?.kind === "clinic_staff";
/** Dentist-space jobs take verified dentists only. */
export const canApplyDentistRole = (v: Viewer | null) => v?.verifiedDentist === true;
