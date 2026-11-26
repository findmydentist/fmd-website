"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Notice } from "@/components/Page";
import { addToPlan, mistakes, monthStats, qotdAttempts, suggestions, topicMastery } from "@/sample/scholar/learning";
import { makeMistakeQuiz } from "@/sample/scholar/study";
import { topicById } from "@/sample/scholar/topics";
import { listItems, type Item } from "@/sample/scholar/workspace";
import { useScholar } from "./Shell";
import { PageHead, QuestionImage, SectionLabel } from "./ui";

const LABEL_TONE = { Strong: "text-[var(--accent)]", Good: "text-ink-2", Building: "text-ink-3", Revise: "text-[var(--sch-amber-ink)]" } as const;

/** /scholar/learning, "My learning": how preparation is going, by topic, and what to do next. Practice, not grading. */
export function LearningPage() {
  const s = useScholar();
  const [items, setItems] = useState<Item[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const userId = s?.me.id;
  const load = useCallback(() => {
    if (userId)
      listItems(userId).then((x) => {
        setNow(Date.now());
        setItems(x);
      });
  }, [userId]);
  useEffect(load, [load]);
  if (!s || items === null) return null;

  const stats = monthStats(items, now);
  const mastery = topicMastery(items);
  const ideas = suggestions(items, now);
  const open = mistakes(items, qotdAttempts(s.me.id));
  const practise = async () => {
    setBusy(true);
    try {
      const it = await makeMistakeQuiz(s.me.id, open);
      router.push(`/scholar/study/quiz?id=${it.id}`);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  };
  const STATS = [
    [String(stats.studyDays), stats.studyDays === 1 ? "study day this month" : "study days this month"],
    [stats.avgQuiz === null ? "–" : `${stats.avgQuiz}%`, "average quiz score"],
    [String(stats.vivas), stats.vivas === 1 ? "viva practised" : "vivas practised"],
    [stats.planTotal ? `${stats.planDone} / ${stats.planTotal}` : "–", "plan days done"],
  ];

  return (
    <div className="mx-auto grid max-w-[1000px] gap-6">
      <PageHead meta="My learning" title="How your preparation is going" lede="Worked out from your quizzes, viva self-ratings and revision plan. It's a guide for practice, not an assessment.">
        <Link href="/scholar/syllabus" className="text-[14px] font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
          See coverage by subject in Syllabus
        </Link>
      </PageHead>
      {note && <Notice kind="success">{note}</Notice>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map(([n, label]) => (
          <div key={label} className="rounded-2xl border border-line bg-[var(--surface)] p-4">
            <p className="text-[26px] font-bold tabular-nums text-ink">{n}</p>
            <p className="text-[13px] text-ink-3">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <section className="rounded-2xl border border-line bg-[var(--surface)] p-4 sm:p-5">
          <SectionLabel as="h2">By topic</SectionLabel>
          {mastery.length ? (
            <ul className="mt-3">
              {mastery.map((m) => (
                <li key={m.topic_id} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_72px] items-center gap-3 border-t border-line py-3 text-[14px] first:border-t-0">
                  <span className="min-w-0">
                    <span className="block truncate text-ink">{m.title}</span>
                    <span className="block text-[12px] text-ink-4">
                      {m.quizzes} {m.quizzes === 1 ? "quiz" : "quizzes"}
                      {m.vivas ? " · viva ratings" : ""}
                    </span>
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
                    <i className={`block h-full rounded-full ${m.score < 50 ? "bg-[var(--sch-amber)]" : "bg-[var(--accent)]"}`} style={{ width: `${m.score}%` }} />
                  </span>
                  <span className={`text-right text-[13px] font-semibold ${LABEL_TONE[m.label]}`}>{m.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[14px] text-ink-3">
              Nothing to show yet.{" "}
              <Link href="/scholar/study/quiz" className="font-semibold text-[var(--accent)] hover:underline">
                Take a quiz
              </Link>{" "}
              or practise a viva and rate yourself, and each topic appears here.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[var(--accent-soft)] p-4 sm:p-5">
          <SectionLabel as="h2">Suggestions</SectionLabel>
          <ol className="mt-3 grid gap-4">
            {ideas.map((x, i) => (
              <li key={x.topic_id} className="grid gap-2">
                <p className="text-[14.5px] leading-relaxed text-ink-2">
                  {i + 1}. {x.text}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href={x.action.href} className="rounded-full bg-[var(--button-primary)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--button-primary-fg)]">
                    {x.action.label}
                  </Link>
                  <button
                    type="button"
                    onClick={async () => setNote((await addToPlan(s.me.id, topicById(x.topic_id)!.title)) ? "Added to tomorrow in your revision plan." : "Make a revision plan first, then you can add topics to it.")}
                    className="rounded-full border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--accent)]"
                  >
                    Add to my plan
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section aria-labelledby="notebook" className="rounded-2xl border border-line bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <SectionLabel as="h2">
            <span id="notebook">Mistake notebook{open.length ? ` · ${open.length}` : ""}</span>
          </SectionLabel>
          {open.length > 0 && (
            <button type="button" onClick={practise} disabled={busy} className="rounded-full bg-[var(--button-primary)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--button-primary-fg)] disabled:opacity-60">
              {busy ? "Making the quiz…" : open.length > 10 ? "Quiz me on 10 of them" : "Quiz me on these"}
            </button>
          )}
        </div>
        {open.length ? (
          <ul className="mt-3">
            {open.map((m) => (
              <li key={m.q.q} className="grid gap-1 border-t border-line py-3.5 first:border-t-0">
                {m.q.image && (
                  <div className="mb-1.5">
                    <QuestionImage image={m.q.image} compact />
                  </div>
                )}
                <p className="sch-serif text-[16.5px] leading-snug text-ink">{m.q.q}</p>
                <p className="max-w-[70ch] text-[14px] leading-relaxed text-ink-2">
                  Answer: <b className="font-semibold">{m.q.options[m.q.answer]}</b>. {m.q.why}
                </p>
                <p className="text-[12.5px] text-ink-4">
                  {topicById(m.topic_id)?.title ?? "Mixed"} · {m.times === 1 ? "missed once" : `missed ${m.times} times`} · last on{" "}
                  {new Date(m.last).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[14px] text-ink-3">No open mistakes. Questions you get wrong in quizzes and the question of the day wait here, with the answer, until you get them right.</p>
        )}
      </section>
    </div>
  );
}
