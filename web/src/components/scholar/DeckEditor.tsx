"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/app/kit";
import { Notice } from "@/components/Page";
import { AI_DISCLOSURE, deckMarkdown, deckPdf, editSlide, FORMATS, regenerate, unverifiedCount, type DeckData, type Slide } from "@/sample/scholar/decks";
import { getItem, restoreVersion, type Item } from "@/sample/scholar/workspace";
import { SourceList } from "./Answer";
import { OutlineReview } from "./Decks";
import { useScholar } from "./Shell";
import { track } from "@/lib/analytics";
import { AiNote, download, fileName, ReadOnly, reportFailure, reportUse, SectionLabel } from "./ui";

const LOOK: Record<DeckData["config"]["style"], string> = {
  plain: "bg-white text-[#1f1c18]",
  clinical: "bg-white text-[#1f1c18] border-t-[6px] border-t-[#0a3fd1]",
  bold: "bg-[#14161c] text-[#f3f1ec]",
};
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/** /scholar/decks/[id]: outline review, then the slide editor (Scholar plan parts 3.1, 3.2). */
export function DeckPage() {
  const s = useScholar();
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item<DeckData> | null | undefined>(undefined);
  const [at, setAt] = useState(0);
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [history, setHistory] = useState(false);
  const thumbs = useRef<HTMLOListElement>(null);
  const userId = s?.me.id;
  useEffect(() => {
    if (userId) getItem<DeckData>(userId, id).then(setItem);
  }, [userId, id]);
  if (!s) return null;
  if (item === undefined) return <p className="text-[15px] text-ink-3">Loading…</p>;
  if (item === null) return <Notice kind="error">That presentation no longer exists.</Notice>;

  const d = item.data;
  const head = (
    <header className="mb-6 grid gap-1">
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-4">
        {FORMATS.find((f) => f.id === d.config.format)?.label} · {d.config.minutes} min{d.slides.length ? ` · ${d.slides.length} slides` : ""}
      </p>
      <h1 className="sch-serif text-[24px] font-semibold leading-tight text-ink sm:text-[28px]">{item.title}</h1>
    </header>
  );
  if (!d.slides.length)
    return (
      <div className="mx-auto max-w-[1000px]">
        {head}
        <ReadOnly>
          <OutlineReview item={item} onChange={setItem} />
        </ReadOnly>
      </div>
    );

  const slide = d.slides[Math.min(at, d.slides.length - 1)];
  const unverified = unverifiedCount(d);
  const edit = (patch: Partial<Pick<Slide, "title" | "bullets" | "notes">>) => editSlide(s.me.id, item.id, slide.id, patch).then(setItem);
  const run = async (scope: "slide" | "section" | "deck") => {
    setBusy(true);
    setErr(null);
    try {
      setItem(await regenerate(s.me.id, item.id, scope, scope === "slide" ? slide.id : scope === "section" ? slide.section_id : null, replace));
      s.refresh();
      reportUse("deck");
    } catch (e) {
      reportFailure("deck", e);
      setErr(e instanceof Error ? e.message : "Couldn't regenerate it.");
    }
    setBusy(false);
  };
  const sectionTitle = d.sections.find((x) => x.id === slide.section_id)?.title;
  const onThumbKey = (e: React.KeyboardEvent) => {
    const by = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!by) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(d.slides.length - 1, at + by));
    setAt(next);
    thumbs.current?.querySelectorAll("button")[next]?.focus();
  };

  return (
    <div className="mx-auto max-w-[1120px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {head}
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-full border border-line-strong px-3.5 py-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink">Export</summary>
          <div className="absolute right-0 z-20 mt-2 grid w-64 gap-1 rounded-2xl border border-line bg-[var(--surface-elevated)] p-2 text-[14px]">
            <button type="button" onClick={() => (download(deckPdf(item), `${fileName(item.title)}.pdf`), track("scholar_export", { format: "pdf", ok: true }))} className="rounded-lg px-3 py-2 text-left text-ink hover:bg-[var(--surface-glass)]">
              PDF handout
            </button>
            <button type="button" onClick={() => (download(new Blob([deckMarkdown(item)], { type: "text/markdown" }), `${fileName(item.title)}.md`), track("scholar_export", { format: "markdown", ok: true }))} className="rounded-lg px-3 py-2 text-left text-ink hover:bg-[var(--surface-glass)]">
              Markdown outline
            </button>
            <span className="rounded-lg px-3 py-2 text-ink-4">PowerPoint (.pptx): coming with the file-generation service</span>
          </div>
        </details>
      </div>

      <div className="grid gap-6 lg:grid-cols-[150px_1fr_240px]">
        <ol ref={thumbs} aria-label="Slides" onKeyDown={onThumbKey} className="flex gap-2 overflow-x-auto pb-1 lg:block lg:max-h-[70vh] lg:overflow-y-auto lg:pb-0">
          {d.slides.map((x, i) => (
            <li key={x.id} className="shrink-0 lg:mb-2">
              <button
                type="button"
                aria-current={i === at ? "true" : undefined}
                tabIndex={i === at ? 0 : -1}
                onClick={() => setAt(i)}
                className={`grid h-[62px] w-[120px] content-start rounded-lg border bg-[var(--surface)] p-2 text-left text-[11px] leading-tight text-ink-3 lg:w-full ${i === at ? "border-2 border-[var(--accent)]" : "border-line"}`}
              >
                <span className="text-[10px] text-ink-4">{i + 1}</span>
                <span className="line-clamp-2">{x.title}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="grid content-start gap-3">
          <div key={`${slide.id}-${slide.variant}-${item.updated_at}`} className={`aspect-video overflow-hidden rounded-xl border border-line p-5 shadow-[0_2px_10px_rgba(0,0,0,0.05)] sm:p-8 ${LOOK[d.config.style]}`}>
            <input aria-label="Slide title" defaultValue={slide.title} onBlur={(e) => e.target.value !== slide.title && edit({ title: e.target.value })} className="sch-serif mb-3 w-full bg-transparent text-[20px] font-semibold outline-none focus:underline sm:text-[26px]" />
            <label className="sr-only" htmlFor="bullets">
              Slide points, one per line
            </label>
            <textarea
              id="bullets"
              defaultValue={slide.bullets.join("\n")}
              onBlur={(e) => e.target.value !== slide.bullets.join("\n") && edit({ bullets: e.target.value.split("\n").filter((l) => l.trim()) })}
              className="h-[calc(100%-3.5rem)] w-full resize-none bg-transparent text-[13.5px] leading-relaxed outline-none sm:text-[15px]"
            />
          </div>
          <p className="text-[12.5px] text-ink-4">
            Slide {at + 1} of {d.slides.length} · {sectionTitle}
            {slide.edited && " · edited by you"} · click the text to edit it
          </p>
          {d.config.notes && (
            <label className="grid gap-1 rounded-xl border border-dashed border-line-strong p-3 text-[13px] text-ink-3">
              <span className="font-semibold text-ink-2">Speaker notes</span>
              <textarea key={`${slide.id}-${slide.variant}-${item.updated_at}`} defaultValue={slide.notes} rows={3} onBlur={(e) => e.target.value !== slide.notes && edit({ notes: e.target.value })} className="resize-y bg-transparent text-[14px] leading-relaxed text-ink-2 outline-none" />
            </label>
          )}
          <AiNote />
        </div>

        <aside className="grid content-start gap-6">
          {slide.sources.length > 0 ? <SourceList sources={slide.sources} /> : <p className="text-[13px] text-ink-4">{d.config.citations ? "No sources on this slide." : "Sources are switched off for this deck."}</p>}
          {unverified > 0 && (
            <p className="border-l-[3px] border-[var(--sch-amber)] py-1 pl-3 text-[13px] text-[var(--sch-amber-ink)]">
              {unverified} reference{unverified === 1 ? " in this deck is" : "s in this deck are"} unverified. Check {unverified === 1 ? "it" : "them"} before you present.
            </p>
          )}
          <ReadOnly>
            <div className="grid gap-1">
              <SectionLabel as="h2">Change this</SectionLabel>
              {(
                [
                  ["slide", "Regenerate this slide"],
                  ["section", `Regenerate section (${sectionTitle})`],
                  ["deck", "Regenerate whole deck"],
                ] as const
              ).map(([scope, label]) => (
                <button key={scope} type="button" disabled={busy} onClick={() => run(scope)} className="border-t border-line py-2 text-left text-[13.5px] text-ink-2 hover:text-ink disabled:opacity-50">
                  {label}
                </button>
              ))}
              <label className="mt-2 flex items-start gap-2 text-[12.5px] text-ink-3">
                <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="mt-0.5" />
                Also replace slides I&apos;ve edited (otherwise your edits are kept)
              </label>
              {err && <Notice kind="error">{err}</Notice>}
            </div>
          </ReadOnly>
          {item.versions.length > 0 && (
            <div className="grid gap-1">
              <button type="button" onClick={() => setHistory(!history)} aria-expanded={history} className="text-left text-[13px] font-semibold text-ink-2 hover:text-ink">
                Earlier versions ({item.versions.length})
              </button>
              {history &&
                [...item.versions].reverse().map((v) => (
                  <div key={v.at} className="flex items-center justify-between border-t border-line py-1.5 text-[12.5px] text-ink-3">
                    {when(v.at)}
                    <Button size="sm" variant="secondary" onClick={() => restoreVersion(s.me.id, item.id, v.at).then((x) => setItem(x as Item<DeckData>))}>
                      Restore
                    </Button>
                  </div>
                ))}
            </div>
          )}
          <p className="text-[12px] leading-relaxed text-ink-4">{AI_DISCLOSURE}</p>
        </aside>
      </div>
    </div>
  );
}
