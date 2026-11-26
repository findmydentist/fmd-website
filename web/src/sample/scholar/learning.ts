/**
 * What Scholar's Home and My learning show (docs/superpowers/specs/2026-11-16-scholar-dashboard-my-learning-design.md):
 * strength by topic, suggestions, this week, today's plan, the exam countdown and the question of the day, all worked
 * out from the student's own saved work. Practice only: nothing here is an assessment or a grade.
 * Proposed API: GET /scholar/learning → { mastery, suggestions, week, month, today, exam }.
 */
import { read, write } from "../store.ts";
import type { PlanData, PlanDay, QuizData } from "./study.ts";
import { scoreQuiz } from "./study.ts";
import { PICTURES } from "./pictures.ts";
import { TOPICS, topicById, type QuizQ } from "./topics.ts";
import type { VivaState } from "./viva.ts";
import { listItems, updateItem, type Item, type Project } from "./workspace.ts";

const IST = 5.5 * 3_600_000;
const DAY = 86_400_000;
export const istDay = (t: number) => new Date(t + IST).toISOString().slice(0, 10);
const dayOf = (iso: string) => istDay(Date.parse(iso));
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export type Label = "Strong" | "Good" | "Building" | "Revise";
export const labelFor = (score: number): Label => (score >= 80 ? "Strong" : score >= 65 ? "Good" : score >= 50 ? "Building" : "Revise");

export type Mastery = { topic_id: string; title: string; score: number; label: Label; quizzes: number; vivas: number; last: string };

/** Per topic: the average of its finished-quiz average and its viva-rating average (whichever exist). Best first. */
export function topicMastery(items: Item[]): Mastery[] {
  const by = new Map<string, { quiz: number[]; viva: number[]; last: string }>();
  const at = (id: string, when: string) => {
    const e = by.get(id) ?? { quiz: [], viva: [], last: when };
    if (when > e.last) e.last = when;
    by.set(id, e);
    return e;
  };
  for (const it of items) {
    if (it.kind === "quiz") {
      const d = it.data as QuizData;
      if (!d.done) continue;
      if (d.topic_ids) {
        // a mixed quiz counts towards each question's own topic
        for (const tid of new Set(d.topic_ids)) {
          const qs = d.questions.flatMap((q, i) => (d.topic_ids![i] === tid ? [i] : []));
          const right = qs.filter((i) => d.picks[i] === d.questions[i].answer).length;
          at(tid, it.updated_at).quiz.push((right / qs.length) * 100);
        }
        continue;
      }
      const r = scoreQuiz(d.questions, d.picks);
      at(d.topic_id, it.updated_at).quiz.push((r.correct / r.total) * 100);
    }
    if (it.kind === "viva") {
      const v = it.data as VivaState;
      const rated = v.answers.flatMap((a) => (a.rating ? [(a.rating / 3) * 100] : []));
      if (rated.length) at(v.config.topic_id, it.updated_at).viva.push(...rated);
    }
  }
  return [...by.entries()]
    .flatMap(([topic_id, e]) => {
      const parts = [mean(e.quiz), mean(e.viva)].filter((x): x is number => x !== null);
      const t = topicById(topic_id);
      if (!t || !parts.length) return [];
      const score = Math.round(mean(parts)!);
      return [{ topic_id, title: t.title, score, label: labelFor(score), quizzes: e.quiz.length, vivas: e.viva.length > 0 ? 1 : 0, last: e.last }];
    })
    .sort((a, b) => b.score - a.score);
}

export type Suggestion = { topic_id: string; text: string; action: { label: string; href: string } };

/** Up to three: the weakest topic first, then others still building, then anything not touched for a week. */
export function suggestions(items: Item[], now = Date.now()): Suggestion[] {
  const m = topicMastery(items);
  if (!m.length) {
    const t = TOPICS[0];
    return [{ topic_id: t.id, text: `Start with a 5-question quiz on ${t.title.toLowerCase()} to see where you stand.`, action: { label: "Start the quiz", href: `/scholar/study/quiz?topic=${t.id}` } }];
  }
  const out: Suggestion[] = [];
  const add = (s: Suggestion) => out.length < 3 && !out.some((x) => x.topic_id === s.topic_id) && out.push(s);
  const weak = [...m].reverse();
  weak
    .filter((x) => x.score < 50)
    .forEach((t, i) =>
      add({
        topic_id: t.topic_id,
        text: `${t.title}: ${i === 0 ? "your scores here are your lowest" : "this one needs revising too"} (${t.score}%). Two short quizzes this week, then a strict viva.`,
        action: { label: "Try 5 questions", href: `/scholar/study/quiz?topic=${t.topic_id}` },
      }),
    );
  for (const t of weak.filter((x) => x.score < 65))
    add({ topic_id: t.topic_id, text: `${t.title}: getting there (${t.score}%). A round of flashcards will firm it up.`, action: { label: "Flashcards", href: `/scholar/study/flashcards?topic=${t.topic_id}` } });
  for (const t of m.filter((x) => now - Date.parse(x.last) >= 7 * DAY))
    add({ topic_id: t.topic_id, text: `You haven't touched ${t.title.toLowerCase()} in ${Math.floor((now - Date.parse(t.last)) / DAY)} days. A five-minute summary keeps it fresh.`, action: { label: "Read the summary", href: `/scholar/study/summary?topic=${t.topic_id}` } });
  return out;
}

/** The seven IST days ending today: whether anything was saved that day, and what was done. */
export function weekActivity(items: Item[], now = Date.now()) {
  const days = [...Array(7).keys()].map((i) => istDay(now - (6 - i) * DAY));
  const inWeek = items.filter((it) => dayOf(it.updated_at) >= days[0]);
  const activeDays = new Set(inWeek.map((it) => dayOf(it.updated_at)));
  return {
    days: days.map((date) => ({ date, active: activeDays.has(date) })),
    totals: {
      studyDays: activeDays.size,
      asks: inWeek.filter((i) => i.kind === "ask").length,
      quizzes: inWeek.filter((i) => i.kind === "quiz").length,
      vivas: inWeek.filter((i) => i.kind === "viva").length,
    },
  };
}

/** This IST month: days studied, the average of finished quizzes, vivas practised, and the active plan's days. */
export function monthStats(items: Item[], now = Date.now()) {
  const month = istDay(now).slice(0, 7);
  const these = items.filter((it) => dayOf(it.updated_at).startsWith(month));
  const quizzes = these.flatMap((it) => {
    const d = it.data as QuizData;
    if (it.kind !== "quiz" || !d.done) return [];
    const r = scoreQuiz(d.questions, d.picks);
    return [(r.correct / r.total) * 100];
  });
  const plan = todayPlan(items, now);
  const avg = mean(quizzes);
  return {
    studyDays: new Set(these.map((it) => dayOf(it.updated_at))).size,
    avgQuiz: avg === null ? null : Math.round(avg),
    vivas: these.filter((it) => it.kind === "viva").length,
    planDone: plan ? plan.plan.days.filter((d) => d.done).length : 0,
    planTotal: plan ? plan.plan.days.length : 0,
  };
}

const ALL_QUESTIONS = [...TOPICS.flatMap((t) => t.quiz.map((q) => ({ topic_id: t.id, q }))), ...PICTURES];
/** One quiz question per day, the same all day. */
export function questionOfTheDay(date: string): { topic_id: string; q: QuizQ } {
  const n = Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY);
  return ALL_QUESTIONS[(((n * 7) % ALL_QUESTIONS.length) + ALL_QUESTIONS.length) % ALL_QUESTIONS.length];
}

/** The student's answers to the question of the day (kept so a reload shows it, and wrong ones reach the mistake notebook). */
export type QotdAttempt = { date: string; at: string; topic_id: string; q: QuizQ; pick: number };
const qotdKey = (userId: string) => `fmd-demo:scholar-qotd:${userId}`;
export const qotdAttempts = (userId: string) => read<QotdAttempt[]>(qotdKey(userId)) ?? [];
export const qotdToday = (userId: string, date: string) => qotdAttempts(userId).find((a) => a.date === date) ?? null;
export function answerQotd(userId: string, date: string, pick: number, now = Date.now()) {
  if (qotdToday(userId, date)) return;
  const { topic_id, q } = questionOfTheDay(date);
  write(qotdKey(userId), [...qotdAttempts(userId), { date, at: new Date(now).toISOString(), topic_id, q, pick }].slice(-200));
}

export type Mistake = { topic_id: string; q: QuizQ; last: string; times: number };
/**
 * The mistake notebook: every question whose most recent answer (in a finished quiz or the question of the day) was wrong,
 * newest first. Answering it right later, e.g. in "Quiz me on my mistakes", clears it.
 */
export function mistakes(items: Item[], qotd: QotdAttempt[]): Mistake[] {
  const tries: { at: string; topic_id: string; q: QuizQ; right: boolean }[] = qotd.map((a) => ({ at: a.at, topic_id: a.topic_id, q: a.q, right: a.pick === a.q.answer }));
  for (const it of items) {
    const d = it.data as QuizData;
    if (it.kind !== "quiz" || !d.done) continue;
    d.questions.forEach((q, i) => tries.push({ at: it.updated_at, topic_id: d.topic_ids?.[i] ?? d.topic_id, q, right: d.picks[i] === q.answer }));
  }
  const by = new Map<string, typeof tries>();
  for (const t of tries) by.set(t.q.q, [...(by.get(t.q.q) ?? []), t]);
  return [...by.values()]
    .flatMap((ts) => {
      const sorted = ts.sort((a, b) => a.at.localeCompare(b.at));
      const latest = sorted.at(-1)!;
      return latest.right ? [] : [{ topic_id: latest.topic_id, q: latest.q, last: latest.at, times: sorted.filter((t) => !t.right).length }];
    })
    .sort((a, b) => b.last.localeCompare(a.last));
}

/** The newest revision plan that has a day for today. */
export function todayPlan(items: Item[], now = Date.now()): { item: Item<PlanData>; plan: PlanData; day: PlanDay; index: number } | null {
  const today = istDay(now);
  for (const it of items) {
    if (it.kind !== "plan") continue;
    const plan = it.data as PlanData;
    const index = plan.days.findIndex((d) => d.date === today);
    if (index >= 0) return { item: it as Item<PlanData>, plan, day: plan.days[index], index };
  }
  return null;
}

/** The nearest exam still to come (a project's date, or a plan's), with that plan's progress if there is one. */
export function examCountdown(items: Item[], projects: Project[], now = Date.now()) {
  const today = istDay(now);
  const plans = items.filter((i) => i.kind === "plan").map((i) => i.data as PlanData);
  const dates = [
    ...projects.filter((p) => p.exam_date && p.exam_date >= today).map((p) => ({ name: p.name, date: p.exam_date! })),
    ...plans.filter((p) => p.exam_date >= today).map((p) => ({ name: "Your exam", date: p.exam_date })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const next = dates[0];
  if (!next) return null;
  const plan = plans.find((p) => p.exam_date === next.date);
  const elapsed = plan ? plan.days.filter((d) => d.date < today).length : 0;
  const done = plan ? plan.days.filter((d) => d.done).length : 0;
  return {
    name: next.name,
    date: next.date,
    daysLeft: Math.round((Date.parse(`${next.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY),
    plan: plan ? { done, total: plan.days.length, onTrack: done >= elapsed } : null,
  };
}

/** Puts a topic on the next day of the active plan. Returns false when there's no plan to add it to. */
export async function addToPlan(userId: string, topicTitle: string, now = Date.now()) {
  const t = todayPlan(await listItems(userId), now);
  if (!t) return false;
  const next = t.plan.days.findIndex((d, i) => i > t.index && !d.done);
  if (next < 0) return false;
  const days = t.plan.days.map((d, i) => (i === next && !d.topics.includes(topicTitle) ? { ...d, topics: [...d.topics, topicTitle] } : d));
  await updateItem<PlanData>(userId, t.item.id, { data: { ...t.plan, days } });
  return true;
}

export type Task = "summary" | "flashcards" | "quiz" | "viva";
export const TASK_COUNT = 4;
/**
 * Home's four tasks and the plan day stay in step: ticking the last one marks today done on the active plan, unticking one
 * marks it not done again. Returns whether the plan changed.
 */
export async function syncPlanDay(userId: string, ticked: number, now = Date.now()) {
  const t = todayPlan(await listItems(userId), now);
  if (!t) return false;
  const done = ticked >= TASK_COUNT;
  if (t.day.done === done) return false;
  const days = t.plan.days.map((d, i) => (i === t.index ? { ...d, done } : d));
  await updateItem<PlanData>(userId, t.item.id, { data: { ...t.plan, days } });
  return true;
}
const tickKey = (userId: string, date: string) => `fmd-demo:scholar-today:${userId}:${date}`;
export const getTicks = (userId: string, date: string) => read<Task[]>(tickKey(userId, date)) ?? [];
export function setTick(userId: string, date: string, task: Task, on: boolean) {
  const now = getTicks(userId, date).filter((t) => t !== task);
  write(tickKey(userId, date), on ? [...now, task] : now);
}
