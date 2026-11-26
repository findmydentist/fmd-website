"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/app/kit";
import { Notice } from "@/components/Page";
import { demoPdf } from "@/sample/files";
import { addReference, AI_DISCLOSURE, createResearch, draftStep, removeReference, researchMarkdown, saveResearch, STEPS, toggleReference, type Pico, type ResearchData, type StepId } from "@/sample/scholar/research";
import { getItem, listItems, type Item } from "@/sample/scholar/workspace";
import { useScholar } from "./Shell";
import { track } from "@/lib/analytics";
import { AiNote, download, fileName, ItemRows, PageHead, ReadOnly, reportFailure, reportUse, SectionLabel } from "./ui";

const inputCls = "h-11 w-full rounded-xl border border-line bg-[var(--surface)] px-3 text-[15px] text-ink";
const INTEGRITY = "Your institution may require you to disclose AI help. Scholar drafts; the research and its results are yours.";

/** /scholar/research: research projects, and a new one. */
export function ResearchList() {
  const s = useScholar();
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [title, setTitle] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const userId = s?.me.id;
  useEffect(() => {
    if (userId) listItems(userId, { kind: "research" }).then(setItems);
  }, [userId]);
  if (!s) return null;
  return (
    <div className="mx-auto grid max-w-[900px] gap-8">
      <PageHead meta="Research" title="Research help" lede="Shape a question, plan the search, draft methods and write it up. Scholar drafts; it never makes up results, data, ethics approvals or references." />
      <ReadOnly>
        <form
          className="flex max-w-[560px] flex-wrap gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const r = await createResearch(s.me.id, title);
              router.push(`/scholar/research/${r.id}`);
            } catch (x) {
              setErr(x instanceof Error ? x.message : "Couldn't create it.");
            }
          }}
        >
          <label htmlFor="r-title" className="sr-only">
            Research project title
          </label>
          <input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Working title, e.g. Fluoride varnish in schoolchildren" className={`${inputCls} min-w-0 flex-1`} />
          <Button type="submit" disabled={!title.trim()}>
            Start
          </Button>
          {err && <Notice kind="error">{err}</Notice>}
        </form>
      </ReadOnly>
      {items && items.length > 0 && (
        <section className="grid gap-2">
          <SectionLabel as="h2">Your research projects</SectionLabel>
          <ItemRows items={items} />
        </section>
      )}
    </div>
  );
}

/** /scholar/research/[id]: the steps, in any order, each a draft the student can redraft or edit. */
export function ResearchPage() {
  const s = useScholar();
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item<ResearchData> | null | undefined>(undefined);
  const [step, setStep] = useState<StepId>("question");
  const [instruction, setInstruction] = useState("");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "refused" | "error"; text: string } | null>(null);
  const userId = s?.me.id;
  useEffect(() => {
    if (userId) getItem<ResearchData>(userId, id).then(setItem);
  }, [userId, id]);
  if (!s) return null;
  if (item === undefined) return <p className="text-[15px] text-ink-3">Loading…</p>;
  if (item === null) return <Notice kind="error">That research project no longer exists.</Notice>;

  const d = item.data;
  const draft = d.drafts[step];
  const unchecked = d.references.filter((r) => !r.checked).length;
  const label = STEPS.find((x) => x.id === step)!.label;
  const run = async () => {
    setBusy(true);
    setNote(null);
    try {
      setItem(await draftStep(s.me.id, item.id, step, instruction));
      setInstruction("");
      s.refresh();
      reportUse("research");
    } catch (e) {
      reportFailure("research", e);
      const text = e instanceof Error ? e.message : "Couldn't draft it.";
      setNote({ kind: /won't make up/.test(text) ? "refused" : "error", text });
    }
    setBusy(false);
  };
  const setPico = (k: keyof Pico, v: string) => saveResearch(s.me.id, item.id, (x) => ({ ...x, pico: { ...x.pico, [k]: v } })).then(setItem);

  return (
    <div className="mx-auto max-w-[1040px]">
      <PageHead meta="Research" title={d.title} />
      <p className="mb-8 max-w-[70ch] rounded-2xl border border-line px-4 py-3 text-[14px] text-ink-2">{INTEGRITY}</p>

      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Research steps">
          <label className="grid gap-1.5 text-[14px] text-ink-2 lg:hidden">
            Step
            <select value={step} onChange={(e) => setStep(e.target.value as StepId)} className={inputCls}>
              {STEPS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                  {d.drafts[x.id] ? " ✓" : ""}
                </option>
              ))}
            </select>
          </label>
          <ol className="hidden gap-0.5 lg:grid">
            {STEPS.map((x) => (
              <li key={x.id}>
                <button
                  type="button"
                  aria-current={x.id === step ? "step" : undefined}
                  onClick={() => (setStep(x.id), setNote(null))}
                  className={`w-full rounded-lg px-2 py-1.5 text-left text-[14px] ${x.id === step ? "bg-[var(--accent-soft)] font-semibold text-ink" : "text-ink-3 hover:text-ink"}`}
                >
                  <span className={d.drafts[x.id] ? "text-[var(--accent)]" : "text-ink-4"}>{d.drafts[x.id] ? "✓ " : "○ "}</span>
                  {x.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="grid content-start gap-6">
          <h2 className="sch-serif text-[22px] font-semibold text-ink">{label}</h2>
          {step === "question" && (
            <fieldset className="grid max-w-[640px] gap-3 sm:grid-cols-2">
              <legend className="mb-1 text-[14px] text-ink-2">PICO: fill in what you know, and the draft uses it</legend>
              {(
                [
                  ["p", "Population"],
                  ["i", "Intervention or exposure"],
                  ["c", "Comparison"],
                  ["o", "Outcome"],
                ] as const
              ).map(([k, l]) => (
                <label key={k} className="grid gap-1 text-[13px] text-ink-3">
                  {l}
                  <input defaultValue={d.pico[k]} onBlur={(e) => e.target.value !== d.pico[k] && setPico(k, e.target.value)} className={inputCls} />
                </label>
              ))}
            </fieldset>
          )}
          {draft ? (
            <label className="grid gap-1">
              <span className="sr-only">{label} draft, editable</span>
              <textarea
                key={`${step}-${item.updated_at}`}
                defaultValue={draft}
                rows={Math.min(22, draft.split("\n").length + 3)}
                onBlur={(e) => e.target.value !== draft && saveResearch(s.me.id, item.id, (x) => ({ ...x, drafts: { ...x.drafts, [step]: e.target.value } })).then(setItem)}
                className="sch-serif w-full max-w-[70ch] rounded-2xl border border-line bg-[var(--surface)] p-5 text-[16px] leading-relaxed text-ink-2 outline-none focus:border-line-strong"
              />
            </label>
          ) : (
            <p className="text-[14.5px] text-ink-3">No draft for this step yet.</p>
          )}
          <ReadOnly>
            <div className="grid max-w-[640px] gap-2">
              <label htmlFor="instr" className="text-[13.5px] text-ink-3">
                Anything to focus on? (optional)
              </label>
              <input id="instr" value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="e.g. keep it to a school setting" className={inputCls} />
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={run} disabled={busy}>
                  {busy ? "Drafting…" : draft ? "Redraft" : "Draft this"}
                </Button>
              </div>
              {note?.kind === "refused" && <p className="border-l-[3px] border-[var(--sch-amber)] py-1 pl-3 text-[14px] text-[var(--sch-amber-ink)]" role="alert">{note.text}</p>}
              {note?.kind === "error" && <Notice kind="error">{note.text}</Notice>}
              {draft && <p className="text-[12.5px] text-ink-4">Redrafting keeps the previous version. Your edits save when you leave the box.</p>}
            </div>
          </ReadOnly>

          <section className="grid max-w-[640px] gap-3 border-t border-line pt-6">
            <SectionLabel as="h2">References</SectionLabel>
            <p className="text-[13.5px] text-ink-3">Add the papers you&apos;ve actually read. Scholar doesn&apos;t suggest references; tick each one once you&apos;ve checked it against the original.</p>
            {d.references.map((r) => (
              <div key={r.id} className="flex items-start gap-3 border-t border-line py-2">
                <label className="flex flex-1 items-start gap-2.5 text-[14.5px] text-ink-2">
                  <input type="checkbox" checked={r.checked} onChange={() => toggleReference(s.me.id, item.id, r.id).then(setItem)} className="mt-1" aria-label={`I've checked: ${r.text}`} />
                  <span>
                    {r.text}
                    {!r.checked && <span className="ml-2 text-[12px] font-semibold text-[var(--sch-amber-ink)]">not checked</span>}
                  </span>
                </label>
                <button type="button" onClick={() => removeReference(s.me.id, item.id, r.id).then(setItem)} className="text-[13px] text-ink-3 hover:text-ink">
                  Remove
                </button>
              </div>
            ))}
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (ref.trim()) addReference(s.me.id, item.id, ref).then((x) => (setItem(x), setRef("")));
              }}
            >
              <label htmlFor="ref" className="sr-only">
                Add a reference
              </label>
              <input id="ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Paste a reference you've read" className={`${inputCls} min-w-0 flex-1`} />
              <Button type="submit" variant="secondary" disabled={!ref.trim()}>
                Add
              </Button>
            </form>
          </section>

          <section className="grid gap-2 border-t border-line pt-6">
            <SectionLabel as="h2">Export</SectionLabel>
            {unchecked > 0 && <p className="text-[13.5px] text-[var(--sch-amber-ink)]">{unchecked} reference{unchecked === 1 ? " isn't" : "s aren't"} checked yet. They&apos;re marked in the export.</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => (download(new Blob([researchMarkdown(item)], { type: "text/markdown" }), `${fileName(d.title)}.md`), track("scholar_export", { format: "markdown", ok: true }))}>
                Markdown
              </Button>
              <Button size="sm" variant="secondary" onClick={() => download(demoPdf(d.title, researchMarkdown(item).split("\n").slice(1).map((l) => l.replace(/^#+ /, ""))), `${fileName(d.title)}.pdf`)}>
                PDF
              </Button>
            </div>
            <p className="text-[12.5px] text-ink-4">{AI_DISCLOSURE}</p>
          </section>
          <AiNote />
        </div>
      </div>
    </div>
  );
}
