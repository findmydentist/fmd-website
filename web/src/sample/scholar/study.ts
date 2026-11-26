/**
 * Study tools (Scholar plan part 2.2, PDR §8.2): quizzes, flashcards, topic summaries and revision plans, made from the
 * demo topics. Proposed API: POST /scholar/study {kind, topic_id?, topics?, exam_date?, project_id?} → Item.
 * Revision progress is learning data only, kept apart from any patient or clinic data (Annex D).
 */
import { picturesFor } from "./pictures.ts";
import { topicById, type QuizQ } from "./topics.ts";
import { createItem, type Item } from "./workspace.ts";

export function scoreQuiz(quiz: QuizQ[], picks: (number | null)[]) {
  const wrong = quiz.flatMap((q, i) => (picks[i] === q.answer ? [] : [i]));
  return { correct: quiz.length - wrong.length, total: quiz.length, wrong };
}

export type CardState = { order: number[]; again: number[] };
export const startCards = (n: number): CardState => ({ order: [...Array(n).keys()], again: [] });
export const nextCard = (s: CardState) => s.order[0] ?? null;
/** "again" puts the card 3 places later (or at the end if fewer remain); "good" retires it. */
export function rateCard(s: CardState, idx: number, rating: "again" | "good"): CardState {
  const rest = s.order.filter((i) => i !== idx);
  if (rating === "good") return { ...s, order: rest };
  rest.splice(Math.min(3, rest.length), 0, idx);
  return { order: rest, again: [...s.again, idx] };
}

/**
 * Spaced repetition, Leitner boxes. A card's first rating puts it in box 1; "Knew it" moves it up a box, "Again" sends it
 * back to box 1. Each box has a gap in days before the card is due again. Dates are IST days (YYYY-MM-DD).
 */
export type CardSched = { box: number; due: string; last: string };
export const BOX_GAP_DAYS = [0, 1, 3, 7, 14, 30]; // index = box
export function scheduleCard(prev: CardSched | undefined, rating: "again" | "good", today: string): CardSched {
  if (rating === "again") return { box: 1, due: addDays(today, BOX_GAP_DAYS[1]), last: today };
  // a second "Knew it" on the same day (after an "Again" in the same session) doesn't promote the card
  if (prev && prev.last === today) return prev;
  const box = Math.min(BOX_GAP_DAYS.length - 1, (prev?.box ?? 0) + 1);
  return { box, due: addDays(today, BOX_GAP_DAYS[box]), last: today };
}

export type DueCard = { item_id: string; idx: number; topic_id: string; front: string; back: string; sched: CardSched };
/** Every scheduled card across the student's flashcard sets that is due on or before `today`, most overdue first. */
export function dueCards(items: Item[], today: string): DueCard[] {
  return items
    .filter((it) => it.kind === "flashcards")
    .flatMap((it) => {
      const d = it.data as CardsData;
      return d.cards.flatMap((c, idx) => {
        const s = d.sched?.[idx];
        return s && s.due <= today ? [{ item_id: it.id, idx, topic_id: d.topic_id, front: c.front, back: c.back, sched: s }] : [];
      });
    })
    .sort((a, b) => a.sched.due.localeCompare(b.sched.due) || a.sched.box - b.sched.box);
}
/** How many scheduled cards fall due on `day` exactly (for "N due tomorrow"). */
export function dueOn(items: Item[], day: string) {
  return items.filter((it) => it.kind === "flashcards").reduce((n, it) => n + Object.values((it.data as CardsData).sched ?? {}).filter((s) => s.due === day).length, 0);
}

export type PlanDay = { date: string; topics: string[]; done: boolean };
export const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
/** One entry per day from `start` to the day before the exam; topics in turn; the last day revises everything. */
export function revisionPlan(topics: string[], start: string, exam: string): PlanDay[] {
  const days = Math.round((Date.parse(`${exam}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
  if (!(days > 0)) throw new Error("Pick an exam date after today.");
  if (!topics.length) throw new Error("Pick at least one topic.");
  if (days === 1) return [{ date: start, topics: [...topics], done: false }];
  return [...Array(days).keys()].map((i) => ({ date: addDays(start, i), topics: i === days - 1 ? ["Revise everything"] : [topics[i % topics.length]], done: false }));
}

export const todayIST = (now = Date.now()) => new Date(now + 5.5 * 3_600_000).toISOString().slice(0, 10);

export type StudyKind = "quiz" | "flashcards" | "summary" | "plan";
/** A mixed quiz (e.g. "Your mistakes") has topic_id MIXED and one topic per question in `topic_ids`. */
export type QuizData = { topic_id: string; questions: QuizQ[]; picks: (number | null)[]; done: boolean; topic_ids?: string[] };
export const MIXED = "mixed";
/** `sched` is keyed by card index; a card without one hasn't been rated yet (older sets have none at all). */
export type CardsData = { topic_id: string; cards: { front: string; back: string }[]; state: CardState; sched?: Record<number, CardSched> };
export type SummaryData = { topic_id: string; points: string[] };
/** `moved` counts missed days whose topics were moved forward by "Catch up". */
export type PlanData = { topics: string[]; exam_date: string; days: PlanDay[]; moved?: number };

const REVISE_ALL = "Revise everything";
/** Days before `today` that weren't ticked. */
export const missedDays = (plan: PlanData, today: string) => plan.days.filter((d) => d.date < today && !d.done).length;

/**
 * "Catch up": the topics of missed days move onto the days left (from today), first in line, spread evenly. Ticked days and
 * the last "Revise everything" day stay as they are; the exam date never moves. With no open day left, they join the last day.
 */
export function reschedulePlan(plan: PlanData, today: string): PlanData {
  const missed = plan.days.filter((d) => d.date < today && !d.done);
  const ahead = plan.days.filter((d) => d.date >= today);
  if (!missed.length || !ahead.length) return plan;
  const topics = missed.flatMap((d) => d.topics).filter((t) => t !== REVISE_ALL);
  const last = ahead.at(-1)!;
  const reviseDay = last.topics.includes(REVISE_ALL) ? last : null;
  const open = ahead.filter((d) => !d.done && d !== reviseDay);
  const uniq = (xs: string[]) => [...new Set(xs)];
  let rebuilt: PlanDay[];
  if (!open.length) {
    rebuilt = ahead.map((d) => (d === last ? { ...d, topics: uniq([...d.topics, ...topics]) } : d));
  } else {
    const queue = [...topics, ...open.flatMap((d) => d.topics)];
    const n = open.length;
    const share = new Map(open.map((d, i) => [d, uniq(queue.slice(Math.floor((i * queue.length) / n), Math.floor(((i + 1) * queue.length) / n)))]));
    rebuilt = ahead.map((d) => (share.has(d) ? { ...d, topics: share.get(d)! } : d));
  }
  return { ...plan, days: [...plan.days.filter((d) => d.date < today && d.done), ...rebuilt], moved: (plan.moved ?? 0) + missed.length };
}

/** "Quiz me on my mistakes": up to 10 questions, each keeping its own topic. */
export async function makeMistakeQuiz(userId: string, mistakes: { topic_id: string; q: QuizQ }[], now = Date.now()) {
  const pick = mistakes.slice(0, 10);
  if (!pick.length) throw new Error("No mistakes to practise. Nice.");
  const data: QuizData = { topic_id: MIXED, topic_ids: pick.map((m) => m.topic_id), questions: pick.map((m) => m.q), picks: pick.map(() => null), done: false };
  return createItem(userId, "quiz", "Quiz · Your mistakes", data, null, now);
}
const TITLE: Record<StudyKind, string> = { quiz: "Quiz", flashcards: "Flashcards", summary: "Summary", plan: "Revision plan" };

export async function makeStudy(
  userId: string,
  kind: StudyKind,
  o: { topic_id?: string; topics?: string[]; exam_date?: string; project_id?: string | null; pictures?: boolean },
  now = Date.now(),
): Promise<Item> {
  let data: QuizData | CardsData | SummaryData | PlanData;
  let about: string;
  if (kind === "plan") {
    data = { topics: o.topics ?? [], exam_date: o.exam_date ?? "", days: revisionPlan(o.topics ?? [], todayIST(now), o.exam_date ?? "") };
    about = `exam on ${new Date(`${o.exam_date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}`;
  } else {
    const t = topicById(o.topic_id);
    if (!t) throw new Error("Pick a topic.");
    about = t.title;
    data =
      kind === "quiz"
        ? (() => {
            const questions = [...t.quiz, ...(o.pictures ? picturesFor(t.id) : [])];
            return { topic_id: t.id, questions, picks: questions.map(() => null), done: false };
          })()
        : kind === "flashcards"
          ? { topic_id: t.id, cards: t.flashcards, state: startCards(t.flashcards.length) }
          : { topic_id: t.id, points: t.summary };
  }
  const item = await createItem(userId, kind, `${TITLE[kind]} · ${about}`, data, o.project_id ?? null, now);
  return item;
}
