"use client";

import { ArrowLeft, Bell, Download, FileClock, FileUp, Info, Plus, ShieldCheck, Sparkles, Trash2, Wallet, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button, ButtonLink, Chips, IconButton, Panel, Tag } from "@/components/app/kit";
import { Field, fieldCls, Sheet } from "@/components/app/Sheet";
import { Notice } from "@/components/Page";
import { istDate, rupees } from "@/lib/format";
import type { Me } from "@/lib/fmd";
import { useRequireMe } from "@/lib/me";
import {
  addReminder,
  budgetCsv,
  CLAIM_CHECKLIST,
  CONDITIONS,
  deleteHistory,
  deleteReminder,
  EMPTY_HISTORY,
  getBudget,
  getChecklist,
  getHistory,
  listReminders,
  newLine,
  newTreatment,
  POLICY_TERMS,
  saveBudget,
  saveChecklist,
  saveHistory,
  summarise,
  TEMPLATES,
  totals,
  updateReminder,
  type Budget,
  type DentalHistory,
  type Reminder,
  type ReportSummary,
} from "@/sample/companion";
import { listJourneys, type Journey } from "@/sample/journeys";

const download = (blob: Blob, name: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

/* ---------------- the frame every tool shares ---------------- */

const TOOL_TABS: [slug: string, label: string, Icon: LucideIcon][] = [
  ["budget", "Budget", Wallet],
  ["insurance", "Insurance", ShieldCheck],
  ["reminders", "Reminders", Bell],
  ["history", "Dental history", FileClock],
];
const BLUE = "bg-sky-600 text-white hover:bg-sky-500";
const input = `${fieldCls} h-11`;

/** a tool page: back to FMD AI, the title, a switcher between the tools, and the tool's honest-limits note */
function Frame({ tool, title, intro, label, children }: { tool: string; title: string; intro: string; label: string; children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-[720px] gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/assistant" aria-label="Back to FMD AI" title="FMD AI" className="-ml-2 grid size-10 place-items-center rounded-full text-ink hover:bg-[var(--surface-glass)]">
          <ArrowLeft className="size-5" strokeWidth={1.75} />
        </Link>
        <h1 className="mr-auto text-[22px] font-semibold text-ink">{title}</h1>
        <Tag tone="muted">Demo · saved in this browser</Tag>
      </div>
      <p className="-mt-2 text-[14px] text-ink-3">{intro}</p>

      {/* the four tools, one tap apart */}
      <nav aria-label="FMD AI tools" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {TOOL_TABS.map(([slug, l, Icon]) => (
          <Link
            key={slug}
            href={`/assistant/tools/${slug}`}
            aria-current={tool === slug ? "page" : undefined}
            className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors ${tool === slug ? "bg-sky-500/20 text-sky-300" : "bg-white/[0.06] text-ink-2 hover:bg-white/[0.1] hover:text-ink"}`}
          >
            <Icon className="size-4" strokeWidth={1.75} /> {l}
          </Link>
        ))}
      </nav>

      <p className="flex items-start gap-2.5 rounded-2xl border border-[color-mix(in_srgb,var(--tone-warn)_35%,transparent)] bg-[color-mix(in_srgb,var(--tone-warn)_8%,transparent)] px-4 py-3 text-[13.5px] font-medium text-ink">
        <Info className="mt-px size-4 shrink-0 text-[var(--tone-warn)]" strokeWidth={2} /> {label}
      </p>
      {children}
    </div>
  );
}

/** one section: a bold title (and a note on the right), then its content, in a rounded card */
function Card({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-4 rounded-2xl border border-line bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
        {note && <span className="text-[12.5px] text-ink-3">{note}</span>}
      </div>
      {children}
    </section>
  );
}

/** a dashed "add" button that runs the full width of its card */
function AddButton({ onClick, children, disabled = false }: { onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong text-[14px] font-medium text-ink-2 hover:border-sky-500/60 hover:text-ink disabled:opacity-40"
    >
      <Plus className="size-4" strokeWidth={1.75} /> {children}
    </button>
  );
}

/** the actions, kept in reach at the bottom of the screen (above the phone's tab bar) */
function SaveBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-[calc(84px+env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] p-2 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur lg:bottom-4">
      {children}
    </div>
  );
}

/** /assistant/tools/[tool] */
export function ToolPage() {
  const { tool } = useParams<{ tool: string }>();
  const me = useRequireMe();
  if (!me) return <div className="app-panel h-48 animate-pulse" aria-busy />;
  if (tool === "budget") return <BudgetTool me={me} />;
  if (tool === "insurance") return <InsuranceTool me={me} />;
  if (tool === "reminders") return <RemindersTool me={me} />;
  if (tool === "history") return <HistoryTool me={me} />;
  return (
    <Panel className="grid justify-items-start gap-3 p-6">
      <h1 className="text-[19px] font-medium text-ink">That tool doesn&apos;t exist</h1>
      <ButtonLink href="/assistant" variant="secondary">
        FMD AI
      </ButtonLink>
    </Panel>
  );
}

/* ---------------- treatment budget ---------------- */

function BudgetTool({ me }: { me: Me }) {
  const [b, setB] = useState<Budget | null>(null);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  useEffect(() => {
    getBudget(me.id).then(setB);
    listJourneys(me.id).then(setJourneys);
  }, [me.id]);
  if (!b) return <div className="app-panel h-48 animate-pulse" aria-busy />;
  const t = totals(b);
  const edit = (patch: Partial<Budget>) => (setMsg(null), setB({ ...b, ...patch }));
  const line = (id: string, patch: Partial<Budget["lines"][number]>) => edit({ lines: b.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const fromPlan = (j: Journey) => {
    const p = j.plans.at(-1)!;
    edit({ lines: p.items.map((x) => newLine(x.label, x.amount)), source: `Plan version ${p.version} from ${j.clinic.name}` });
  };
  const save = async () => {
    try {
      await saveBudget(me.id, b);
      setMsg({ kind: "success", text: "Budget saved." });
    } catch (e) {
      setMsg({ kind: "error", text: (e as Error).message });
    }
  };
  return (
    <Frame tool="budget" title="Treatment budget" intro="Add up what a treatment might cost, from your own figures or your clinic's estimate." label="Estimate, not a quote. Your dentist and insurer confirm the real amounts.">
      {journeys.some((j) => j.plans.length) && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/[0.07] p-3.5">
          <Sparkles className="size-4 text-sky-400" strokeWidth={1.75} />
          <span className="text-[14px] text-ink-2">Start from your clinic&apos;s plan:</span>
          {journeys
            .filter((j) => j.status === "in_progress")
            .map((j) => (
              <button key={j.id} type="button" onClick={() => fromPlan(j)} className="h-8 rounded-full bg-white/[0.08] px-3.5 text-[13px] font-semibold text-ink hover:bg-white/[0.14]">
                {j.title.split(",")[0]}
              </button>
            ))}
        </div>
      )}

      <Card title="Items" note={b.source ? `From: ${b.source}` : `${b.lines.length} ${b.lines.length === 1 ? "item" : "items"}`}>
        {b.lines.length === 0 && <p className="text-[14px] text-ink-3">No items yet.</p>}
        {b.lines.map((l) => (
          <div key={l.id} className="grid items-end gap-2 rounded-xl border border-line bg-white/[0.02] p-3 sm:grid-cols-[1fr_80px_130px_auto]">
            <Field label="Item">
              <input className={input} value={l.label} onChange={(e) => line(l.id, { label: e.target.value })} maxLength={120} />
            </Field>
            <Field label="Qty">
              <input className={input} type="number" min={1} value={l.qty} onChange={(e) => line(l.id, { qty: Number(e.target.value) })} />
            </Field>
            <Field label="Each (₹)">
              <input className={input} type="number" min={0} value={l.amount} onChange={(e) => line(l.id, { amount: Number(e.target.value) })} />
            </Field>
            <IconButton label={`Remove ${l.label || "item"}`} onClick={() => edit({ lines: b.lines.filter((x) => x.id !== l.id) })}>
              <X className="size-4" strokeWidth={1.75} />
            </IconButton>
          </div>
        ))}
        <AddButton onClick={() => edit({ lines: [...b.lines, newLine()] })}>Add an item</AddButton>
      </Card>

      <Card title="Discounts and insurance">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Discount from the clinic (₹)">
            <input className={input} type="number" min={0} value={b.discount} onChange={(e) => edit({ discount: Number(e.target.value) })} />
          </Field>
          <Field label="Expected from insurance (₹)" hint="Only an amount your insurer has confirmed.">
            <input className={input} type="number" min={0} value={b.insurance} onChange={(e) => edit({ insurance: Number(e.target.value) })} />
          </Field>
        </div>
      </Card>

      {/* the receipt */}
      <section aria-label="Total" className="overflow-hidden rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/[0.12] via-[var(--surface)] to-[var(--surface)]">
        <dl className="grid gap-2 p-4 text-[14.5px] sm:p-5">
          {(
            [
              ["Subtotal", rupees(t.subtotal)],
              ["Discount", `− ${rupees(t.discount)}`],
              ["Expected from insurance", `− ${rupees(t.insurance)}`],
            ] as [string, string][]
          ).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <dt className="text-ink-3">{k}</dt>
              <dd className="text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex items-baseline justify-between gap-2 border-t border-dashed border-line-strong px-4 py-4 sm:px-5">
          <span className="text-[15px] font-semibold text-ink">You may pay (estimate)</span>
          <span className="text-[26px] font-bold tracking-[-0.01em] text-ink">{rupees(t.you)}</span>
        </div>
      </section>

      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <SaveBar>
        <button
          type="button"
          onClick={() => download(new Blob([budgetCsv(b)], { type: "text/csv" }), `fmd-budget-${istDate(Date.now())}.csv`)}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-[14px] font-medium text-ink-2 hover:bg-white/[0.06] hover:text-ink"
        >
          <Download className="size-4" strokeWidth={1.75} /> Download<span className="hidden sm:inline">&nbsp;(CSV)</span>
        </button>
        <button type="button" onClick={save} className={`ml-auto h-10 rounded-lg px-6 text-[14.5px] font-semibold ${BLUE}`}>
          Save budget
        </button>
      </SaveBar>
    </Frame>
  );
}

/* ---------------- insurance explainer ---------------- */

function InsuranceTool({ me }: { me: Me }) {
  const [ticks, setTicks] = useState<boolean[] | null>(null);
  const [file, setFile] = useState<string | null>(null);
  useEffect(() => {
    getChecklist(me.id).then(setTicks);
  }, [me.id]);
  if (!ticks) return <div className="app-panel h-48 animate-pulse" aria-busy />;
  const tick = (i: number, v: boolean) => {
    const next = ticks.map((x, j) => (j === i ? v : x));
    setTicks(next);
    saveChecklist(me.id, next);
  };
  const ready = ticks.filter(Boolean).length;
  return (
    <Frame tool="insurance" title="Insurance explainer" intro="Understand the words in a dental policy, and get your claim papers together." label="We can't confirm cover or approval. Your insurer decides.">
      <Card title="Your policy or claim document">
        <label className="grid cursor-pointer justify-items-center gap-2 rounded-xl border-2 border-dashed border-line-strong px-4 py-7 text-center hover:border-sky-500/60 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-[var(--accent)]">
          <span className="grid size-12 place-items-center rounded-full bg-sky-500/15 text-sky-400">
            <FileUp className="size-6" strokeWidth={1.75} />
          </span>
          <span className="text-[15px] font-semibold text-ink">{file ? "Choose another file" : "Choose a file"}</span>
          <span className="text-[12.5px] text-ink-3">PDF, JPG or PNG</span>
          <input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)} />
        </label>
        {file && (
          <Notice kind="info">
            “{file}” stays on your device. In this demo FMD AI can&apos;t read it yet; the live version will summarise what your policy says about dental care, quoting the document.
          </Notice>
        )}
      </Card>

      <Card title="Words you'll see in a policy">
        <dl className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-line">
          {POLICY_TERMS.map(([k, v]) => (
            <div key={k} className="grid gap-0.5 px-4 py-3 text-[14px]">
              <dt className="font-semibold text-ink">{k}</dt>
              <dd className="text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="What a claim usually needs" note={`${ready} of ${CLAIM_CHECKLIST.length} ready`}>
        <span className="block h-2 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-valuemin={0} aria-valuemax={CLAIM_CHECKLIST.length} aria-valuenow={ready} aria-label="Claim papers ready">
          <span className="block h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-[width] duration-500" style={{ width: `${(ready / CLAIM_CHECKLIST.length) * 100}%` }} />
        </span>
        <p className="-mt-1 text-[13.5px] text-ink-3">General guidance. Your insurer&apos;s own list always wins. Ticks are saved for you.</p>
        <ul className="grid gap-1">
          {CLAIM_CHECKLIST.map((c, i) => (
            <li key={c}>
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-[14.5px] transition-colors hover:bg-white/[0.04] ${ticks[i] ? "text-ink-3 line-through decoration-ink-3/60" : "text-ink"}`}>
                <input type="checkbox" checked={ticks[i]} onChange={(e) => tick(i, e.target.checked)} className="mt-0.5 size-[18px] shrink-0 accent-sky-500" />
                {c}
              </label>
            </li>
          ))}
        </ul>
        <p className="text-[13.5px] text-ink-2">
          {ready} of {CLAIM_CHECKLIST.length} ready.{" "}
          <Link href="/records" className="font-semibold text-sky-400 hover:underline">
            Your invoices and reports are in Records.
          </Link>
        </p>
      </Card>
    </Frame>
  );
}

/* ---------------- reminders ---------------- */

const repeatText = (r: Reminder) => (r.every === "day" ? `Every day at ${r.time}` : r.every === "days" ? `Every ${r.days} days at ${r.time}` : `On ${r.date} at ${r.time}`);

/** an on/off switch, the phone way; a real checkbox underneath */
function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="relative inline-flex shrink-0 cursor-pointer items-center">
      <input type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.target.checked)} aria-label={label} className="peer sr-only" />
      <span className="h-7 w-12 rounded-full bg-white/[0.15] transition-colors peer-checked:bg-sky-500 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]" />
      <span className="absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
    </label>
  );
}

function RemindersTool({ me }: { me: Me }) {
  const [list, setList] = useState<Reminder[] | null>(null);
  const [today] = useState(() => istDate(Date.now()));
  const [f, setF] = useState<Omit<Reminder, "id" | "on">>({ title: "", every: "day", days: 14, time: "21:30", date: null });
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    listReminders(me.id).then(setList);
  }, [me.id]);
  if (!list) return <div className="app-panel h-48 animate-pulse" aria-busy />;
  const add = async (r: Omit<Reminder, "id" | "on">) => {
    setErr(null);
    try {
      setList(await addReminder(me.id, r, today));
      setF({ title: "", every: "day", days: 14, time: "21:30", date: null });
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <Frame
      tool="reminders"
      title="Reminders"
      intro="Small nudges for your daily care and next visits. They arrive as notifications once the FMD app is out."
      label="Reminders you set yourself. FMD doesn't watch your health or check whether you did them."
    >
      <Card title="Your reminders" note={`${list.filter((r) => r.on).length} on`}>
        {list.length === 0 ? (
          <div className="grid justify-items-center gap-2 py-6 text-center">
            <Bell className="size-8 text-ink-3" strokeWidth={1.5} />
            <p className="text-[14px] text-ink-3">None yet. Add one below.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-line">
            {list.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`grid size-10 shrink-0 place-items-center rounded-full ${r.on ? "bg-sky-500/15 text-sky-400" : "bg-white/[0.06] text-ink-3"}`}>
                  <Bell className="size-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[15px] font-medium ${r.on ? "text-ink" : "text-ink-3 line-through"}`}>{r.title}</span>
                  <span className="block text-[13px] text-ink-3">
                    {repeatText(r)}
                    {r.on ? "" : " · paused"}
                  </span>
                </span>
                <Switch on={r.on} label={`${r.title}: ${r.on ? "on" : "paused"}`} onChange={(on) => updateReminder(me.id, r.id, { on }).then(setList)} />
                <IconButton label={`Delete reminder: ${r.title}`} className="size-9" onClick={() => deleteReminder(me.id, r.id).then(setList)}>
                  <Trash2 className="size-4" strokeWidth={1.75} />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Add one">
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.filter((t) => t.every !== "once").map((t) => (
            <button key={t.title} type="button" onClick={() => add(t)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/[0.07] px-3.5 text-[13.5px] font-medium text-ink hover:bg-white/[0.12]">
              <Plus className="size-4" strokeWidth={1.75} /> {t.title}
            </button>
          ))}
        </div>
        {err && <Notice kind="error">{err}</Notice>}
        <div className="grid gap-3 sm:grid-cols-[1fr_170px_120px]">
          <Field label="What to remind you">
            <input className={input} list="fmd-reminder-ideas" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={80} />
          </Field>
          <Field label="Repeat">
            <select className={input} value={f.every} onChange={(e) => setF({ ...f, every: e.target.value as Reminder["every"], date: e.target.value === "once" ? today : null })}>
              <option value="day">Every day</option>
              <option value="days">Every few days</option>
              <option value="once">Once</option>
            </select>
          </Field>
          <Field label="Time">
            <input type="time" className={input} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />
          </Field>
        </div>
        <datalist id="fmd-reminder-ideas">
          {TEMPLATES.map((t) => (
            <option key={t.title} value={t.title} />
          ))}
        </datalist>
        {f.every === "days" && (
          <Field label="Every how many days?">
            <input type="number" min={2} max={90} className={`${input} sm:max-w-[160px]`} value={f.days} onChange={(e) => setF({ ...f, days: Number(e.target.value) })} />
          </Field>
        )}
        {f.every === "once" && (
          <Field label="Date">
            <input type="date" min={today} className={`${input} sm:max-w-[220px]`} value={f.date ?? ""} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </Field>
        )}
        <button type="button" onClick={() => add(f)} className={`h-11 rounded-xl text-[14.5px] font-semibold ${BLUE}`}>
          Add reminder
        </button>
      </Card>
    </Frame>
  );
}

/* ---------------- dental history ---------------- */

function HistoryTool({ me }: { me: Me }) {
  const [h, setH] = useState<DentalHistory | null | undefined>(undefined);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    getHistory(me.id).then(setH);
  }, [me.id]);
  if (h === undefined) return <div className="app-panel h-48 animate-pulse" aria-busy />;
  const frame = (children: ReactNode) => (
    <Frame tool="history" title="My dental history" intro="Your past treatments, allergies and medicines in one place, ready for your next visit." label="Only you see this. You choose what to share with a clinic.">
      {children}
    </Frame>
  );
  if (h === null)
    return frame(
      <section className="grid justify-items-center gap-4 rounded-2xl border border-line bg-[var(--surface)] px-6 py-10 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-sky-500/15 text-sky-400">
          <FileClock className="size-8" strokeWidth={1.5} />
        </span>
        <p className="max-w-[48ch] text-[14.5px] text-ink-2">
          This is health information, so FMD keeps it only if you choose to. You can change or delete it any time, and FMD AI uses it only to help you prepare for visits.
        </p>
        <button type="button" onClick={() => setH(EMPTY_HISTORY)} className={`h-11 rounded-xl px-6 text-[14.5px] font-semibold ${BLUE}`}>
          Start my dental history
        </button>
      </section>,
    );
  const edit = (patch: Partial<DentalHistory>) => (setMsg(null), setH({ ...h, ...patch }));
  const tr = (id: string, patch: Partial<DentalHistory["treatments"][number]>) => edit({ treatments: h.treatments.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  const save = async () => {
    try {
      await saveHistory(me.id, h);
      setMsg({ kind: "success", text: "Dental history saved." });
    } catch (e) {
      setMsg({ kind: "error", text: (e as Error).message });
    }
  };
  const area = `${fieldCls} h-24 resize-none py-2.5`;
  return frame(
    <>
      <Card title="Past treatments" note={`${h.treatments.length} added`}>
        {h.treatments.map((t) => (
          <div key={t.id} className="grid items-end gap-2 rounded-xl border border-line bg-white/[0.02] p-3 sm:grid-cols-[1fr_120px_1fr_auto]">
            <Field label="What">
              <input className={input} value={t.what} onChange={(e) => tr(t.id, { what: e.target.value })} maxLength={120} placeholder="e.g. Filling" />
            </Field>
            <Field label="When">
              <input className={input} value={t.when} onChange={(e) => tr(t.id, { when: e.target.value })} maxLength={30} placeholder="e.g. 2024" />
            </Field>
            <Field label="Where">
              <input className={input} value={t.where} onChange={(e) => tr(t.id, { where: e.target.value })} maxLength={120} />
            </Field>
            <IconButton label={`Remove ${t.what || "treatment"}`} onClick={() => edit({ treatments: h.treatments.filter((x) => x.id !== t.id) })}>
              <X className="size-4" strokeWidth={1.75} />
            </IconButton>
          </div>
        ))}
        <AddButton onClick={() => edit({ treatments: [...h.treatments, newTreatment()] })}>Add a treatment</AddButton>
      </Card>

      <Card title="Allergies and medicines">
        <Field label="Allergies" hint="Medicines, latex, anaesthetics, foods.">
          <textarea className={area} value={h.allergies} onChange={(e) => edit({ allergies: e.target.value })} maxLength={500} />
        </Field>
        <Field label="Medicines you take" hint="Include blood thinners and supplements.">
          <textarea className={area} value={h.medicines} onChange={(e) => edit({ medicines: e.target.value })} maxLength={500} />
        </Field>
      </Card>

      <Card title="Health conditions" note={`${h.conditions.length} chosen`}>
        <Chips label="Health conditions a dentist should know about" options={CONDITIONS} value={h.conditions} onChange={(conditions) => edit({ conditions })} />
      </Card>

      <Card title="Preferences">
        <Field label="Preferences" hint="e.g. nervous about injections, prefer morning visits, prefer a woman dentist.">
          <textarea className={area} value={h.preferences} onChange={(e) => edit({ preferences: e.target.value })} maxLength={500} />
        </Field>
      </Card>

      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <SaveBar>
        <button type="button" onClick={() => setConfirm(true)} className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-[14px] font-medium text-[var(--tone-bad)] hover:bg-white/[0.06]">
          <Trash2 className="size-4" strokeWidth={1.75} /> <span className="sm:hidden">Delete</span>
          <span className="hidden sm:inline">Delete my dental history</span>
        </button>
        <button type="button" onClick={save} className={`ml-auto h-10 rounded-lg px-8 text-[14.5px] font-semibold ${BLUE}`}>
          Save
        </button>
      </SaveBar>
      {confirm && (
        <Sheet title="Delete your dental history?" onClose={() => setConfirm(false)}>
          <div className="grid gap-4">
            <p className="text-[14.5px] text-ink-2">Everything on this page is deleted. Your records and appointments aren&apos;t affected.</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirm(false)}>
                Keep it
              </Button>
              <Button onClick={() => deleteHistory(me.id).then(() => (setH(null), setConfirm(false)))}>Delete</Button>
            </div>
          </div>
        </Sheet>
      )}
    </>,
  );
}

/* ---------------- report summary (on a record's page) ---------------- */

export function ReportSummaryPanel({ recordId }: { recordId: string }) {
  const [s, setS] = useState<ReportSummary | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const explain = async () => (setOpen(true), setS(await summarise(recordId)));
  return (
    <Panel className="grid gap-3 p-5">
      <h2 className="flex items-center gap-2 text-[15px] font-medium text-ink">
        <Sparkles className="size-4" strokeWidth={1.75} /> Plain-language summary
      </h2>
      {!open ? (
        <>
          <p className="text-[13.5px] text-ink-3">FMD AI can explain this document in everyday words.</p>
          <div>
            <Button variant="secondary" size="sm" onClick={explain}>
              Explain this document
            </Button>
          </div>
        </>
      ) : s === undefined ? (
        <p className="text-[13.5px] text-ink-3">Reading…</p>
      ) : s === null ? (
        <p className="text-[13.5px] text-ink-2">In this demo FMD AI can only explain documents from the demo clinic. The live version will read your own uploads too.</p>
      ) : (
        <>
          <Tag tone="accent">AI summary · not a diagnosis</Tag>
          <ul className="grid list-disc gap-1.5 pl-5 text-[14px] text-ink">
            {s.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <div>
            <p className="text-[13.5px] text-ink-3">Questions you could ask your dentist</p>
            <ul className="grid list-disc gap-1 pl-5 text-[14px] text-ink-2">
              {s.questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
          <p className="text-[12.5px] text-ink-3">{s.limits} Discuss it with your treating dentist.</p>
        </>
      )}
    </Panel>
  );
}
