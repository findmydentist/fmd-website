"use client";

import { ArrowLeft, BadgeCheck, CircleAlert, Check, Eye, Plus, Upload, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { Chips, IconButton, Panel, Tag, type Tone } from "@/components/app/kit";
import { Field, fieldCls, Sheet } from "@/components/app/Sheet";
import { useRun } from "@/components/auth/AuthForms";
import { Notice } from "@/components/Page";
import { LANGUAGES, SERVICES, SPECIALTIES } from "@/lib/catalog";
import { DISTRICTS } from "@/lib/districts";
import { account, initials, type DentistProfile, type Me } from "@/lib/fmd";
import { authChanged, useRequireMe } from "@/lib/me";
import {
  drName,
  getDocument,
  getPublicProfile,
  LIMITS,
  savePublicProfile,
  submitDocument,
  type PublicProfile,
  type VerificationDoc,
} from "@/sample/dentist";
import { Ring } from "../explore/Explore";

type Status = DentistProfile["verification_status"];

/** What each verification state means, in words a dentist understands. Shared with the Account page card. */
export const STATUS: Record<Status, { tag: string; tone: Tone; text: (council: string) => string }> = {
  unverified: { tag: "Not verified yet", tone: "warn", text: () => "FMD hasn't checked these details yet. Until it does, patients see “Registration not yet verified by FMD”." },
  pending: { tag: "Being checked", tone: "accent", text: (c) => `FMD is checking your registration with ${c}.` },
  verified: { tag: "Verified", tone: "ok", text: (c) => `FMD checked your registration with ${c}.` },
  rejected: { tag: "Couldn't verify", tone: "bad", text: () => "FMD couldn't verify these details. Check them and save again." },
};

const COUNCILS = ["Dental Council of India", ...Object.keys(DISTRICTS).map((s) => `${s} State Dental Council`)];

const submit = (fn: () => void) => (e: FormEvent) => {
  e.preventDefault();
  fn();
};
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
        <PublicSection me={me} initial={profile} verification={<VerificationCard me={me} doc={doc} onDoc={setDoc} />} />
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

/* ---------------- registration and proof (FastAPI /me/dentist-profile; the proof is a demo) ---------------- */

function VerificationCard({ me, doc, onDoc }: { me: Me; doc: VerificationDoc | null; onDoc: (d: VerificationDoc) => void }) {
  const p = me.dentist_profile;
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputId = useId();
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setErr(null);
    try {
      onDoc(await submitDocument(me.id, file));
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <section aria-label="Registration" className="grid gap-4 rounded-2xl border border-line bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-full ${p?.verification_status === "verified" ? "bg-sky-500/15 text-sky-400" : "bg-white/[0.06] text-ink-3"}`}>
          <BadgeCheck className="size-6" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[16px] font-semibold text-ink">Registration</h2>
            {p ? <Tag tone={STATUS[p.verification_status].tone}>{STATUS[p.verification_status].tag}</Tag> : <Tag tone="muted">Not added</Tag>}
          </div>
          <p className="mt-0.5 text-[13.5px] text-ink-3">{p ? STATUS[p.verification_status].text(p.council) : "Add your dental council registration so FMD can verify you."}</p>
          {p && (
            <p className="mt-1.5 text-[13.5px] text-ink-2">
              {p.council} · Reg. no. {p.registration_no}
              {p.qualifications ? ` · ${p.qualifications}` : ""}
            </p>
          )}
        </div>
      </div>
      {saved && <Notice kind="success">Registration saved.</Notice>}

      {/* the certificate (demo) */}
      <div className="grid gap-2 rounded-xl bg-white/[0.04] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[14px] font-semibold text-ink">Registration proof</span>
          {demoTag}
        </div>
        <p className="text-[13px] text-ink-3">Upload your registration certificate (PDF, JPG or PNG, up to 5 MB). Only FMD&apos;s verification team sees it.</p>
        {doc && (
          <p className="flex flex-wrap items-center gap-1.5 text-[13.5px] text-ink-2">
            <Check className="size-4 text-[var(--tone-ok)]" strokeWidth={2} />
            <span className="break-all font-medium text-ink">{doc.name}</span>· {kb(doc.size)} · submitted{" "}
            {new Date(doc.uploaded_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}
        {err && <Notice kind="error">{err}</Notice>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => (setSaved(false), setEditing(true))} className={`inline-flex h-9 items-center rounded-lg px-4 text-[13.5px] font-semibold ${p ? "bg-white/[0.08] text-ink hover:bg-white/[0.12]" : BLUE}`}>
          {p ? "Edit registration" : "Add registration"}
        </button>
        <label htmlFor={inputId} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-white/[0.08] px-4 text-[13.5px] font-semibold text-ink hover:bg-white/[0.12] focus-within:outline-2 focus-within:outline-[var(--accent)]">
          <Upload className="size-4" strokeWidth={1.75} />
          {doc ? "Replace certificate" : "Upload certificate"}
        </label>
        <input id={inputId} type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ""))} />
      </div>

      {editing && (
        <Sheet title="Registration" onClose={() => setEditing(false)}>
          <Registration me={me} onSaved={() => (setEditing(false), setSaved(true))} />
        </Sheet>
      )}
    </section>
  );
}

function Registration({ me, onSaved }: { me: Me; onSaved: () => void }) {
  const p = me.dentist_profile;
  const { busy, err, run } = useRun();
  const [f, setF] = useState({
    council: p?.council ?? "",
    registration_no: p?.registration_no ?? "",
    qualifications: p?.qualifications ?? "",
    specialisation: p?.specialisation ?? "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const resets = p && p.verification_status !== "unverified" && (f.council.trim() !== p.council || f.registration_no.trim() !== p.registration_no);

  const save = () =>
    run(async () => {
      await account.saveDentistProfile({
        council: f.council.trim(),
        registration_no: f.registration_no.trim(),
        qualifications: f.qualifications.trim() || null,
        specialisation: f.specialisation.trim() || null,
      });
      authChanged();
      onSaved();
    });

  return (
    <form onSubmit={submit(save)} className="grid gap-4">
      {err && <Notice kind="error">{err}</Notice>}
      <Field label="Dental council">
        <input className={fieldCls} list="fmd-councils" value={f.council} onChange={set("council")} minLength={2} maxLength={100} required />
      </Field>
      <Field label="Registration number">
        <input className={fieldCls} value={f.registration_no} onChange={set("registration_no")} maxLength={50} autoComplete="off" required />
      </Field>
      <Field label="Qualifications (optional)">
        <input className={fieldCls} value={f.qualifications} onChange={set("qualifications")} maxLength={200} placeholder="BDS, MDS (Endodontics)" />
      </Field>
      <Field label="Specialisation (optional)">
        <input className={fieldCls} list="fmd-specialties" value={f.specialisation} onChange={set("specialisation")} maxLength={100} />
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
      <button type="submit" disabled={busy || f.council.trim().length < 2 || !f.registration_no.trim()} className={`h-11 rounded-lg text-[14.5px] font-semibold disabled:opacity-50 ${BLUE}`}>
        {busy ? "Saving…" : p ? "Save changes" : "Save registration"}
      </button>
    </form>
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

function PublicSection({ me, initial, verification }: { me: Me; initial: PublicProfile; verification: ReactNode }) {
  const [p, setP] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const photoId = useId();
  const edit = (patch: Partial<PublicProfile>) => (setSaved(false), setDirty(true), setP((x) => ({ ...x, ...patch })));
  const setClinic = (i: number, k: "name" | "area" | "city", v: string) => edit({ clinics: p.clinics.map((c, j) => (j === i ? { ...c, [k]: v } : c)) });

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
  const save = async () => {
    setErr(null);
    try {
      setP(await savePublicProfile(me.id, p));
      setSaved(true);
      setDirty(false);
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const input = `${fieldCls} h-11`;

  return (
    <form onSubmit={submit(save)} className="grid gap-6">
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

      {verification}

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

      {err && <Notice kind="error">{err}</Notice>}
      {saved && <Notice kind="success">Public profile saved in this browser.</Notice>}

      {/* save bar: stays in reach at the bottom of the screen (above the phone's tab bar) */}
      <div className="sticky bottom-[calc(84px+env(safe-area-inset-bottom))] z-10 flex items-center gap-2 rounded-2xl border border-line bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-2 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur lg:bottom-4">
        <button type="button" onClick={() => setPreview(true)} className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-[14px] font-medium text-ink-2 hover:bg-white/[0.06] hover:text-ink">
          <Eye className="size-4" strokeWidth={1.75} /> Preview<span className="hidden sm:inline">&nbsp;as a patient</span>
        </button>
        <div className="ml-auto flex items-center gap-3">
          {dirty && <span className="hidden text-[12.5px] text-ink-3 sm:inline">Unsaved changes</span>}
          <button type="submit" className={`h-10 whitespace-nowrap rounded-lg px-6 text-[14.5px] font-semibold ${BLUE}`}>
            Save<span className="hidden sm:inline">&nbsp;public profile</span>
          </button>
        </div>
      </div>

      {preview && (
        <Sheet title="How patients see you" onClose={() => setPreview(false)} wide>
          <PatientView me={me} p={p} />
        </Sheet>
      )}
    </form>
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
