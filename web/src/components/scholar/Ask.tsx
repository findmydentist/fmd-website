"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/app/kit";
import { Notice } from "@/components/Page";
import { shift } from "@/sample/scholar/ai";
import { listDocs, searchDocs, type Doc } from "@/sample/scholar/docs";
import { LEVELS, TOPICS, type Level } from "@/sample/scholar/topics";
import { ask, getItem, getPrefs, listItems, type AskData, type Item } from "@/sample/scholar/workspace";
import { AnswerView } from "./Answer";
import { useScholar } from "./Shell";
import { PageHead, ReadOnly, reportFailure, reportUse, SectionLabel } from "./ui";

const SUGGESTED = [
  "Why does irreversible pulpitis cause lingering pain?",
  "Why can an inferior alveolar nerve block fail?",
  "How are periodontitis stage and grade decided?",
];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Depth({ level, onPick, disabled }: { level: Level; onPick: (l: Level) => void; disabled: boolean }) {
  return (
    <fieldset className="grid gap-2" disabled={disabled}>
      <legend className="mb-2 text-[13.5px] font-medium text-ink-2">Depth</legend>
      <div className="flex flex-wrap gap-1.5 lg:grid lg:gap-0.5">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            type="button"
            aria-pressed={l.id === level}
            onClick={() => onPick(l.id)}
            className={`rounded-full border px-3 py-1.5 text-[13px] lg:rounded-lg lg:border-0 lg:px-2 lg:py-1 lg:text-left lg:text-[14px] ${
              l.id === level ? "border-ink bg-ink font-semibold text-[var(--background)] lg:bg-transparent lg:text-ink" : "border-line-strong text-ink-3 hover:text-ink"
            }`}
          >
            {l.id === level && <span className="mr-1.5 hidden text-[var(--accent)] lg:inline">●</span>}
            <span className="lg:hidden">{l.short}</span>
            <span className="hidden lg:inline">{l.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** /scholar/ask and /scholar/ask/[id]: doubts at your level, kept as a conversation (Scholar plan part 2.1). */
export function AskPage() {
  const s = useScholar();
  const { id } = useParams<{ id?: string }>();
  const params = useSearchParams();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [useDocs, setUseDocs] = useState<string[]>([]);
  const [item, setItem] = useState<Item<AskData> | null>(null);
  const [saved, setSaved] = useState<Item[]>([]);
  const [level, setLevel] = useState<Level>(() => (s ? getPrefs(s.me.id).level : "ug"));
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const lastHead = useRef<HTMLHeadingElement>(null);
  const userId = s?.me.id;
  const projectId = item?.project_id ?? params.get("project");

  useEffect(() => {
    if (userId && projectId)
      listDocs(userId, projectId).then((d) => {
        setDocs(d);
        setUseDocs(d.filter((x) => x.status === "ready").map((x) => x.id));
      });
  }, [userId, projectId]);

  useEffect(() => {
    if (!userId) return;
    if (id)
      getItem<AskData>(userId, id).then((x) => {
        setItem(x);
        if (x) setLevel(x.data.level);
      });
    else listItems(userId, { kind: "ask" }).then(setSaved);
  }, [userId, id]);

  if (!s) return null;
  const turns = item?.data.turns ?? [];
  const last = turns.at(-1);

  const send = async (q: string, at: Level) => {
    if (!q.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await wait(450); // demo: a model takes a moment
      const chosen = docs.filter((d) => useDocs.includes(d.id));
      const next = await ask(s.me.id, { conversationId: item?.id, text: q, level: at, project_id: projectId, fileHits: chosen.length ? searchDocs(chosen, q.replace(/^(Explain simpler|Go deeper): /, "")) : undefined, searchedFiles: chosen.length > 0 });
      const a = next.data.turns.at(-1)!.a;
      if (!a.out_of_scope && !a.refused) reportUse("ask", a.sources.filter((x) => x.kind === "unverified").length);
      setItem(next);
      setLevel(at);
      setText("");
      s.refresh();
      // give the new conversation its own address without swapping the page, so a follow-up typed meanwhile isn't lost
      if (!item) window.history.replaceState(null, "", `/scholar/ask/${next.id}`);
      requestAnimationFrame(() => lastHead.current?.focus());
    } catch (e) {
      reportFailure("ask", e);
      setErr(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const base = last?.q.replace(/^(Explain simpler|Go deeper): /, "") ?? "";
  const topic = last?.a.topic_id;
  const idx = (l: Level) => LEVELS.findIndex((x) => x.id === l);
  const pickLevel = (l: Level) => (last && l !== level ? send(`${idx(l) < idx(level) ? "Explain simpler" : "Go deeper"}: ${base}`, l) : setLevel(l));

  const next = last && !last.a.out_of_scope && !last.a.refused && (
    <div className="grid gap-2">
      <SectionLabel as="h3">Next</SectionLabel>
      <div className="grid gap-1 text-[14px]">
        <button type="button" disabled={busy || level === "beginner"} onClick={() => send(`Explain simpler: ${base}`, shift(level, -1))} className="text-left text-ink-2 hover:text-ink disabled:opacity-50">
          Explain simpler
        </button>
        <button type="button" disabled={busy || level === "specialist"} onClick={() => send(`Go deeper: ${base}`, shift(level, 1))} className="text-left text-ink-2 hover:text-ink disabled:opacity-50">
          Go deeper
        </button>
        {topic && (
          <>
            <Link href={`/scholar/study/quiz?topic=${topic}`} className="text-ink-2 hover:text-ink">
              Quiz me on this
            </Link>
            <Link href={`/scholar/study/flashcards?topic=${topic}`} className="text-ink-2 hover:text-ink">
              Make flashcards
            </Link>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[960px] pb-40">
      {!item && !id && (
        <>
          <PageHead meta="Ask" title="What would you like to understand?" lede="Ask a doubt in any subject. Pick a depth, and Scholar explains at that level, marks anything uncertain and shows where it comes from." />
          <div className="mb-8 max-w-[420px]">
            <Depth level={level} onPick={setLevel} disabled={busy} />
          </div>
          <SectionLabel as="h2">Try one</SectionLabel>
          <ul className="mb-10 mt-3 grid gap-2">
            {SUGGESTED.map((q) => (
              <li key={q}>
                <button type="button" onClick={() => send(q, level)} disabled={busy || !(s.access.status === "active" || s.access.status === "grace")} className="sch-serif text-left text-[17px] text-ink-2 hover:text-ink disabled:opacity-60">
                  {q}
                </button>
              </li>
            ))}
          </ul>
          <p className="mb-6 text-[13px] text-ink-4">The demo covers {TOPICS.map((t) => t.title.toLowerCase()).join(", ")}.</p>
          {saved.length > 0 && (
            <details className="mb-6">
              <summary className="cursor-pointer text-[14px] font-semibold text-ink-2">Saved conversations ({saved.length})</summary>
              <ul className="mt-3 grid gap-1">
                {saved.map((x) => (
                  <li key={x.id}>
                    <Link href={`/scholar/ask/${x.id}`} className="block border-t border-line py-2.5 text-[14.5px] text-ink-2 hover:text-ink">
                      {x.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      {id && !item && <p className="text-[15px] text-ink-3">Loading this conversation…</p>}

      <div aria-live="polite" className="grid gap-12">
        {turns.map((t, i) => {
          const isLast = i === turns.length - 1;
          const Head = i === 0 ? "h1" : "h2";
          return (
            <section key={i}>
              <p className="mb-2 text-[13.5px] font-medium text-ink-2">
                {i === 0 ? "Your question" : "Follow-up"}
                {isLast && ` · ${LEVELS[idx(level)].label} level`}
              </p>
              <Head ref={isLast ? lastHead : undefined} tabIndex={-1} className="sch-serif mb-5 text-[22px] font-semibold leading-tight text-ink outline-none sm:text-[28px]">
                {t.q}
              </Head>
              <AnswerView
                answer={t.a}
                margin={
                  isLast && (
                    <>
                      <Depth level={level} onPick={pickLevel} disabled={busy} />
                      {next}
                    </>
                  )
                }
              />
            </section>
          );
        })}
      </div>

      {busy && <p className="mt-8 text-[14px] text-ink-3" role="status">Thinking…</p>}
      {err && (
        <div className="mt-6 max-w-[62ch]">
          <Notice kind="error">
            {err}
          </Notice>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 px-4 pb-3 lg:bottom-0 lg:left-[248px] lg:px-10 lg:pb-5">
        <div className="mx-auto max-w-[960px]">
          <ReadOnly>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(text, level);
              }}
              className="grid gap-1.5 rounded-2xl border border-line bg-[var(--surface)] p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-end gap-2">
                <label htmlFor="scholar-q" className="sr-only">
                  {last ? "Ask a follow-up" : "Ask a question"}
                </label>
                <textarea
                  id="scholar-q"
                  rows={1}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(text, level);
                    }
                  }}
                  placeholder={last ? "Ask a follow-up…" : "Ask a question…"}
                  className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-[15.5px] text-ink outline-none placeholder:text-ink-4"
                />
                <Button type="submit" size="sm" disabled={busy || !text.trim()}>
                  Ask
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2">
                {docs.length > 0 && (
                  <details className="text-[12.5px] text-ink-3">
                    <summary className="cursor-pointer">
                      Answering from {useDocs.length} of {docs.length} file{docs.length === 1 ? "" : "s"}
                    </summary>
                    <div className="mt-1.5 grid gap-1">
                      {docs.map((d) => (
                        <label key={d.id} className={`flex items-center gap-2 ${d.status === "ready" ? "" : "opacity-60"}`}>
                          <input type="checkbox" disabled={d.status !== "ready"} checked={useDocs.includes(d.id)} onChange={(e) => setUseDocs(e.target.checked ? [...useDocs, d.id] : useDocs.filter((x) => x !== d.id))} />
                          {d.name}
                          {d.status !== "ready" && " (can't be read in the demo)"}
                        </label>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </form>
          </ReadOnly>
        </div>
      </div>
    </div>
  );
}
