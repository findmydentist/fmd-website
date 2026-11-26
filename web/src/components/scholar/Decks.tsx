"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/app/kit";
import { Notice } from "@/components/Page";
import { createDeck, FORMATS, generateDeck, setSections, slideTarget, unverifiedCount, type DeckConfig, type DeckData, type Section } from "@/sample/scholar/decks";
import { listDocs, type Doc } from "@/sample/scholar/docs";
import { LEVELS, type Level } from "@/sample/scholar/topics";
import { listItems, type Item } from "@/sample/scholar/workspace";
import { useScholar } from "./Shell";
import { ItemRows, PageHead, ReadOnly, reportFailure, reportUse, SectionLabel } from "./ui";

const inputCls = "h-11 w-full rounded-xl border border-line bg-[var(--surface)] px-3 text-[15px] text-ink";

/** /scholar/decks: your presentations. */
export function DeckList() {
  const s = useScholar();
  const [items, setItems] = useState<Item[] | null>(null);
  const userId = s?.me.id;
  useEffect(() => {
    if (userId) listItems(userId, { kind: "deck" }).then(setItems);
  }, [userId]);
  if (!s) return null;
  return (
    <div className="mx-auto grid max-w-[900px] gap-6">
      <PageHead meta="Presentations" title="Seminars and presentations" lede="From a topic to an outline, then slides with speaker notes and sources you can check. Edit anything, and regenerate a slide, a section or the whole deck.">
        <div className="mt-2">
          <ButtonLink href="/scholar/decks/new">New presentation</ButtonLink>
        </div>
      </PageHead>
      {items && (items.length ? <ItemRows items={items} /> : <p className="text-[14.5px] text-ink-3">No presentations yet.</p>)}
    </div>
  );
}

/** /scholar/decks/new: what the presentation is for (Scholar plan part 3.1). */
export function DeckNew() {
  const s = useScholar();
  const router = useRouter();
  const params = useSearchParams();
  const project = params.get("project");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [c, setC] = useState<DeckConfig>({ topic: "", format: "seminar", audience: "ug", minutes: 15, slides: null, style: "plain", citations: true, notes: true, file_ids: [] });
  const [err, setErr] = useState<string | null>(null);
  const userId = s?.me.id;
  useEffect(() => {
    if (userId) listDocs(userId, project ?? undefined).then((d) => setDocs(d.filter((x) => x.status === "ready")));
  }, [userId, project]);
  if (!s) return null;
  const set = (p: Partial<DeckConfig>) => setC({ ...c, ...p });
  return (
    <div className="mx-auto grid max-w-[900px] gap-6">
      <PageHead meta="New presentation" title="What are you presenting?" lede="Scholar suggests an outline first. You can change it before any slides are made, and the outline costs nothing." />
      <ReadOnly>
        <form
          className="grid max-w-[560px] gap-5"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const d = await createDeck(s.me.id, c, project);
              router.push(`/scholar/decks/${d.id}`);
            } catch (x) {
              setErr(x instanceof Error ? x.message : "Couldn't start it.");
            }
          }}
        >
          <label className="grid gap-1.5 text-[14px] text-ink-2">
            Topic
            <input required value={c.topic} onChange={(e) => set({ topic: e.target.value })} placeholder="e.g. Irreversible pulpitis: diagnosis and management" className={inputCls} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1.5 text-[14px] text-ink-2">
              Format
              <select value={c.format} onChange={(e) => set({ format: e.target.value as DeckConfig["format"] })} className={inputCls}>
                {FORMATS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-[14px] text-ink-2">
              Audience
              <select value={c.audience} onChange={(e) => set({ audience: e.target.value as Level })} className={inputCls}>
                {LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-[14px] text-ink-2">
              Minutes
              <input type="number" min={5} max={60} value={c.minutes} onChange={(e) => set({ minutes: Number(e.target.value) || 15 })} className={inputCls} />
            </label>
            <label className="grid gap-1.5 text-[14px] text-ink-2">
              Slides
              <input type="number" min={3} max={40} value={c.slides ?? ""} placeholder={`${slideTarget({ ...c, slides: null })} (from minutes)`} onChange={(e) => set({ slides: e.target.value ? Number(e.target.value) : null })} className={inputCls} />
            </label>
          </div>
          <fieldset>
            <legend className="mb-2 text-[14px] text-ink-2">Style</legend>
            <div className="flex gap-1.5">
              {(["plain", "clinical", "bold"] as const).map((x) => (
                <button key={x} type="button" aria-pressed={c.style === x} onClick={() => set({ style: x })} className={`rounded-full border px-3.5 py-1.5 text-[13.5px] capitalize ${c.style === x ? "border-ink bg-ink font-semibold text-[var(--background)]" : "border-line-strong text-ink-3 hover:text-ink"}`}>
                  {x}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-2 text-[14.5px] text-ink-2">
            <label className="flex items-center gap-2.5">
              <input type="checkbox" checked={c.citations} onChange={(e) => set({ citations: e.target.checked })} className="size-4" /> Show sources on slides
            </label>
            <label className="flex items-center gap-2.5">
              <input type="checkbox" checked={c.notes} onChange={(e) => set({ notes: e.target.checked })} className="size-4" /> Speaker notes
            </label>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-[14px] text-ink-2">Source papers and notes</legend>
            {docs.length ? (
              docs.map((d) => (
                <label key={d.id} className="flex items-center gap-2.5 text-[14.5px] text-ink-2">
                  <input type="checkbox" checked={c.file_ids.includes(d.id)} onChange={(e) => set({ file_ids: e.target.checked ? [...c.file_ids, d.id] : c.file_ids.filter((x) => x !== d.id) })} className="size-4" />
                  {d.name}
                </label>
              ))
            ) : (
              <p className="text-[13.5px] text-ink-3">No readable files yet. Add them in a project to quote them on slides. Short quotes only, always with the page.</p>
            )}
          </fieldset>
          {err && <Notice kind="error">{err}</Notice>}
          <div>
            <Button type="submit">Suggest an outline</Button>
          </div>
        </form>
      </ReadOnly>
    </div>
  );
}

/** Outline review, before any slides exist: reorder, rename, add, remove; then generate. */
export function OutlineReview({ item, onChange }: { item: Item<DeckData>; onChange: (i: Item<DeckData>) => void }) {
  const s = useScholar()!;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const secs = item.data.sections;
  const save = (next: Section[]) => setSections(s.me.id, item.id, next).then(onChange);
  const move = (i: number, by: -1 | 1) => {
    const next = [...secs];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    save(next);
  };
  const total = secs.reduce((n, x) => n + x.slides, 0);
  return (
    <div className="grid max-w-[640px] gap-5">
      <SectionLabel as="h2">Outline · {total} slides</SectionLabel>
      <ol className="grid">
        {secs.map((sec, i) => (
          <li key={sec.id} className="flex items-center gap-2 border-t border-line py-2.5">
            <span className="w-6 text-[13px] text-ink-4">{i + 1}</span>
            <input aria-label={`Section ${i + 1} title`} defaultValue={sec.title} onBlur={(e) => e.target.value.trim() && e.target.value !== sec.title && save(secs.map((x) => (x.id === sec.id ? { ...x, title: e.target.value.trim() } : x)))} className="sch-serif min-w-0 flex-1 bg-transparent text-[17px] text-ink outline-none focus:underline" />
            <label className="flex items-center gap-1 text-[12.5px] text-ink-4">
              <input type="number" min={1} max={10} value={sec.slides} onChange={(e) => save(secs.map((x) => (x.id === sec.id ? { ...x, slides: Math.max(1, Number(e.target.value) || 1) } : x)))} className="w-12 rounded-lg border border-line bg-transparent px-1.5 py-1 text-[13px] text-ink" aria-label={`Slides in ${sec.title}`} />
              slides
            </label>
            <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${sec.title} up`} className="px-1 text-ink-3 hover:text-ink disabled:opacity-30">
              ↑
            </button>
            <button type="button" disabled={i === secs.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${sec.title} down`} className="px-1 text-ink-3 hover:text-ink disabled:opacity-30">
              ↓
            </button>
            <button type="button" disabled={secs.length <= 2} onClick={() => save(secs.filter((x) => x.id !== sec.id))} aria-label={`Remove ${sec.title}`} className="px-1 text-ink-3 hover:text-ink disabled:opacity-30">
              ×
            </button>
          </li>
        ))}
      </ol>
      <div>
        <button type="button" onClick={() => save([...secs.slice(0, -1), { id: `sec-${Date.now().toString(36)}`, title: "New section", slides: 1, kind: "content" }, ...secs.slice(-1)])} className="text-[14px] font-semibold text-[var(--accent)] hover:underline">
          Add a section
        </button>
      </div>
      <div className="grid gap-2">
        <div>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                const g = await generateDeck(s.me.id, item.id);
                onChange(g);
                s.refresh();
                reportUse("deck", unverifiedCount(g.data));
              } catch (e) {
                reportFailure("deck", e);
                setErr(e instanceof Error ? e.message : "Couldn't make the slides.");
              }
              setBusy(false);
            }}
          >
            {busy ? "Making slides…" : `Generate ${total} slides`}
          </Button>
        </div>
      </div>
      {err && <Notice kind="error">{err}</Notice>}
    </div>
  );
}
