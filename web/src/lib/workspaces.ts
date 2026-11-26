import type { DemoUser } from "./demo.ts";
import { initials, type Me } from "./fmd.ts";

/** An app a person can open beyond FMD Main: their clinic in FMD Clinic, or FMD Scholar for a dental student. */
export type Workspace = { href: string; title: string; detail: string; kind: "clinic" | "scholar" };

const ROLE = {
  owner: ["clinic_owner", "Owner"],
  dentist: ["dentist", "Dentist"],
  receptionist: ["clinic_front_desk", "Front desk"],
} as const;

/**
 * Who FMD Clinic shows for this clinic: the chosen demo role when it works here, else the logged-in account's own
 * membership of the clinic (so someone who logged in by typing their number still opens their clinic), else nobody.
 */
export function clinicPerson(me: Me | null | undefined, demo: DemoUser | null | undefined, clinicId: string): DemoUser | null {
  if (demo?.clinicId === clinicId) return demo;
  const ws = me?.workspaces.find((w) => w.clinic_id === clinicId);
  if (!me || !ws) return null;
  const [role, title] = ROLE[ws.role];
  return { id: me.id, name: me.full_name, initials: initials(me.full_name), role, title, clinicId };
}

/** The workspaces to offer in the profile menu, for the logged-in account and the chosen demo role. */
export function workspacesOf(me: Me | null | undefined, demo: DemoUser | null | undefined): Workspace[] {
  const out: Workspace[] = [];
  for (const w of me?.workspaces ?? []) out.push({ href: `/clinic/${w.clinic_id}`, title: "FMD Clinic", detail: `${w.clinic_name} · ${ROLE[w.role][1]}`, kind: "clinic" });
  if (demo?.clinicId && !out.some((w) => w.href === `/clinic/${demo.clinicId}`)) out.push({ href: `/clinic/${demo.clinicId}`, title: "FMD Clinic", detail: demo.title, kind: "clinic" });
  if (demo?.role === "student" || me?.id === "demo-student") out.push({ href: "/scholar", title: "FMD Scholar", detail: "Your study workspace", kind: "scholar" });
  return out;
}
