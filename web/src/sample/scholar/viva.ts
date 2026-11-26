/**
 * Viva practice (Scholar plan part 2.3, PDR §8.2): examiner-style questions one at a time, a follow-up on each answer,
 * then a review with model answer outlines and a self-rating. Proposed API:
 *   POST /scholar/viva {topic_id, level, count, style} → Item<VivaState> · PATCH /scholar/items/{id} {data}
 * Practice only, never an assessment. The screen saves after every step, so quitting part-way keeps the progress.
 */
import { topicById, type Level, type VivaQ } from "./topics.ts";
import { createItem, type Item } from "./workspace.ts";

export type VivaStyle = "gentle" | "standard" | "strict";
/** `spoken`: the examiner reads each question aloud and the microphone listens after (the browser's own speech tools). */
export type VivaConfig = { topic_id: string; level: Level; count: 3 | 5 | 10; style: VivaStyle; spoken?: boolean };
/** `secs` / `followSecs`: how long the answer took, from the question appearing to "Answer" (older sessions have none). */
export type VivaAnswer = { answer: string | null; followAnswer: string | null; rating: 1 | 2 | 3 | null; secs?: number | null; followSecs?: number | null };
export type VivaState = { config: VivaConfig; questions: VivaQ[]; index: number; phase: "asking" | "follow_up" | "review"; answers: VivaAnswer[] };

export const followUpText = (q: VivaQ, style: VivaStyle) => (style === "strict" ? `Be precise. ${q.followUp}` : style === "gentle" ? `Good start. ${q.followUp}` : q.followUp);

export async function startViva(userId: string, config: VivaConfig, now = Date.now()): Promise<Item<VivaState>> {
  const t = topicById(config.topic_id);
  if (!t) throw new Error("Pick a topic.");
  const questions = [...Array(config.count).keys()].map((i) => t.viva[i % t.viva.length]);
  const state: VivaState = { config, questions, index: 0, phase: "asking", answers: questions.map(() => ({ answer: null, followAnswer: null, rating: null })) };
  const item = await createItem(userId, "viva", `Viva · ${t.title} · ${config.style}`, state, null, now);
  return item;
}

const advance = (s: VivaState): VivaState => (s.index + 1 >= s.questions.length ? { ...s, phase: "review" } : { ...s, index: s.index + 1, phase: "asking" });
const setAnswer = (s: VivaState, patch: Partial<VivaAnswer>) => s.answers.map((a, i) => (i === s.index ? { ...a, ...patch } : a));

/** Asking → the examiner's follow-up → the next question (or the review after the last). */
export function answerViva(s: VivaState, text: string, secs: number | null = null): VivaState {
  const t = secs === null ? null : Math.max(0, Math.round(secs));
  if (s.phase === "asking") return { ...s, phase: "follow_up", answers: setAnswer(s, { answer: text.trim(), secs: t }) };
  if (s.phase === "follow_up") return advance({ ...s, answers: setAnswer(s, { followAnswer: text.trim(), followSecs: t }) });
  return s;
}

/** "0:42", "1:05", "12:30". */
export const clock = (secs: number) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, "0")}`;
/** Answer timings for the review: each timed answer (main + follow-up), their average and the longest. null when none were timed. */
export function timings(s: VivaState) {
  const all = s.answers.flatMap((a) => [a.secs, a.followSecs]).filter((x): x is number => typeof x === "number");
  if (!all.length) return null;
  return { count: all.length, average: Math.round(all.reduce((a, b) => a + b, 0) / all.length), longest: Math.max(...all) };
}
export const skipViva = (s: VivaState) => (s.phase === "review" ? s : advance(s));
export const endViva = (s: VivaState): VivaState => ({ ...s, phase: "review" });
export const rateViva = (s: VivaState, i: number, rating: 1 | 2 | 3): VivaState => ({ ...s, answers: s.answers.map((a, j) => (j === i ? { ...a, rating } : a)) });
