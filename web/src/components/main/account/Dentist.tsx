"use client";

import { ArrowLeft, BadgeCheck, Briefcase, CircleAlert, Check, Clock3, Eye, GraduationCap, Plus, Upload, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Chips, IconButton, Panel, Tag, type Tone } from "@/components/app/kit";
import { Field, fieldCls, Sheet } from "@/components/app/Sheet";
import { useRun } from "@/components/auth/AuthForms";
import { Notice } from "@/components/Page";
import { LANGUAGES, SERVICES, SPECIALTIES } from "@/lib/catalog";
import { DISTRICTS } from "@/lib/districts";
import { account, fmd, initials, type DentistProfile, type Me } from "@/lib/fmd";
import { authChanged, useRequireMe } from "@/lib/me";
import {
  DEGREES,
  drName,
  getDocument,
  getPublicProfile,
  LIMITS,
  newEducation,
  newExperience,
  savePublicProfile,
  submitDocument,
  type Education,
  type Experience,
  type PublicProfile,
  type VerificationDoc,
} from "@/sample/dentist";
import { Ring } from "../explore/Explore";
import { DEMO_MODE } from "@/toggle";

type Status = DentistProfile["verification_status"];

/** What each verification state means, in words a dentist understands. Shared with the Account page card. */
export const STATUS: Record<Status, { tag: string; tone: Tone; text: (council: string) => string }> = {
  unverified: { tag: "Not verified", tone: "bad", text: () => "FMD hasn't checked these details yet. Until it does, patients see “Registration not yet verified by FMD”." },
  pending: { tag: "Pending", tone: "warn", text: (c) => `Sent for verification. FMD is checking your registration with ${c}.` },
  verified: { tag: "Verified", tone: "ok", text: (c) => `FMD checked your registration with ${c}.` },
  rejected: { tag: "Couldn't verify", tone: "bad", text: () => "FMD couldn't verify these details. Check them and send again." },
};

/** the MDS subjects in India, as suggestions for a qualification's specialisation */
const MDS_SUBJECTS = [
  "Orthodontics and Dentofacial Orthopaedics",
  "Conservative Dentistry and Endodontics",
  "Periodontology",
  "Prosthodontics and Crown & Bridge",
  "Oral and Maxillofacial Surgery",
  "Paediatric and Preventive Dentistry",
  "Oral Medicine and Radiology",
  "Oral and Maxillofacial Pathology",
  "Public Health Dentistry",
];

const COUNCILS = ["Dental Council of India", ...Object.keys(DISTRICTS).map((s) => `${s} State Dental Council`)];

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const kb = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/** /account/dentist: "Edit profile", laid out like Instagram's: photo card, verification card, then the profile fields */
export function DentistProfilePage() {
  const me = useRequireMe();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [doc, setDoc] = useState<VerificationDoc | null | undefined>(undefined);
  const userId = me?.id;
  useEffect(() => {
    if (!userId) return;
    getPublicProfile(userId).then(setProfile);
    getDocument(userId).then(setDoc);
  }, [userId]);
  if (!me) return <div className="app-panel h-40 animate-pulse" aria-busy />;
  return (
    <div className="mx-auto grid w-full max-w-[680px] gap-5">
      <div className="flex items-center gap-2">
        <Link href="/account/settings" aria-label="Back to settings" title="Settings" className="-ml-2 grid size-10 place-items-center rounded-full text-ink hover:bg-[var(--surface-glass)]">
          <ArrowLeft className="size-5" strokeWidth={1.75} />
        </Link>
        <h1 className="text-[22px] font-semibold text-ink">Edit profile</h1>
      </div>
      <p className="-mt-2 text-[14px] text-ink-3">Patients see your public profile when they search FMD. FMD checks your registration before your profile shows as verified.</p>
      {!profile || doc === undefined ? (
        <div className="app-panel h-64 animate-pulse" aria-busy />
      ) : (
        <PublicSection me={me} initial={profile} verification={(api) => <VerificationForm me={me} doc={doc} onDoc={setDoc} api={api} />} />
      )}
    </div>
  );
}

export function Section({ title, tag, text, children }: { title: string; tag?: ReactNode; text?: ReactNode; children: ReactNode }) {
  return (
    <Panel as="section" className="grid gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[17px] font-medium text-ink">{title}</h2>
        {tag}
      </div>
      {text && <div className="-mt-1 text-[14.5px] text-ink-2">{text}</div>}
      {children}
    </Panel>
  );
}

const demoTag = <Tag tone="muted">Demo · saved in this browser</Tag>;
const BLUE = "bg-sky-600 text-white hover:bg-sky-500";
/** an Instagram-style form row: a bold label (and an optional note on the right) above the control */
function Row({ label, note, children }: { label: string; note?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-semibold text-ink">{label}</span>
        {note && <span className="text-[12px] text-ink-3">{note}</span>}
      </div>
      {children}
    </div>
  );
}

/* ---------------- the verification form: registration, education, certificate (FastAPI /me/dentist-profile; the rest is a demo) ---------------- */

/** a numbered step of the form */
function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: ReactNode }) {
  return (
    <fieldset className="grid gap-3 border-t border-line pt-5 first:border-t-0 first:pt-0">
      <legend className="contents">
        <span className="flex items-center gap-2.5">
          <span className={`grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-bold ${done ? "bg-emerald-500 text-white" : "bg-sky-500 text-white"}`}>
            {done ? <Check className="size-4" strokeWidth={3} /> : n}
          </span>
          <span className="text-[16px] font-semibold text-ink">{title}</span>
        </span>
      </legend>
      {children}
    </fieldset>
  );
}

/** the big status line: red not verified, yellow pending, green verified */
export function VerifyStatus({ status, className = "" }: { status: Status | null; className?: string }) {
  const s = status ?? "unverified";
  const look = { verified: "text-[var(--tone-ok)]", pending: "text-[var(--tone-warn)]", unverified: "text-[var(--tone-bad)]", rejected: "text-[var(--tone-bad)]" }[s];
  const Icon = s === "verified" ? BadgeCheck : s === "pending" ? Clock3 : CircleAlert;
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold ${look} ${className}`}>
      <Icon className="size-[1.1em]" strokeWidth={2.25} /> {STATUS[s].tag}
    </span>
  );
}

function VerificationForm({ me, doc, onDoc, api }: { me: Me; doc: VerificationDoc | null; onDoc: (d: VerificationDoc) => void; api: FormApi }) {
  const reg = me.dentist_profile;
  const { busy, err, setErr, run } = useRun();
  const [sent, setSent] = useState(false);
  const [f, setF] = useState({
    council: reg?.council ?? "",
    registration_no: reg?.registration_no ?? "",
    specialisation: reg?.specialisation ?? "",
  });
  const inputId = useId();
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => (setSent(false), setF((x) => ({ ...x, [k]: e.target.value })));
  const status = reg?.verification_status ?? null;
  const resets = reg && reg.verification_status !== "unverified" && (f.council.trim() !== reg.council || f.registration_no.trim() !== reg.registration_no);
  const edu = api.p.education;
  const eduOk = edu.length > 0 && edu.every((e) => e.degree.trim() && e.college.trim() && e.year);
  const regOk = f.council.trim().length >= 2 && !!f.registration_no.trim();
  const qualifications = edu.map((e) => (e.specialisation ? `${e.degree} (${e.specialisation})` : e.degree)).join(", ");

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setErr(null);
    try {
      onDoc(await submitDocument(me.id, file));
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const submitForm = () => {
    if (!regOk) return setErr("Add your dental council and registration number.");
    if (!eduOk) return setErr("Add your education: at least your BDS, with the college and the year you passed.");
    if (!doc) return setErr("Upload your registration certificate.");
    run(async () => {
      await api.persist(api.p); // education is part of what FMD checks
      await account.saveDentistProfile({
        council: f.council.trim(),
        registration_no: f.registration_no.trim(),
        qualifications: qualifications || null,
        specialisation: f.specialisation.trim() || null,
      });
      authChanged();
      setSent(true);
    });
  };
  const demo = (path: string) =>
    fmd<void>(path, { method: "POST" }).then(
      () => (setSent(false), authChanged()),
      (e: Error) => setErr(e.message),
    );

  return (
    <section aria-label="Verification" className="grid gap-5 rounded-2xl border border-line bg-[var(--surface)] p-4 sm:p-6">
      <div className="flex flex-wrap items-start gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-full ${status === "verified" ? "bg-emerald-500/15 text-emerald-400" : status === "pending" ? "bg-amber-500/15 text-amber-400" : "bg-rose-500/15 text-rose-400"}`}>
          <BadgeCheck className="size-6" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[18px] font-semibold text-ink">Get verified</h2>
          <p className="text-[13.5px] text-ink-3">Fill in this form and send it. FMD checks it with your dental council; your profile then shows as verified.</p>
        </div>
        <VerifyStatus status={status} className="text-[14.5px]" />
      </div>
      <p className="-mt-2 text-[13.5px] text-ink-2">{reg ? STATUS[reg.verification_status].text(reg.council) : "Add your dental council registration so FMD can verify you."}</p>

      {err && <Notice kind="error">{err}</Notice>}
      {sent && <Notice kind="success">Sent for verification. FMD will check your details with {f.council.trim()}.</Notice>}

      <Step n={1} title="Dental registration" done={regOk}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Dental council">
            <input className={`${fieldCls} h-11`} list="fmd-councils" value={f.council} onChange={set("council")} minLength={2} maxLength={100} placeholder="e.g. Kerala State Dental Council" />
          </Field>
          <Field label="Registration number">
            <input className={`${fieldCls} h-11`} value={f.registration_no} onChange={set("registration_no")} maxLength={50} autoComplete="off" />
          </Field>
        </div>
        <Field label="Specialisation (optional)">
          <input className={`${fieldCls} h-11`} list="fmd-specialties" value={f.specialisation} onChange={set("specialisation")} maxLength={100} placeholder="e.g. General Dentist, Orthodontist" />
        </Field>
        <datalist id="fmd-councils">
          {COUNCILS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <datalist id="fmd-specialties">
          {SPECIALTIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {resets && <Notice kind="info">Changing the council or registration number sends your registration back for checking.</Notice>}
      </Step>

      <Step n={2} title="Education" done={eduOk}>
        <p className="-mt-1 text-[13px] text-ink-3">Required. Add your BDS and any MDS, diploma or fellowship, with the college and the year you passed.</p>
        <EducationFields p={api.p} edit={api.edit} />
      </Step>

      <Step n={3} title="Registration certificate" done={!!doc}>
        <p className="-mt-1 text-[13px] text-ink-3">Upload your registration certificate (PDF, JPG or PNG, up to 5 MB). Only FMD&apos;s verification team sees it.</p>
        <label
          htmlFor={inputId}
          className="grid cursor-pointer justify-items-center gap-1.5 rounded-xl border-2 border-dashed border-line-strong px-4 py-6 text-center hover:border-sky-500/60 focus-within:outline-2 focus-within:outline-[var(--accent)]"
        >
          {doc ? <Check className="size-6 text-[var(--tone-ok)]" strokeWidth={2.25} /> : <Upload className="size-6 text-sky-400" strokeWidth={1.75} />}
          <span className="text-[14.5px] font-semibold text-ink">{doc ? "Replace certificate" : "Upload certificate"}</span>
          {doc ? (
            <span className="break-all text-[12.5px] text-ink-2">
              {doc.name} · {kb(doc.size)} · submitted {new Date(doc.uploaded_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          ) : (
            <span className="text-[12.5px] text-ink-3">PDF, JPG or PNG</span>
          )}
        </label>
        <input id={inputId} type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ""))} />
        <span className="w-fit">{demoTag}</span>
      </Step>

      <button type="button" onClick={submitForm} disabled={busy} className={`h-12 rounded-xl text-[15px] font-semibold disabled:opacity-50 ${BLUE}`}>
        {busy ? "Sending…" : status === "verified" ? "Save registration changes" : status === "pending" ? "Update my details" : "Submit for verification"}
      </button>

      {/* frontend demo only: play FMD's verification team, or start the new dentist over */}
      {DEMO_MODE && (
        <div className="grid gap-2 rounded-xl border border-dashed border-line-strong p-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">Demo controls</p>
          <p className="text-[12.5px] text-ink-3">
            {!reg
              ? "Fill in the three steps and submit. The status then becomes Pending."
              : reg.verification_status === "verified"
                ? "Verified: your profile shows the blue tick, and you can post in Explore and appear as verified in search."
                : "FMD's team checks the registration with the council. In the demo you can play that part:"}
          </p>
          <div className="flex flex-wrap gap-2">
            {reg && reg.verification_status !== "verified" && (
              <button type="button" onClick={() => demo("/demo/verify")} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-[13px] font-semibold text-white hover:bg-emerald-500">
                <BadgeCheck className="size-4" strokeWidth={2} /> Approve as FMD (demo)
              </button>
            )}
            {reg && (
              <button type="button" onClick={() => demo("/demo/reset-dentist")} className="inline-flex h-9 items-center rounded-lg bg-white/[0.08] px-3.5 text-[13px] font-semibold text-ink hover:bg-white/[0.12]">
                Start over (demo)
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/** degrees, diplomas and fellowships: part of the verification form (FMD checks them with the registration) */
function EducationFields({ p, edit }: { p: PublicProfile; edit: (patch: Partial<PublicProfile>) => void }) {
  const setEdu = (i: number, patch: Partial<Education>) => edit({ education: p.education.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const thisYear = new Date().getFullYear();
  return (
    <div className="grid gap-2">
      {p.education.map((e, i) => (
        <div key={i} className="grid gap-2 rounded-xl border border-line bg-[var(--surface)] p-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-5 shrink-0 text-sky-400" strokeWidth={1.75} />
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">
              {e.degree || "Qualification"}
              {e.specialisation ? ` (${e.specialisation})` : ""}
              {e.year ? ` · ${e.year}` : ""}
            </span>
            <IconButton label={`Remove ${e.degree || "this qualification"}`} className="size-9" onClick={() => edit({ education: p.education.filter((_, j) => j !== i) })}>
              <X className="size-4" strokeWidth={1.5} />
            </IconButton>
          </div>
          <div className="grid gap-2 sm:grid-cols-[150px_1fr]">
            <Field label="Degree">
              <select className={fieldCls} value={e.degree} onChange={(ev) => setEdu(i, { degree: ev.target.value })}>
                {DEGREES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Subject or specialisation (optional)">
              <input className={fieldCls} list="fmd-mds-subjects" value={e.specialisation} onChange={(ev) => setEdu(i, { specialisation: ev.target.value })} maxLength={100} placeholder="e.g. Orthodontics" />
            </Field>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_110px]">
            <Field label="College">
              <input className={fieldCls} value={e.college} onChange={(ev) => setEdu(i, { college: ev.target.value })} maxLength={150} placeholder="e.g. Government Dental College" />
            </Field>
            <Field label="University (optional)">
              <input className={fieldCls} value={e.university} onChange={(ev) => setEdu(i, { university: ev.target.value })} maxLength={150} />
            </Field>
            <Field label="Year passed">
              <input className={fieldCls} type="number" inputMode="numeric" min={1960} max={thisYear + 1} value={str(e.year)} onChange={(ev) => setEdu(i, { year: num(ev.target.value) })} placeholder={String(thisYear - 3)} />
            </Field>
          </div>
        </div>
      ))}
      <datalist id="fmd-mds-subjects">
        {MDS_SUBJECTS.map((x) => (
          <option key={x} value={x} />
        ))}
      </datalist>
      <button
        type="button"
        disabled={p.education.length >= LIMITS.education}
        onClick={() => edit({ education: [...p.education, newEducation()] })}
        className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong text-[14px] font-medium text-ink-2 hover:border-sky-500/60 hover:text-ink disabled:opacity-40"
      >
        <Plus className="size-4" strokeWidth={1.75} /> Add a qualification
      </button>
    </div>
  );
}

/** Downscale a photo to a small JPEG before it is stored, as the real upload will (PDR §10 image compression). */
async function shrink(file: File, size = 256) {
  const img = await createImageBitmap(file);
  const k = Math.min(1, size / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

const num = (v: string) => (v === "" ? null : Number(v));
const str = (n: number | null) => (n === null ? "" : String(n));

/* ---------------- the public profile (demo, saved in this browser) ---------------- */

type FormApi = { p: PublicProfile; edit: (patch: Partial<PublicProfile>) => void; persist: (p: PublicProfile) => Promise<PublicProfile> };

function PublicSection({ me, initial, verification }: { me: Me; initial: PublicProfile; verification: (api: FormApi) => ReactNode }) {
  const [p, setP] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const photoId = useId();
  const edit = (patch: Partial<PublicProfile>) => (setSaved(false), setDirty(true), setP((x) => ({ ...x, ...patch })));
  const setClinic = (i: number, k: "name" | "area" | "city", v: string) => edit({ clinics: p.clinics.map((c, j) => (j === i ? { ...c, [k]: v } : c)) });
  const setJob = (i: number, patch: Partial<Experience>) => edit({ experience: p.experience.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const thisYear = new Date().getFullYear();

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setErr(null);
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) return setErr("Choose a JPG or PNG photo under 10 MB.");
    try {
      edit({ photo: await shrink(file) });
    } catch {
      setErr("Couldn't read that photo. Try a JPG or PNG.");
    }
  };
  /** saves the whole profile (education included); the verification form uses it too */
  const persist = async (next: PublicProfile) => {
    const out = await savePublicProfile(me.id, next);
    setP(out);
    setDirty(false);
    return out;
  };
  const save = async () => {
    setErr(null);
    try {
      await persist(p);
      setSaved(true);
      setDirty(false);
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const input = `${fieldCls} h-11`;

  return (
    <div className="grid gap-6">
      {/* photo card */}
      <div className="flex items-center gap-4 rounded-2xl bg-[var(--surface-elevated)] p-4">
        <Ring>
          <Avatar name={me.full_name} photo={p.photo} size={64} />
        </Ring>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold text-ink">{drName(me.full_name)}</p>
          <p className="truncate text-[13.5px] text-ink-3">{me.dentist_profile?.specialisation || "Dentist"}</p>
          {p.photo && (
            <button type="button" onClick={() => edit({ photo: null })} className="mt-0.5 text-[13px] font-medium text-[var(--tone-bad)] hover:underline">
              Remove photo
            </button>
          )}
        </div>
        <label htmlFor={photoId} className={`inline-flex h-9 shrink-0 cursor-pointer items-center rounded-lg px-4 text-[13.5px] font-semibold focus-within:outline-2 focus-within:outline-[var(--accent)] ${BLUE}`}>
          {p.photo ? "Change photo" : "Add photo"}
        </label>
        <input id={photoId} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => (pickPhoto(e.target.files?.[0]), (e.target.value = ""))} />
      </div>

      {verification({ p, edit, persist })}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[18px] font-semibold text-ink">Public profile</h2>
        {demoTag}
      </div>
      <p className="-mt-4 text-[13.5px] text-ink-3">What patients see when they find you on FMD. Keep it factual; no guarantees or claims you can&apos;t back up.</p>

      <label className="grid gap-2">
        <span className="text-[15px] font-semibold text-ink">About you</span>
        <span className="relative block">
          <textarea
            className={`${fieldCls} h-32 resize-none pb-7 pt-2.5`}
            value={p.about}
            onChange={(e) => edit({ about: e.target.value })}
            maxLength={LIMITS.about}
            placeholder="Your approach, the treatments you focus on, and who you enjoy treating."
          />
          <span className="pointer-events-none absolute bottom-2 right-3 text-[12px] text-ink-3">
            {p.about.length} / {LIMITS.about}
          </span>
        </span>
      </label>

      <Row label="Experience and fees">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-[12.5px] text-ink-3">Years of experience</span>
            <input className={input} type="number" inputMode="numeric" min={0} max={LIMITS.years} value={str(p.years_experience)} onChange={(e) => edit({ years_experience: num(e.target.value) })} />
          </label>
          <label className="grid gap-1">
            <span className="text-[12.5px] text-ink-3">Consultation fee from (₹)</span>
            <input className={input} type="number" inputMode="numeric" min={0} max={LIMITS.fee} value={str(p.fee_min)} onChange={(e) => edit({ fee_min: num(e.target.value) })} />
          </label>
          <label className="grid gap-1">
            <span className="text-[12.5px] text-ink-3">Consultation fee to (₹)</span>
            <input className={input} type="number" inputMode="numeric" min={0} max={LIMITS.fee} value={str(p.fee_max)} onChange={(e) => edit({ fee_max: num(e.target.value) })} />
          </label>
        </div>
      </Row>

      <Row label="Languages" note={`${p.languages.length} chosen`}>
        <Chips label="Languages you consult in" options={LANGUAGES} value={p.languages} onChange={(languages) => edit({ languages })} />
      </Row>
      <Row label="Treatments" note={`${p.services.length} chosen`}>
        <Chips label="Treatments you offer" options={SERVICES} value={p.services} onChange={(services) => edit({ services })} />
      </Row>

      <Row label="Clinics where you practise" note={`${p.clinics.length} of ${LIMITS.clinics}`}>
        <div className="grid gap-2">
          {p.clinics.map((c, i) => (
            <div key={i} className="grid items-end gap-2 rounded-xl border border-line bg-[var(--surface)] p-3 sm:grid-cols-[1.3fr_1fr_1fr_auto]">
              <Field label="Clinic name">
                <input className={fieldCls} value={c.name} onChange={(e) => setClinic(i, "name", e.target.value)} maxLength={120} />
              </Field>
              <Field label="Area">
                <input className={fieldCls} value={c.area} onChange={(e) => setClinic(i, "area", e.target.value)} maxLength={80} />
              </Field>
              <Field label="City">
                <input className={fieldCls} value={c.city} onChange={(e) => setClinic(i, "city", e.target.value)} maxLength={80} />
              </Field>
              <IconButton label={`Remove ${c.name || "this clinic"}`} onClick={() => edit({ clinics: p.clinics.filter((_, j) => j !== i) })}>
                <X className="size-4" strokeWidth={1.5} />
              </IconButton>
            </div>
          ))}
          <button
            type="button"
            disabled={p.clinics.length >= LIMITS.clinics}
            onClick={() => edit({ clinics: [...p.clinics, { name: "", area: "", city: "" }] })}
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong text-[14px] font-medium text-ink-2 hover:border-sky-500/60 hover:text-ink disabled:opacity-40"
          >
            <Plus className="size-4" strokeWidth={1.75} /> Add clinic
          </button>
        </div>
      </Row>

      <Row label="Work experience" note={p.experience.length ? `${p.experience.length} of ${LIMITS.experience}` : "Optional"}>
        <p className="-mt-1 text-[13px] text-ink-3">Clinics and hospitals you&apos;ve worked at, including internships. Leave it empty if you&apos;re just starting out.</p>
        <div className="grid gap-2">
          {p.experience.map((x, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-line bg-[var(--surface)] p-3">
              <div className="flex items-center gap-2">
                <Briefcase className="size-5 shrink-0 text-sky-400" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{[x.role || "Role", x.place].filter(Boolean).join(" · ")}</span>
                <IconButton label={`Remove ${x.role || "this job"}`} className="size-9" onClick={() => edit({ experience: p.experience.filter((_, j) => j !== i) })}>
                  <X className="size-4" strokeWidth={1.5} />
                </IconButton>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Role">
                  <input className={fieldCls} value={x.role} onChange={(ev) => setJob(i, { role: ev.target.value })} maxLength={100} placeholder="e.g. Associate dentist, Intern" />
                </Field>
                <Field label="Clinic or hospital">
                  <input className={fieldCls} value={x.place} onChange={(ev) => setJob(i, { place: ev.target.value })} maxLength={150} />
                </Field>
              </div>
              <div className="grid items-end gap-2 sm:grid-cols-[1fr_110px_110px]">
                <Field label="City (optional)">
                  <input className={fieldCls} value={x.city} onChange={(ev) => setJob(i, { city: ev.target.value })} maxLength={80} />
                </Field>
                <Field label="From (year)">
                  <input className={fieldCls} type="number" inputMode="numeric" min={1960} max={thisYear + 1} value={str(x.from)} onChange={(ev) => setJob(i, { from: num(ev.target.value) })} />
                </Field>
                <Field label="To (year)">
                  <input className={fieldCls} type="number" inputMode="numeric" min={1960} max={thisYear + 1} value={x.current ? "" : str(x.to)} disabled={x.current} placeholder={x.current ? "Now" : ""} onChange={(ev) => setJob(i, { to: num(ev.target.value) })} />
                </Field>
              </div>
              <label className="flex w-fit cursor-pointer items-center gap-2.5 text-[14px] text-ink-2">
                <input type="checkbox" checked={x.current} onChange={(ev) => setJob(i, { current: ev.target.checked, to: null })} className="size-[18px] accent-sky-500" />
                I work here now
              </label>
              <Field label="What you did (optional)">
                <textarea className={`${fieldCls} h-20 resize-none py-2.5`} value={x.about} onChange={(ev) => setJob(i, { about: ev.target.value })} maxLength={LIMITS.jobAbout} placeholder="e.g. Root canals and crowns; trained new assistants." />
              </Field>
            </div>
          ))}
          <button
            type="button"
            disabled={p.experience.length >= LIMITS.experience}
            onClick={() => edit({ experience: [...p.experience, newExperience()] })}
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong text-[14px] font-medium text-ink-2 hover:border-sky-500/60 hover:text-ink disabled:opacity-40"
          >
            <Plus className="size-4" strokeWidth={1.75} /> Add experience
          </button>
        </div>
      </Row>

      <label className="grid gap-2">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-[15px] font-semibold text-ink">Memberships and awards</span>
          <span className="text-[12px] text-ink-3">Optional</span>
        </span>
        <textarea
          className={`${fieldCls} h-24 resize-none py-2.5`}
          value={p.memberships}
          onChange={(e) => edit({ memberships: e.target.value })}
          maxLength={LIMITS.memberships}
          placeholder="e.g. Member, Indian Dental Association. Best outgoing student, 2018."
        />
      </label>

      {err && <Notice kind="error">{err}</Notice>}
      {saved && <Notice kind="success">Public profile saved in this browser.</Notice>}

      {/* save bar: stays in reach at the bottom of the screen (above the phone's tab bar) */}
      <div className="sticky bottom-[calc(84px+env(safe-area-inset-bottom))] z-10 flex items-center gap-2 rounded-2xl border border-line bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-2 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur lg:bottom-4">
        <button type="button" onClick={() => setPreview(true)} className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-[14px] font-medium text-ink-2 hover:bg-white/[0.06] hover:text-ink">
          <Eye className="size-4" strokeWidth={1.75} /> Preview<span className="hidden sm:inline">&nbsp;as a patient</span>
        </button>
        <div className="ml-auto flex items-center gap-3">
          {dirty && <span className="hidden text-[12.5px] text-ink-3 sm:inline">Unsaved changes</span>}
          <button type="button" onClick={save} className={`h-10 whitespace-nowrap rounded-lg px-6 text-[14.5px] font-semibold ${BLUE}`}>
            Save<span className="hidden sm:inline">&nbsp;public profile</span>
          </button>
        </div>
      </div>

      {preview && (
        <Sheet title="How patients see you" onClose={() => setPreview(false)} wide>
          <PatientView me={me} p={p} />
        </Sheet>
      )}
    </div>
  );
}

function Avatar({ name, photo, size }: { name: string; photo: string | null; size: number }) {
  return photo ? (
    <Image src={photo} alt="" width={size} height={size} unoptimized className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-[var(--surface-elevated)] font-semibold text-ink ring-[1.5px] ring-[color-mix(in_srgb,var(--accent)_45%,transparent)]"
      style={{ width: size, height: size, fontSize: size * 0.3 }}
    >
      {initials(name)}
    </span>
  );
}

/** The profile as a patient sees it. Verified only when FMD checked it, and it says what was checked (PDR §4.4, §4.8). */
function PatientView({ me, p }: { me: Me; p: PublicProfile }) {
  const reg = me.dentist_profile;
  const verified = reg?.verification_status === "verified";
  const sub = [reg?.specialisation, p.years_experience !== null ? `${p.years_experience} years of experience` : null].filter(Boolean).join(" · ");
  const rows: [string, ReactNode][] = [
    ["Qualifications", reg?.qualifications],
    ["Languages", p.languages.join(", ")],
    ["Consultation fee", p.fee_min !== null && p.fee_max !== null ? (p.fee_min === p.fee_max ? rupees(p.fee_min) : `${rupees(p.fee_min)} – ${rupees(p.fee_max)}`) : null],
    [
      "Clinics",
      p.clinics.length ? (
        <ul className="grid gap-0.5">
          {p.clinics.map((c, i) => (
            <li key={i}>
              {c.name} · {[c.area, c.city].filter(Boolean).join(", ")}
            </li>
          ))}
        </ul>
      ) : null,
    ],
  ];
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-4">
        <Avatar name={me.full_name} photo={p.photo} size={72} />
        <div className="min-w-0">
          <p className="text-[19px] font-medium text-ink">{drName(me.full_name)}</p>
          {sub && <p className="text-[14px] text-ink-3">{sub}</p>}
          <p className={`mt-1 flex items-center gap-1.5 text-[13.5px] ${verified ? "text-[var(--tone-ok)]" : "text-ink-3"}`}>
            {verified ? <BadgeCheck className="size-4 shrink-0" strokeWidth={1.75} /> : <CircleAlert className="size-4 shrink-0" strokeWidth={1.75} />}
            {verified ? `Registration checked by FMD with ${reg!.council}` : "Registration not yet verified by FMD"}
          </p>
        </div>
      </div>
      {p.about && <p className="whitespace-pre-line text-[14.5px] text-ink-2">{p.about}</p>}
      <dl className="grid gap-2.5 text-[14px]">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="grid gap-0.5 sm:grid-cols-[160px_1fr]">
              <dt className="text-ink-3">{k}</dt>
              <dd className="text-ink">{v}</dd>
            </div>
          ))}
      </dl>
      {p.education.length > 0 && (
        <section className="grid gap-2">
          <h3 className="text-[15px] font-semibold text-ink">Education</h3>
          <ul className="grid gap-2.5">
            {p.education.map((e, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-sky-500/15 text-sky-400">
                  <GraduationCap className="size-5" strokeWidth={1.75} />
                </span>
                <span className="text-[14px] leading-snug">
                  <span className="block font-semibold text-ink">{e.college}</span>
                  <span className="block text-ink-2">
                    {e.degree}
                    {e.specialisation ? ` (${e.specialisation})` : ""}
                    {e.university ? ` · ${e.university}` : ""}
                  </span>
                  {e.year && <span className="block text-ink-3">{e.year}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {p.experience.length > 0 && (
        <section className="grid gap-2">
          <h3 className="text-[15px] font-semibold text-ink">Experience</h3>
          <ul className="grid gap-2.5">
            {p.experience.map((x, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-ink-2">
                  <Briefcase className="size-5" strokeWidth={1.75} />
                </span>
                <span className="text-[14px] leading-snug">
                  <span className="block font-semibold text-ink">{x.role}</span>
                  <span className="block text-ink-2">{[x.place, x.city].filter(Boolean).join(", ")}</span>
                  {(x.from || x.current) && (
                    <span className="block text-ink-3">
                      {x.from ?? "?"} – {x.current ? "Present" : (x.to ?? "?")}
                    </span>
                  )}
                  {x.about && <span className="mt-0.5 block text-ink-2">{x.about}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {p.memberships && (
        <p className="text-[14px] text-ink-2">
          <span className="font-semibold text-ink">Memberships and awards: </span>
          {p.memberships}
        </p>
      )}
      {p.services.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {p.services.map((s) => (
            <Tag key={s} tone="muted">
              {s}
            </Tag>
          ))}
        </div>
      )}
      <p className="text-[12.5px] text-ink-3">Demo preview: search and profile pages come later. Booking buttons appear here once clinics connect their calendars.</p>
    </div>
  );
}
