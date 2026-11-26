"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Tag } from "@/components/app/kit";
import { Field, fieldCls, Sheet } from "@/components/app/Sheet";
import { CITIES } from "@/lib/catalog";
import { useViewer } from "@/lib/useViewer";
import type { Viewer } from "@/lib/viewer";
import {
  answer, askConsultant, canConsult, canHire, listCases, listConsultants, myConsults, myListing, offerToTake, PAY_BASIS, payText, postCase, saveListing, SPECIALTIES, visitsAsConsultant,
  type ClinicRef, type ConsultCase, type Consultant, type ConsultRequest, type Pay, type Specialty,
} from "@/sample/consults";
import { employerById } from "@/sample/jobs";
import { Monogram } from "../explore/Monogram";

/** The tag on every agreed consultation, on both sides. */
export const HiredTag = () => <Tag tone="accent">Hired consultant</Tag>;

const pill = (on: boolean) =>
  `h-10 shrink-0 rounded-full px-4 text-[13.5px] font-bold ${on ? "bg-[var(--button-primary)] text-[var(--button-primary-fg)]" : "bg-[var(--surface)] text-ink-2 shadow-[var(--shadow-card)]"}`;
const linkPill = "h-10 rounded-full bg-[var(--surface)] px-4 text-[13.5px] font-semibold leading-10 text-ink shadow-[var(--shadow-card)]";
const primary = "h-11 rounded-full bg-[var(--button-primary)] px-5 text-[14px] font-bold text-[var(--button-primary-fg)] disabled:opacity-50";
const when = (r: Pick<ConsultRequest, "date" | "start">) =>
  `${new Date(`${r.date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}, ${r.start}`;
const clinicOf = (v: Viewer): ClinicRef | null => {
  const e = v.clinicId ? employerById(v.clinicId) : undefined;
  return e && v.clinicId ? { id: v.clinicId, name: e.name, city: e.city } : null;
};
const tomorrow = () => new Date(Date.now() + 86_400_000 + 5.5 * 3_600_000).toISOString().slice(0, 10);

function Header({ title, line, back = "/jobs/consult", backLabel = "Consultation" }: { title: string; line?: string; back?: string; backLabel?: string }) {
  return (
    <header className="grid gap-3 pt-2">
      <Link href={back} className="w-fit text-[13.5px] font-semibold text-ink-3 hover:text-ink">
        ← {backLabel}
      </Link>
      <h1 className="type-display">{title}</h1>
      {line && <p className="max-w-[600px] text-[16px] text-ink-2">{line}</p>}
    </header>
  );
}


/* ---------------- the board: open cases and available consultants ---------------- */

/** /jobs/consult: cases clinics want a specialist for, and specialists who take visits. */
export function ConsultBoard() {
  const router = useRouter();
  const params = useSearchParams();
  const viewer = useViewer() ?? null;
  const tab = params.get("tab") === "consultants" ? "consultants" : "cases";
  const f = { specialty: params.get("specialty") ?? "", city: params.get("city") ?? "" };
  const [cases, setCases] = useState<ConsultCase[] | null>(null);
  const [docs, setDocs] = useState<Consultant[] | null>(null);
  const [offering, setOffering] = useState<ConsultCase | null>(null);
  const [asking, setAsking] = useState<Consultant | null>(null);
  const [openCase, setOpenCase] = useState<ConsultCase | null>(null);
  const [openDoc, setOpenDoc] = useState<Consultant | null>(null);
  const [done, setDone] = useState("");
  const key = params.toString();
  const load = () => {
    listCases(f).then(setCases);
    listConsultants(f).then(setDocs);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the query string is the input
  useEffect(load, [key]);
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    router.replace(`?${p}`, { scroll: false });
  };
  const finished = (r: ConsultRequest) => {
    setOffering(null);
    setAsking(null);
    setDone(r.status === "accepted" ? `Agreed: ${r.procedure}, ${when(r)}. It's in My consultations.` : "Sent. You'll see the answer in My consultations.");
    load();
  };

  return (
    <div className="type-read grid gap-8 pb-10">
      <header className="grid gap-3 pt-2">
        <Link href="/jobs" className="w-fit text-[13.5px] font-semibold text-ink-3 hover:text-ink">
          ← FMD Jobs
        </Link>
        <h1 className="type-display">Consultation</h1>
        <p className="max-w-[600px] text-[16px] text-ink-2">
          A specialist for a case, not a job. Clinics bring in a visiting consultant for the cases that need one; specialists list the visits they take.
        </p>
        <div className="flex flex-wrap gap-2">
          {viewer && (
            <Link href="/jobs/consult/mine" className={linkPill}>
              My consultations
            </Link>
          )}
          {canConsult(viewer) && (
            <Link href="/jobs/consult/profile" className={linkPill}>
              Your consultant listing
            </Link>
          )}
          {canHire(viewer) && (
            <Link href="/jobs/consult/new" className="h-10 rounded-full bg-[var(--button-primary)] px-4 text-[13.5px] font-semibold leading-10 text-[var(--button-primary-fg)]">
              Post a case
            </Link>
          )}
        </div>
      </header>

      {done && (
        <p role="status" className="card px-5 py-4 text-[14.5px] text-ink">
          {done}{" "}
          <Link href="/jobs/consult/mine" className="font-semibold text-[var(--accent)]">
            Open
          </Link>
        </p>
      )}

      <div className="grid gap-3">
        <div role="tablist" aria-label="Show" className="flex gap-2">
          <button type="button" role="tab" aria-selected={tab === "cases"} onClick={() => set("tab", "")} className={pill(tab === "cases")}>
            Open cases {cases ? `(${cases.length})` : ""}
          </button>
          <button type="button" role="tab" aria-selected={tab === "consultants"} onClick={() => set("tab", "consultants")} className={pill(tab === "consultants")}>
            Consultants {docs ? `(${docs.length})` : ""}
          </button>
        </div>
        <div className="relative -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
          <button type="button" aria-pressed={!f.specialty} onClick={() => set("specialty", "")} className={pill(!f.specialty)}>
            All specialties
          </button>
          {Object.entries(SPECIALTIES).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={f.specialty === k} onClick={() => set("specialty", f.specialty === k ? "" : k)} className={pill(f.specialty === k)}>
              {label}
            </button>
          ))}
          <label className="shrink-0">
            <span className="sr-only">City</span>
            <select value={f.city} onChange={(e) => set("city", e.target.value)} className="h-10 rounded-full bg-[var(--surface)] px-4 text-[13.5px] font-semibold text-ink shadow-[var(--shadow-card)]">
              <option value="">Any city</option>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {tab === "cases" ? (
        <List items={cases} empty="No open cases match these filters">
          {(c: ConsultCase) => <CaseCard key={c.id} c={c} onOpen={() => setOpenCase(c)} />}
        </List>
      ) : (
        <List items={docs} empty="No consultants match these filters">
          {(d: Consultant) => <ConsultantCard key={d.id} d={d} onOpen={() => setOpenDoc(d)} />}
        </List>
      )}

      {openCase && <CaseDetail c={openCase} viewer={viewer} onClose={() => setOpenCase(null)} onOffer={() => (setOpenCase(null), setOffering(openCase))} />}
      {openDoc && <ConsultantDetail d={openDoc} viewer={viewer} onClose={() => setOpenDoc(null)} onAsk={() => (setOpenDoc(null), setAsking(openDoc))} />}

      {offering && <VisitSheet title={`Offer to take: ${offering.procedure}`} hint={`${offering.clinic.name} can host: ${offering.when}`} onClose={() => setOffering(null)} send={(i) => offerToTake(viewer, offering.id, i).then(finished)} />}
      {asking && viewer && (
        <VisitSheet
          title={`Ask ${asking.name} to visit`}
          hint={`Usually free: ${asking.days}. Fee: ${payText(asking.pay)}.`}
          askProcedure
          onClose={() => setAsking(null)}
          send={(i) => {
            const clinic = clinicOf(viewer);
            if (!clinic) return Promise.reject(new Error("Your clinic isn't set up for hiring yet."));
            return askConsultant(viewer, clinic, asking.id, { ...i, procedure: i.procedure ?? "" }).then(finished);
          }}
        />
      )}
    </div>
  );
}

function List<T>({ items, empty, children }: { items: T[] | null; empty: string; children: (x: T) => ReactNode }) {
  if (!items)
    return (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-busy>
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-[164px] animate-pulse" />
        ))}
      </div>
    );
  if (!items.length) return <p className="card px-6 py-14 text-center text-[16px] font-semibold text-ink">{empty}</p>;
  return <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map((x) => children(x))}</ul>;
}

/* The board shows only what decides a click: what, where, for how much. Everything else waits in the detail sheet. */

/** "₹6,000" + "per case", or "40%" + "of the treatment fee": the number leads, the basis follows quietly. */
const payParts = (p: Pay): [string, string] => (p.basis === "share" ? [`${p.amount}%`, PAY_BASIS.share] : [`₹${p.amount.toLocaleString("en-IN")}`, PAY_BASIS[p.basis]]);

const cardBtn =
  "card group flex h-full w-full flex-col gap-5 p-5 text-left transition-[translate,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-6";

function Fee({ pay, size = 17 }: { pay: Pay; size?: number }) {
  const [n, basis] = payParts(pay);
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-semibold tabular-nums tracking-[-0.015em] text-ink" style={{ fontSize: size }}>
        {n}
      </span>
      <span className="text-[13px] text-ink-3">{basis}</span>
    </span>
  );
}

function CaseCard({ c, onOpen }: { c: ConsultCase; onOpen: () => void }) {
  return (
    <li className="flex">
      <button type="button" onClick={onOpen} className={cardBtn} aria-haspopup="dialog">
        <span className="grid gap-1.5">
          <span className="text-[17px] font-semibold leading-snug tracking-[-0.015em] text-ink [text-wrap:balance]">{c.procedure}</span>
          <span className="truncate text-[14px] text-ink-3">
            {c.clinic.name} · {c.area}
          </span>
        </span>
        <span className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4">
          <Fee pay={c.pay} />
          <span className="shrink-0 text-[13px] font-medium text-[var(--accent)]">
            {SPECIALTIES[c.specialty]}
            {c.cases > 1 && <span className="text-ink-3"> · {c.cases} cases</span>}
          </span>
        </span>
      </button>
    </li>
  );
}

function ConsultantCard({ d, onOpen }: { d: Consultant; onOpen: () => void }) {
  return (
    <li className="flex">
      <button type="button" onClick={onOpen} className={cardBtn} aria-haspopup="dialog">
        <span className="flex items-center gap-3.5">
          <Monogram name={d.name} size={48} />
          <span className="grid min-w-0 gap-0.5">
            <span className="truncate text-[16.5px] font-semibold tracking-[-0.015em] text-ink">{d.name}</span>
            <span className="truncate text-[14px] text-ink-3">
              {SPECIALTIES[d.specialty]} · {d.cities[0]}
              {d.cities.length > 1 && ` +${d.cities.length - 1}`}
            </span>
          </span>
        </span>
        <span className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4">
          <Fee pay={d.pay} />
          {d.days && <span className="min-w-0 truncate text-[13px] text-ink-3">{d.days}</span>}
        </span>
      </button>
    </li>
  );
}

/** A label and its value, read as a line; the detail sheets are built from these. */
function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-line py-3.5 sm:grid-cols-[128px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-[13.5px] text-ink-3">{k}</dt>
      <dd className="text-[15px] leading-[1.5] text-ink">{children}</dd>
    </div>
  );
}

/** Why someone can't act on this, said plainly where the button would be. */
const Cant = ({ children }: { children: ReactNode }) => <p className="rounded-2xl bg-[var(--surface-glass)] px-4 py-3 text-[14px] text-ink-2">{children}</p>;

function CaseDetail({ c, viewer, onOffer, onClose }: { c: ConsultCase; viewer: Viewer | null; onOffer: () => void; onClose: () => void }) {
  return (
    <Sheet title={c.procedure} onClose={onClose}>
      <div className="type-read grid gap-5">
        <div className="grid gap-1">
          <p className="text-[15px] text-ink-2">
            {c.clinic.name} · {c.area}, {c.clinic.city}
          </p>
          <p className="text-[14px] text-ink-3">
            {SPECIALTIES[c.specialty]} · {c.cases} case{c.cases > 1 ? "s" : ""}
          </p>
        </div>
        <Fee pay={c.pay} size={26} />
        <dl>
          <Row k="When">{c.when || "Ask the clinic"}</Row>
          <Row k="Clinic provides">{c.provides.join(", ") || "Not given"}</Row>
          <Row k="Bring">{c.bring.join(", ") || "Nothing special"}</Row>
          {c.note && <Row k="Note">{c.note}</Row>}
        </dl>
        {!canConsult(viewer) ? (
          <Cant>{viewer ? "Only dentists verified by FMD can take consultation cases." : "Log in as a verified dentist to take this case."}</Cant>
        ) : viewer?.clinicId === c.clinic.id ? (
          <Cant>This is your clinic&apos;s case. Offers from consultants arrive in My consultations.</Cant>
        ) : (
          <button type="button" onClick={onOffer} className={`${primary} w-full`}>
            Offer to take this
          </button>
        )}
      </div>
    </Sheet>
  );
}

function ConsultantDetail({ d, viewer, onAsk, onClose }: { d: Consultant; viewer: Viewer | null; onAsk: () => void; onClose: () => void }) {
  return (
    <Sheet title={d.name} onClose={onClose}>
      <div className="type-read grid gap-5">
        <div className="flex items-center gap-4">
          <Monogram name={d.name} size={56} />
          <div className="grid gap-0.5">
            <p className="text-[15px] font-medium text-ink">{SPECIALTIES[d.specialty]}</p>
            <p className="text-[14px] text-ink-3">
              {d.qualification} · {d.years} years
            </p>
          </div>
        </div>
        <Fee pay={d.pay} size={26} />
        {d.bio && <p className="max-w-[60ch] text-[15px] leading-[1.55] text-ink-2">{d.bio}</p>}
        <dl>
          <Row k="Takes on">{d.procedures.join(", ")}</Row>
          <Row k="Visits">{d.cities.join(", ")}</Row>
          <Row k="Usually free">{d.days || "Ask"}</Row>
        </dl>
        {canHire(viewer) ? (
          <button type="button" onClick={onAsk} className={`${primary} w-full`}>
            Ask for a visit
          </button>
        ) : (
          <Cant>{viewer?.id === d.id ? "This is your listing. Clinics see it when they look for a specialist." : "Clinics can ask a consultant for a visit."}</Cant>
        )}
      </div>
    </Sheet>
  );
}

type VisitForm = { date: string; start: string; minutes: number; note: string; procedure?: string };

function VisitSheet({ title, hint, askProcedure = false, onClose, send }: { title: string; hint: string; askProcedure?: boolean; onClose: () => void; send: (i: VisitForm) => Promise<unknown> }) {
  const [i, setI] = useState<VisitForm>({ date: tomorrow(), start: "10:00", minutes: 60, note: "", procedure: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    send(i).catch((x: Error) => {
      setErr(x.message);
      setBusy(false);
    });
  };
  return (
    <Sheet title={title} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <p className="text-[14px] text-ink-2">{hint}</p>
        {askProcedure && (
          <Field label="What the visit is for" hint="The procedure, not the patient: no names or details that identify them.">
            <input required value={i.procedure} onChange={(e) => setI({ ...i, procedure: e.target.value })} placeholder="Two impacted lower wisdom teeth" className={fieldCls} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input type="date" required min={tomorrow()} value={i.date} onChange={(e) => setI({ ...i, date: e.target.value })} className={fieldCls} />
          </Field>
          <Field label="Time">
            <input type="time" required value={i.start} onChange={(e) => setI({ ...i, start: e.target.value })} className={fieldCls} />
          </Field>
        </div>
        <Field label="How long">
          <select value={i.minutes} onChange={(e) => setI({ ...i, minutes: Number(e.target.value) })} className={fieldCls}>
            {[30, 60, 90, 120, 180, 240].map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} minutes` : `${m / 60} hour${m > 60 ? "s" : ""}`}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Note (optional)">
          <textarea value={i.note} onChange={(e) => setI({ ...i, note: e.target.value })} rows={3} className={`${fieldCls} h-auto py-2.5`} />
        </Field>
        {err && (
          <p role="alert" className="text-[14px] text-[var(--tone-bad)]">
            {err}
          </p>
        )}
        <button type="submit" disabled={busy} className={primary}>
          Send
        </button>
      </form>
    </Sheet>
  );
}

/* ---------------- my consultations ---------------- */

function RequestRow({ r, viewer, children }: { r: ConsultRequest; viewer: Viewer; children?: ReactNode }) {
  const asConsultant = r.consultant.id === viewer.id;
  return (
    <li className="card grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          {r.status === "accepted" && <HiredTag />}
          {r.status === "declined" && <Tag tone="muted">Not this time</Tag>}
          {r.status === "pending" && <Tag tone="warn">Waiting for an answer</Tag>}
          <Tag tone="muted">{SPECIALTIES[r.consultant.specialty]}</Tag>
        </div>
        <p className="text-[16px] font-bold text-ink">{r.procedure}</p>
        <p className="text-[14px] text-ink-2">
          {when(r)} · {r.minutes} min · {asConsultant ? `at ${r.clinic.name}, ${r.clinic.city}` : `with ${r.consultant.name}`}
        </p>
        <p className="text-[13.5px] text-ink-3">
          {payText(r.pay)}
          {r.note ? ` · “${r.note}”` : ""}
        </p>
      </div>
      {children}
    </li>
  );
}

/** /jobs/consult/mine: agreed visits, requests waiting for you, and what you've sent. */
export function ConsultMine() {
  const viewer = useViewer();
  const [data, setData] = useState<Awaited<ReturnType<typeof myConsults>> | null>(null);
  const [err, setErr] = useState("");
  const load = () => viewer && myConsults(viewer).then(setData);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when the viewer changes
  useEffect(() => void load(), [viewer?.id]);
  if (viewer === null) return <Header title="My consultations" line="Log in to see your consultations." />;
  const reply = (id: string, yes: boolean) => answer(viewer!, id, yes).then(load, (x: Error) => setErr(x.message));
  return (
    <div className="grid gap-8 pb-10">
      <Header title="My consultations" line="Visits you've agreed to, as a consultant or as a clinic, and requests still open." />
      {err && (
        <p role="alert" className="text-[14px] text-[var(--tone-bad)]">
          {err}
        </p>
      )}
      {!data ? (
        <div className="card h-40 animate-pulse" aria-busy />
      ) : (
        <>
          <Section title="Waiting for you" empty="Nothing to answer.">
            {data.waiting.map((r) => (
              <RequestRow key={r.id} r={r} viewer={viewer!}>
                <div className="flex gap-2">
                  <button type="button" onClick={() => reply(r.id, true)} className={primary}>
                    Agree
                  </button>
                  <button type="button" onClick={() => reply(r.id, false)} className="h-11 rounded-full px-4 text-[14px] font-semibold text-ink-2 shadow-[var(--shadow-card)]">
                    Not this time
                  </button>
                </div>
              </RequestRow>
            ))}
          </Section>
          <Section title="Appointments" empty="No agreed visits yet. Browse open cases or consultants to start one.">
            {data.visits.map((r) => (
              <RequestRow key={r.id} r={r} viewer={viewer!} />
            ))}
          </Section>
          <Section title="Sent" empty="Nothing sent.">
            {data.sent.map((r) => (
              <RequestRow key={r.id} r={r} viewer={viewer!} />
            ))}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: ReactNode[] }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-[20px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
      {children.length ? <ul className="grid gap-3">{children}</ul> : <p className="text-[14.5px] text-ink-3">{empty}</p>}
    </section>
  );
}

/* ---------------- forms: list yourself, post a case ---------------- */

const lines = (s: string) => s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);

function PayFields({ pay, onChange }: { pay: Pay; onChange: (p: Pay) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label={pay.basis === "share" ? "Share (%)" : "Fee (₹)"}>
        <input type="number" min={1} max={pay.basis === "share" ? 100 : undefined} required value={pay.amount || ""} onChange={(e) => onChange({ ...pay, amount: Number(e.target.value) })} className={fieldCls} />
      </Field>
      <Field label="Paid">
        <select value={pay.basis} onChange={(e) => onChange({ ...pay, basis: e.target.value as Pay["basis"] })} className={fieldCls}>
          {Object.entries(PAY_BASIS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function SpecialtyField({ value, onChange }: { value: Specialty; onChange: (s: Specialty) => void }) {
  return (
    <Field label="Specialty">
      <select value={value} onChange={(e) => onChange(e.target.value as Specialty)} className={fieldCls}>
        {Object.entries(SPECIALTIES).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </Field>
  );
}

function FormShell({ title, line, can, cannot, err, busy, onSubmit, children }: { title: string; line: string; can: boolean; cannot: string; err: string; busy: boolean; onSubmit: (e: FormEvent) => void; children: ReactNode }) {
  return (
    <div className="grid max-w-[640px] gap-8 pb-10">
      <Header title={title} line={line} />
      {!can ? (
        <p className="card px-6 py-8 text-[15px] text-ink-2">{cannot}</p>
      ) : (
        <form onSubmit={onSubmit} className="card grid gap-4 p-6">
          {children}
          {err && (
            <p role="alert" className="text-[14px] text-[var(--tone-bad)]">
              {err}
            </p>
          )}
          <button type="submit" disabled={busy} className={`${primary} w-fit`}>
            Save
          </button>
        </form>
      )}
    </div>
  );
}

/** /jobs/consult/profile: a verified dentist lists the visits they take. */
export function ListingForm() {
  const viewer = useViewer() ?? null;
  const router = useRouter();
  const [i, setI] = useState({ specialty: "oral_surgery" as Specialty, qualification: "", years: 1, procedures: "", cities: [] as string[], days: "", pay: { basis: "per_case", amount: 0 } as Pay, bio: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (viewer) myListing(viewer.id).then((c) => c && setI({ ...c, procedures: c.procedures.join(", ") }));
  }, [viewer]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    saveListing(viewer, { ...i, procedures: lines(i.procedures) }).then(
      () => router.push("/jobs/consult?tab=consultants"),
      (x: Error) => (setErr(x.message), setBusy(false)),
    );
  };
  return (
    <FormShell title="Your consultant listing" line="Clinics see this when they look for a specialist, and when you offer to take one of their cases." can={canConsult(viewer)} cannot="Only dentists verified by FMD can list themselves as consultants." err={err} busy={busy} onSubmit={submit}>
      <SpecialtyField value={i.specialty} onChange={(specialty) => setI({ ...i, specialty })} />
      <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
        <Field label="Qualification">
          <input required value={i.qualification} onChange={(e) => setI({ ...i, qualification: e.target.value })} placeholder="MDS (Oral and Maxillofacial Surgery)" className={fieldCls} />
        </Field>
        <Field label="Years">
          <input type="number" min={0} value={i.years} onChange={(e) => setI({ ...i, years: Number(e.target.value) })} className={fieldCls} />
        </Field>
      </div>
      <Field label="Procedures you take on" hint="Separate them with commas.">
        <input required value={i.procedures} onChange={(e) => setI({ ...i, procedures: e.target.value })} placeholder="Impacted wisdom teeth, surgical extractions" className={fieldCls} />
      </Field>
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-[13.5px] text-ink-3">Cities you visit</legend>
        <div className="flex flex-wrap gap-2">
          {CITIES.map((c) => {
            const on = i.cities.includes(c);
            return (
              <button key={c} type="button" aria-pressed={on} onClick={() => setI({ ...i, cities: on ? i.cities.filter((x) => x !== c) : [...i.cities, c] })} className={pill(on)}>
                {c}
              </button>
            );
          })}
        </div>
      </fieldset>
      <Field label="When you usually take visits">
        <input value={i.days} onChange={(e) => setI({ ...i, days: e.target.value })} placeholder="Fridays and Saturdays" className={fieldCls} />
      </Field>
      <PayFields pay={i.pay} onChange={(pay) => setI({ ...i, pay })} />
      <Field label="About you (optional)">
        <textarea value={i.bio} onChange={(e) => setI({ ...i, bio: e.target.value })} rows={3} placeholder="I bring my own surgical kit." className={`${fieldCls} h-auto py-2.5`} />
      </Field>
    </FormShell>
  );
}

/** /jobs/consult/new: a clinic posts a case it wants a specialist for. */
export function CaseForm() {
  const viewer = useViewer() ?? null;
  const router = useRouter();
  const [i, setI] = useState({ area: "", specialty: "oral_surgery" as Specialty, procedure: "", cases: 1, when: "", pay: { basis: "per_case", amount: 0 } as Pay, provides: "", bring: "", note: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const clinic = viewer ? clinicOf(viewer) : null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!clinic) return setErr("Your clinic isn't set up for hiring yet.");
    setBusy(true);
    postCase(viewer, clinic, { ...i, provides: lines(i.provides), bring: lines(i.bring) }).then(
      () => router.push("/jobs/consult"),
      (x: Error) => (setErr(x.message), setBusy(false)),
    );
  };
  return (
    <FormShell title="Post a case" line="Describe the procedure, never the patient. Consultants offer a date; you agree to the one that suits." can={canHire(viewer)} cannot="Only a clinic's team can post cases." err={err} busy={busy} onSubmit={submit}>
      <SpecialtyField value={i.specialty} onChange={(specialty) => setI({ ...i, specialty })} />
      <Field label="What needs doing" hint="No names or details that identify the patient.">
        <input required value={i.procedure} onChange={(e) => setI({ ...i, procedure: e.target.value })} placeholder="Impacted lower wisdom tooth removal" className={fieldCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cases">
          <input type="number" min={1} value={i.cases} onChange={(e) => setI({ ...i, cases: Number(e.target.value) })} className={fieldCls} />
        </Field>
        <Field label="Area">
          <input required value={i.area} onChange={(e) => setI({ ...i, area: e.target.value })} placeholder="Indiranagar" className={fieldCls} />
        </Field>
      </div>
      <Field label="When you can host the visit">
        <input value={i.when} onChange={(e) => setI({ ...i, when: e.target.value })} placeholder="Friday or Saturday morning" className={fieldCls} />
      </Field>
      <PayFields pay={i.pay} onChange={(pay) => setI({ ...i, pay })} />
      <Field label="What your clinic provides" hint="Separate them with commas.">
        <input value={i.provides} onChange={(e) => setI({ ...i, provides: e.target.value })} placeholder="Chair and assistant, OPG on site" className={fieldCls} />
      </Field>
      <Field label="What the consultant should bring">
        <input value={i.bring} onChange={(e) => setI({ ...i, bring: e.target.value })} placeholder="Own surgical kit" className={fieldCls} />
      </Field>
      <Field label="Note (optional)">
        <textarea value={i.note} onChange={(e) => setI({ ...i, note: e.target.value })} rows={3} className={`${fieldCls} h-auto py-2.5`} />
      </Field>
    </FormShell>
  );
}

/* ---------------- on the consultant's own profile ---------------- */

/** Upcoming visits where you're the hired consultant; nothing at all when there are none. */
export function ConsultAppointments({ userId }: { userId: string }) {
  const [visits, setVisits] = useState<ConsultRequest[]>([]);
  useEffect(() => {
    visitsAsConsultant(userId).then(setVisits);
  }, [userId]);
  if (!visits.length) return null;
  return (
    <section className="card grid gap-3 p-5" aria-labelledby="consult-appts">
      <div className="flex items-center justify-between gap-3">
        <h2 id="consult-appts" className="text-[17px] font-bold text-ink">
          Consultation appointments
        </h2>
        <Link href="/jobs/consult/mine" className="text-[13.5px] font-semibold text-[var(--accent)]">
          All
        </Link>
      </div>
      <ul className="grid gap-2">
        {visits.slice(0, 3).map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-[var(--surface-glass)] px-4 py-3">
            <HiredTag />
            <span className="text-[14.5px] font-semibold text-ink">{r.procedure}</span>
            <span className="text-[13.5px] text-ink-2">
              {when(r)} · {r.clinic.name}, {r.clinic.city}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
