"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/app/kit";
import { Notice } from "@/components/Page";
import { addDays, dueCards, dueOn, makeStudy, missedDays, MIXED, nextCard, rateCard, reschedulePlan, scheduleCard, scoreQuiz, todayIST, type CardsData, type DueCard, type PlanData, type QuizData, type StudyKind, type SummaryData } from "@/sample/scholar/study";
import { picturesFor } from "@/sample/scholar/pictures";
import { TOPICS, topicById } from "@/sample/scholar/topics";
import { getItem, listItems, updateItem, type Item } from "@/sample/scholar/workspace";
import { useScholar } from "./Shell";
import { AiNote, PageHead, QuestionImage, ReadOnly, reportFailure, reportUse, SectionLabel } from "./ui";

const KINDS: { id: StudyKind; label: string; lede: string }[] = [
  { id: "quiz", label: "Quiz", lede: "Multiple-choice questions with an explanation for every answer." },
  { id: "flashcards", label: "Flashcards", lede: "Flip a card, say whether you knew it, and the ones you missed come back." },
  { id: "summary", label: "Summary", lede: "The key points of a topic on one page." },
  { id: "plan", label: "Revision plan", lede: "A day-by-day plan up to your exam, one topic a day, with the last day to revise everything." },
];
const isKind = (k: string | undefined): k is StudyKind => KINDS.some((x) => x.id === k);
const selectCls = "h-11 w-full rounded-xl border border-line bg-[var(--surface)] px-3 text-[15px] text-ink";

function Setup({ kind }: { kind: StudyKind }) {
  const s = useScholar()!;
  const router = useRouter();
  const params = useSearchParams();
  const [topic, setTopic] = useState(params.get("topic") ?? TOPICS[0].id);
  const [picked, setPicked] = useState<string[]>(TOPICS.map((t) => t.title));
  const [exam, setExam] = useState("");
  const [pictures, setPictures] = useState(true);
  const pics = kind === "quiz" ? picturesFor(topic).length : 0;
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const make = async () => {
    setBusy(true);
    setErr(null);
    try {
      const it = await makeStudy(s.me.id, kind, kind === "plan" ? { topics: picked, exam_date: exam } : { topic_id: topic, pictures: pictures && pics > 0 });
      s.refresh();
      reportUse(kind);
      router.replace(`/scholar/study/${kind}?id=${it.id}`);
    } catch (e) {
      reportFailure(kind, e);
      setErr(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  };
  return (
    <ReadOnly>
      <form
        className="grid max-w-[520px] gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          make();
        }}
      >
        {kind === "plan" ? (
          <>
            <label className="grid gap-1.5 text-[14px] text-ink-2">
              Exam date
              <input type="date" required min={todayIST()} value={exam} onChange={(e) => setExam(e.target.value)} className={selectCls} />
            </label>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-[14px] text-ink-2">Topics to cover</legend>
              {TOPICS.map((t) => (
                <label key={t.id} className="flex items-center gap-2.5 text-[15px] text-ink-2">
                  <input type="checkbox" checked={picked.includes(t.title)} onChange={(e) => setPicked(e.target.checked ? [...picked, t.title] : picked.filter((x) => x !== t.title))} className="size-4" />
                  {t.title}
                </label>
              ))}
            </fieldset>
          </>
        ) : (
          <label className="grid gap-1.5 text-[14px] text-ink-2">
            Topic
            <select value={topic} onChange={(e) => setTopic(e.target.value)} className={selectCls}>
              {TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} · {t.subject}
                </option>
              ))}
            </select>
          </label>
        )}
        {pics > 0 && (
          <label className="flex items-center gap-2.5 text-[15px] text-ink-2">
            <input type="checkbox" checked={pictures} onChange={(e) => setPictures(e.target.checked)} className="size-4" />
            Add {pics} picture {pics === 1 ? "question" : "questions"} (clinical photos)
          </label>
        )}
        <div className="grid gap-2">
          <div>
            <Button type="submit" disabled={busy || (kind === "plan" && (!exam || !picked.length))}>
              {busy ? "Making it…" : `Make ${KINDS.find((k) => k.id === kind)!.label.toLowerCase()}`}
            </Button>
          </div>
        </div>
        {err && <Notice kind="error">{err}</Notice>}
      </form>
    </ReadOnly>
  );
}

function Quiz({ item, save }: { item: Item<QuizData>; save: (d: QuizData) => void }) {
  const d = item.data;
  const [at, setAt] = useState(() => Math.max(0, d.picks.findIndex((p) => p === null)));
  const [pick, setPick] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  if (d.done) {
    const r = scoreQuiz(d.questions, d.picks);
    return (
      <div className="grid gap-6">
        <p className="sch-serif text-[26px] font-semibold text-ink" role="status">
          {r.correct} of {r.total} right
        </p>
        {r.wrong.length > 0 && (
          <section className="grid gap-4">
            <SectionLabel as="h2">Worth another look</SectionLabel>
            {r.wrong.map((i) => (
              <div key={i} className="border-t border-line pt-3">
                {d.questions[i].image && (
                  <div className="mb-2">
                    <QuestionImage image={d.questions[i].image!} compact />
                  </div>
                )}
                <p className="sch-serif text-[17px] text-ink">{d.questions[i].q}</p>
                <p className="mt-1 text-[14.5px] text-ink-2">
                  Answer: <b>{d.questions[i].options[d.questions[i].answer]}</b>. {d.questions[i].why}
                </p>
              </div>
            ))}
          </section>
        )}
        <div>
          <Button variant="secondary" onClick={() => (save({ ...d, picks: d.picks.map(() => null), done: false }), setAt(0), setPick(null), setChecked(false))}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
  const q = d.questions[at];
  const check = (p: number | null) => {
    setPick(p);
    setChecked(true);
    save({ ...d, picks: d.picks.map((x, i) => (i === at ? p : x)) });
  };
  const next = () => {
    setChecked(false);
    setPick(null);
    if (at + 1 >= d.questions.length) save({ ...item.data, done: true });
    else setAt(at + 1);
  };
  return (
    <fieldset className="grid max-w-[62ch] gap-4">
      <legend className="mb-3">
        <span className="mb-2 block text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-4">
          Question {at + 1} of {d.questions.length}
        </span>
        <span className="sch-serif block text-[21px] font-semibold leading-snug text-ink sm:text-[24px]">{q.q}</span>
      </legend>
      {q.image && <QuestionImage image={q.image} />}
      {q.options.map((o, i) => {
        const right = checked && i === q.answer;
        const wrong = checked && i === pick && pick !== q.answer;
        return (
          <label key={i} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[15.5px] ${right ? "border-[var(--accent)] text-ink" : wrong ? "border-[var(--sch-amber)] text-ink" : "border-line text-ink-2"}`}>
            <input type="radio" name="q" checked={pick === i} disabled={checked} onChange={() => setPick(i)} className="size-4" />
            <span className="flex-1">{o}</span>
            {right && <span className="text-[13px] font-semibold text-[var(--accent)]">Correct answer</span>}
            {wrong && <span className="text-[13px] font-semibold text-[var(--sch-amber-ink)]">Your pick</span>}
          </label>
        );
      })}
      {checked && (
        <p className="sch-serif text-[16.5px] leading-relaxed text-ink-2" role="status">
          {pick === q.answer ? "Right. " : "Not quite. "}
          {q.why}
        </p>
      )}
      <div className="flex gap-2">
        {checked ? (
          <Button onClick={next}>{at + 1 >= d.questions.length ? "See your score" : "Next question"}</Button>
        ) : (
          <>
            <Button onClick={() => check(pick)} disabled={pick === null}>
              Check
            </Button>
            <Button variant="secondary" onClick={() => check(null)}>
              Skip
            </Button>
          </>
        )}
      </div>
    </fieldset>
  );
}

/** One flashcard: press to flip, then Again (1) or Knew it (2). Shared by a set and the "due today" review. */
function FlipCard({ front, back, left, note, onRate }: { front: string; back: string; left: number; note?: string; onRate: (r: "again" | "good") => void }) {
  const [flipped, setFlipped] = useState(false);
  const rate = (r: "again" | "good") => {
    setFlipped(false);
    onRate(r);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      if (e.key === "1" && flipped) rate("again");
      if (e.key === "2" && flipped) rate("good");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <div className="grid max-w-[560px] gap-4">
      <p className="text-[13px] tabular-nums text-ink-4">
        {left} left{note ? ` · ${note}` : ""}
      </p>
      <button
        type="button"
        onClick={() => setFlipped(!flipped)}
        aria-label={flipped ? "Card back. Press to see the front." : "Card front. Press to see the answer."}
        className="grid min-h-[220px] place-items-center rounded-2xl border border-line bg-[var(--surface)] p-8 text-center"
      >
        <span className={`sch-serif ${flipped ? "text-[18px] text-ink-2" : "text-[22px] font-semibold text-ink"}`} aria-live="polite">
          {flipped ? back : front}
        </span>
      </button>
      {flipped ? (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => rate("again")}>
            Again <span className="text-ink-4">(1)</span>
          </Button>
          <Button onClick={() => rate("good")}>
            Knew it <span className="opacity-60">(2)</span>
          </Button>
        </div>
      ) : (
        <p className="text-[13px] text-ink-4">Press the card (or Space when it has focus) to flip it.</p>
      )}
    </div>
  );
}

const gapText = (due: string, today: string) => {
  const days = Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  return days <= 1 ? "tomorrow" : `in ${days} days`;
};

function Cards({ item, save }: { item: Item<CardsData>; save: (d: CardsData) => void }) {
  const d = item.data;
  const idx = nextCard(d.state);
  const today = todayIST();
  const rate = (r: "again" | "good") => {
    if (idx === null) return;
    save({ ...d, state: rateCard(d.state, idx, r), sched: { ...d.sched, [idx]: scheduleCard(d.sched?.[idx], r, today) } });
  };
  if (idx === null) {
    const next = Object.values(d.sched ?? {}).map((x) => x.due).filter((x) => x > today).sort()[0];
    return (
      <div className="grid gap-4">
        <p className="sch-serif text-[24px] font-semibold text-ink" role="status">
          All {d.cards.length} cards done.
        </p>
        <p className="text-[14.5px] text-ink-3">{d.state.again.length ? `You went back to cards ${d.state.again.length} time${d.state.again.length === 1 ? "" : "s"}.` : "You knew every one first time."}</p>
        {next && <p className="text-[14.5px] text-ink-2">Scholar will bring these back when they&apos;re due, starting {gapText(next, today)}. The ones you knew wait longer.</p>}
        <div>
          <Button variant="secondary" onClick={() => save({ ...d, state: { order: d.cards.map((_, i) => i), again: [] } })}>
            Go through again
          </Button>
        </div>
      </div>
    );
  }
  const c = d.cards[idx];
  return <FlipCard key={`${idx}-${d.state.order.length}`} front={c.front} back={c.back} left={d.state.order.length} onRate={rate} />;
}

/** /scholar/study/flashcards?review=due: every card due today, across all the student's sets. */
function Review() {
  const s = useScholar()!;
  const today = todayIST();
  const [queue, setQueue] = useState<DueCard[] | null>(null);
  const [total, setTotal] = useState(0);
  const [tomorrow, setTomorrow] = useState(0);
  const userId = s.me.id;
  useEffect(() => {
    listItems(userId).then((items) => {
      const due = dueCards(items, today);
      setQueue(due);
      setTotal(due.length);
      setTomorrow(dueOn(items, addDays(today, 1)));
    });
  }, [userId, today]);
  if (queue === null) return <p className="text-[15px] text-ink-3">Loading…</p>;
  if (!queue.length)
    return (
      <div className="grid gap-4">
        <p className="sch-serif text-[24px] font-semibold text-ink" role="status">
          {total ? `All ${total} due cards reviewed.` : "Nothing due today."}
        </p>
        <p className="max-w-[60ch] text-[14.5px] text-ink-3">
          {tomorrow ? `${tomorrow} ${tomorrow === 1 ? "card comes" : "cards come"} back tomorrow.` : "Cards come back here on the day they're due. Make a set of flashcards to start."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/scholar" className="inline-flex h-10 items-center rounded-full border border-line-strong px-5 text-[14px] font-semibold text-ink hover:bg-[var(--surface-glass)]">
            Back to Home
          </Link>
          {!total && (
            <Link href="/scholar/study/flashcards" className="inline-flex h-10 items-center rounded-full px-3 text-[14px] font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
              Make flashcards
            </Link>
          )}
        </div>
      </div>
    );
  const c = queue[0];
  const rate = async (r: "again" | "good") => {
    const item = await getItem<CardsData>(userId, c.item_id);
    if (item) {
      const sched = scheduleCard(item.data.sched?.[c.idx], r, today);
      await updateItem<CardsData>(userId, c.item_id, { data: { ...item.data, sched: { ...item.data.sched, [c.idx]: sched } } });
    }
    const rest = queue.slice(1);
    if (r === "again") rest.splice(Math.min(3, rest.length), 0, c);
    setQueue(rest);
  };
  return <FlipCard key={`${c.item_id}-${c.idx}-${queue.length}`} front={c.front} back={c.back} left={queue.length} note={topicById(c.topic_id)?.title} onRate={rate} />;
}

/** On the Flashcards set-up page: the cards due today, if any. */
function DueBanner() {
  const s = useScholar()!;
  const [n, setN] = useState(0);
  const userId = s.me.id;
  useEffect(() => {
    listItems(userId).then((items) => setN(dueCards(items, todayIST()).length));
  }, [userId]);
  if (!n) return null;
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[var(--accent-soft)] px-5 py-4">
      <p className="text-[15px] text-ink">
        <b className="font-semibold tabular-nums">{n}</b> {n === 1 ? "card is" : "cards are"} due for review today.
      </p>
      <Link href="/scholar/study/flashcards?review=due" className="inline-flex h-10 items-center rounded-full bg-[var(--button-primary)] px-5 text-[14px] font-semibold text-[var(--button-primary-fg)]">
        Review now
      </Link>
    </div>
  );
}

function Plan({ item, save }: { item: Item<PlanData>; save: (d: PlanData) => void }) {
  const d = item.data;
  const done = d.days.filter((x) => x.done).length;
  const today = todayIST();
  const missed = missedDays(d, today);
  return (
    <div className="grid max-w-[640px] gap-3">
      <p className="text-[14px] text-ink-3">
        {done} of {d.days.length} days done
        {d.moved ? ` · ${d.moved} missed ${d.moved === 1 ? "day" : "days"} moved forward so far` : ""}
      </p>
      {missed > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--sch-amber)_40%,transparent)] px-5 py-4">
          <p className="max-w-[44ch] text-[14.5px] text-ink-2">
            You missed {missed} {missed === 1 ? "day" : "days"}. Catch up moves {missed === 1 ? "its topic" : "their topics"} onto the days you have left. Your exam date and the last revision day stay put.
          </p>
          <Button variant="secondary" onClick={() => save(reschedulePlan(d, today))}>
            Catch up
          </Button>
        </div>
      )}
      <ul>
        {d.days.map((day, i) => (
          <li key={day.date} className="border-t border-line">
            <label className="flex cursor-pointer items-baseline gap-3 py-3">
              <input type="checkbox" checked={day.done} onChange={(e) => save({ ...d, days: d.days.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)) })} className="size-4 translate-y-0.5" />
              <span className="w-[110px] shrink-0 text-[13.5px] text-ink-3">{new Date(`${day.date}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}</span>
              <span className={`sch-serif text-[16.5px] ${day.done ? "text-ink-4 line-through" : "text-ink"}`}>{day.topics.join(", ")}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** /scholar/study/[kind]: make a quiz, flashcards, summary or revision plan, then use it (Scholar plan part 2.2). */
export function StudyPage() {
  const s = useScholar();
  const { kind } = useParams<{ kind: string }>();
  const params = useSearchParams();
  const id = params.get("id");
  const [item, setItem] = useState<Item | null | undefined>(undefined);
  const userId = s?.me.id;
  useEffect(() => {
    if (userId && id) getItem(userId, id).then(setItem);
  }, [userId, id]);
  if (!s) return null;
  if (!isKind(kind)) return <Notice kind="error">There&apos;s no study tool called &quot;{kind}&quot;.</Notice>;
  const k = KINDS.find((x) => x.id === kind)!;
  const save = (data: unknown) => updateItem(s.me.id, item!.id, { data }).then(setItem);
  const topic = item && "topic_id" in (item.data as object) ? topicById((item.data as { topic_id: string }).topic_id) : null;
  const mixed = !!item && (item.data as { topic_id?: string }).topic_id === MIXED;
  const review = kind === "flashcards" && params.get("review") === "due";

  return (
    <div className="mx-auto max-w-[900px]">
      <nav aria-label="Study tools" className="mb-8 flex flex-wrap gap-1.5">
        {KINDS.map((x) => (
          <Link
            key={x.id}
            href={`/scholar/study/${x.id}`}
            aria-current={x.id === kind ? "page" : undefined}
            className={`rounded-full border px-3.5 py-1.5 text-[13.5px] ${x.id === kind ? "border-ink bg-ink font-semibold text-[var(--background)]" : "border-line-strong text-ink-3 hover:text-ink"}`}
          >
            {x.label}
          </Link>
        ))}
      </nav>
      {review ? (
        <>
          <PageHead meta="Flashcards" title="Due today" lede="Cards from all your sets that are due for review. The ones you know come back less often." />
          <Review />
        </>
      ) : !id ? (
        <>
          <PageHead meta="Study" title={k.label} lede={k.lede} />
          {kind === "flashcards" && <DueBanner />}
          <Setup kind={kind} />
        </>
      ) : item === undefined ? (
        <p className="text-[15px] text-ink-3">Loading…</p>
      ) : item === null ? (
        <Notice kind="error">That study set no longer exists.</Notice>
      ) : (
        <>
          <PageHead meta={`${k.label}${topic ? ` · ${topic.subject}` : ""}`} title={topic?.title ?? (mixed ? "Your mistakes" : item.title)} />
          {item.kind === "quiz" && <Quiz item={item as Item<QuizData>} save={save} />}
          {item.kind === "flashcards" && <Cards item={item as Item<CardsData>} save={save} />}
          {item.kind === "plan" && <Plan item={item as Item<PlanData>} save={save} />}
          {item.kind === "summary" && (
            <ul className="sch-prose grid list-disc gap-2 pl-5">
              {(item.data as SummaryData).points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          <AiNote className="mt-8" />
        </>
      )}
    </div>
  );
}
