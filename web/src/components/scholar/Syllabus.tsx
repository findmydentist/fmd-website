"use client";

import { ChevronDown, Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Notice } from "@/components/Page";
import { addOwnTopic, coverage, getSyllabus, removeOwnTopic, setOwnDone, setYear, YEARS, type SubjectCoverage, type SyllabusState, type Year } from "@/sample/scholar/syllabus";
import { listItems, type Item } from "@/sample/scholar/workspace";
import { useScholar } from "./Shell";
import { PageHead } from "./ui";

const LABEL_TONE = { Strong: "text-[var(--accent)]", Good: "text-ink-2", Building: "text-ink-3", Revise: "text-[var(--sch-amber-ink)]" } as const;

function AddTopic({ subject, onAdd }: { subject: SubjectCoverage; onAdd: (title: string) => string | null }) {
  const [v, setV] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const id = `add-${subject.id}`;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-full px-1 text-[13.5px] font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
        <Plus className="size-4" strokeWidth={2} aria-hidden /> Add a topic
      </button>
    );
  return (
    <form
      className="mt-2 grid gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const problem = onAdd(v);
        setErr(problem);
        if (!problem) setV("");
      }}
    >
      <label htmlFor={id} className="sr-only">
        Add a topic to {subject.name}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          autoFocus
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="Add a topic from your syllabus…"
          autoComplete="off"
          maxLength={120}
          aria-invalid={!!err}
          aria-describedby={err ? `${id}-err` : undefined}
          className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-[var(--surface)] px-3 text-[16px] text-ink caret-[var(--accent)] outline-none placeholder:text-ink-4 focus:border-[color-mix(in_srgb,var(--accent)_55%,transparent)] sm:text-[14.5px]"
        />
        <button type="submit" disabled={!v.trim()} className="h-10 shrink-0 rounded-full border border-line-strong px-4 text-[14px] font-semibold text-ink hover:bg-[var(--surface-glass)] disabled:opacity-50">
          Add
        </button>
      </div>
      {err && (
        <p id={`${id}-err`} role="alert" className="text-[13px] text-[var(--sch-amber-ink)]">
          {err}
        </p>
      )}
    </form>
  );
}

/** /scholar/syllabus: BDS subjects by year, with Scholar's topics and the student's own, and how much is covered. */
export function SyllabusPage() {
  const s = useScholar();
  const [items, setItems] = useState<Item[] | null>(null);
  // Scholar pages render only in the browser once the student is known, so storage can be read on mount
  const [state, setState] = useState<SyllabusState | null>(() => (s ? getSyllabus(s.me.id) : null));
  const userId = s?.me.id;
  useEffect(() => {
    if (userId) listItems(userId).then(setItems);
  }, [userId]);
  if (!s || !items || !state) return null;

  const year: Year = state.year ?? 4;
  const subjects = coverage(items, state, year);
  const covered = subjects.reduce((n, x) => n + x.covered, 0);
  const total = subjects.reduce((n, x) => n + x.total, 0);
  const add = (subjectId: string, title: string) => {
    try {
      setState(addOwnTopic(s.me.id, subjectId, title));
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Couldn't add that topic.";
    }
  };

  return (
    <div className="mx-auto grid max-w-[860px] gap-6">
      <PageHead
        meta="Syllabus"
        title="Your syllabus, subject by subject"
        lede="Subjects follow the DCI BDS Course Regulations. Your university's syllabus may differ, so add its topics under each subject and tick them off as you revise."
      />

      <nav aria-label="Year" className="flex flex-wrap gap-1.5">
        {YEARS.map((y) => (
          <button
            key={y.id}
            type="button"
            aria-pressed={y.id === year}
            onClick={() => setState(setYear(s.me.id, y.id))}
            className={`rounded-full border px-3.5 py-1.5 text-[13.5px] ${y.id === year ? "border-ink bg-ink font-semibold text-[var(--background)]" : "border-line-strong text-ink-3 hover:text-ink"}`}
          >
            {y.label}
          </button>
        ))}
      </nav>

      <p className="text-[15px] text-ink-2" role="status">
        {total ? (
          <>
            <b className="font-semibold tabular-nums text-ink">
              {covered} of {total}
            </b>{" "}
            topics covered in {YEARS.find((y) => y.id === year)!.label}.
          </>
        ) : (
          "Scholar has no topics for this year yet. Add your syllabus topics under each subject to track them here."
        )}
      </p>

      <div className="grid">
        {subjects.map((sub) => {
          const pct = sub.total ? Math.round((sub.covered / sub.total) * 100) : 0;
          return (
            <details key={sub.id} open={sub.total > 0} className="group border-t border-line last:border-b">
              <summary className="flex cursor-pointer list-none items-center gap-4 py-4 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1">
                  <span className="sch-serif block text-[17px] font-semibold leading-snug text-ink">{sub.name}</span>
                  <span className="mt-0.5 block text-[12.5px] tabular-nums text-ink-4">{sub.total ? `${sub.covered} of ${sub.total} covered` : "No topics yet"}</span>
                </span>
                {sub.total > 0 && (
                  <span className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-[var(--border)] sm:block" aria-hidden>
                    <i className="block h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                  </span>
                )}
                <ChevronDown className="size-4 shrink-0 text-ink-3 transition-transform duration-150 group-open:rotate-180" strokeWidth={1.8} aria-hidden />
              </summary>

              <div className="pb-5">
                {sub.rows.length > 0 && (
                  <ul className="mb-1">
                    {sub.rows.map((r) =>
                      r.kind === "scholar" ? (
                        <li key={r.topic_id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                          <span className="grid size-[18px] shrink-0 place-items-center" aria-hidden>
                            <i className={`block size-2 rounded-full ${r.label ? "bg-[var(--accent)]" : "border border-line-strong"}`} />
                          </span>
                          <span className="min-w-0 flex-1 text-[14.5px] text-ink">
                            {r.title}
                            <span className="ml-2 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-4">In Scholar</span>
                          </span>
                          {r.label ? (
                            <span className={`text-[13px] font-semibold ${LABEL_TONE[r.label]}`}>{r.label}</span>
                          ) : (
                            <Link href={`/scholar/study/quiz?topic=${r.topic_id}`} className="text-[13px] font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
                              Practise
                            </Link>
                          )}
                        </li>
                      ) : (
                        <li key={r.id} className="flex items-center gap-3 border-t border-line py-1.5 first:border-t-0">
                          <input id={r.id} type="checkbox" checked={r.done} onChange={(e) => setState(setOwnDone(s.me.id, r.id, e.target.checked))} className="size-[18px] shrink-0 accent-[var(--accent)]" />
                          <label htmlFor={r.id} className={`min-w-0 flex-1 cursor-pointer py-1 text-[14.5px] ${r.done ? "text-ink-4 line-through" : "text-ink"}`}>
                            {r.title}
                          </label>
                          <button type="button" onClick={() => setState(removeOwnTopic(s.me.id, r.id))} aria-label={`Remove ${r.title}`} className="grid size-9 place-items-center rounded-full text-ink-4 hover:bg-[var(--surface-glass)] hover:text-ink">
                            <X className="size-4" strokeWidth={1.8} aria-hidden />
                          </button>
                        </li>
                      ),
                    )}
                  </ul>
                )}
                {!sub.rows.some((r) => r.kind === "scholar") && <p className="mb-1 text-[13.5px] text-ink-3">Scholar has no material for this subject yet.</p>}
                <AddTopic subject={sub} onAdd={(t) => add(sub.id, t)} />
              </div>
            </details>
          );
        })}
      </div>
      <Notice kind="info">Practice tracking only: &quot;covered&quot; means you&apos;ve practised a topic in Scholar or ticked it yourself, not that you&apos;ve been assessed on it.</Notice>
    </div>
  );
}
