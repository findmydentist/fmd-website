/**
 * FMD Scholar's demo answerer (Scholar plan part 2.1, PDR §8.2): a labelled rule-based stand-in for a model (OD-14).
 * It answers only from the reviewed topics in topics.ts, at the chosen depth, and says so plainly for anything else.
 * Rules it keeps, which a real model will be held to as well:
 *  - It never invents a reference. A source is either the student's own file (with its page) or "Unverified".
 *  - Uncertainty and disagreement are shown as notes, not buried in the prose.
 *  - It's for study: questions about treating a specific real patient get an education-only reply.
 *  - Text from uploaded files is quoted as data and never followed as an instruction.
 */
import { LEVELS, TOPICS, type Level } from "./topics.ts";

export type FileHit = { file_id: string; name: string; page: number; quote: string };
export type Source = { kind: "file"; file_id: string; name: string; page: number; quote: string } | { kind: "unverified"; label: string };
export type Note = { kind: "uncertain" | "differs"; text: string };
export type Answer = { topic_id: string | null; paragraphs: string[]; notes: Note[]; sources: Source[]; out_of_scope: boolean; refused: string | null };

export const FOLLOW_UPS = ["Explain simpler", "Go deeper", "Quiz me on this", "Make flashcards"] as const;

/** Treating a real patient (dosing, prescribing, diagnosing them), as opposed to studying the topic. */
const PATIENT = [/\bmy patient\b/i, /\b(should|can|do) i (give|prescribe|inject|use)\b/i, /\bhow much\b.*\b(give|inject|prescribe)\b/i, /\bwhat (dose|dosage) (for|should)\b/i];
export const REFUSAL =
  "Scholar is for study, so it can't advise on treating a particular patient, including doses for them. Ask your supervising faculty or clinician. I can explain how maximum doses are worked out, or quiz you on it.";

export function matchTopic(text: string) {
  const t = text.toLowerCase();
  let best: (typeof TOPICS)[number] | null = null;
  let score = 0;
  for (const topic of TOPICS) {
    const s = topic.keywords.reduce((n, k) => n + (t.includes(k) ? 1 : 0), 0);
    if (s > score) [best, score] = [topic, s];
  }
  return best;
}

export const NOT_IN_FILES = "Your files don't cover this, so this answer is from general study material.";

/** searchedFiles: the student chose files to answer from (so silence from them is worth saying). */
export function answerQuestion({ text, level, fileHits = [], searchedFiles = false }: { text: string; level: Level; fileHits?: FileHit[]; searchedFiles?: boolean }): Answer {
  const empty = { notes: [], sources: [], out_of_scope: false };
  if (PATIENT.some((r) => r.test(text))) return { ...empty, topic_id: null, paragraphs: [REFUSAL], refused: REFUSAL };

  const topic = matchTopic(text);
  const files: Source[] = fileHits.map((h) => ({ kind: "file", file_id: h.file_id, name: h.name, page: h.page, quote: h.quote }));
  const lead = fileHits[0] ? [`From your notes: “${fileHits[0].quote}”`] : searchedFiles && matchTopic(text) ? [NOT_IN_FILES] : [];
  if (!topic) {
    if (lead.length) return { ...empty, topic_id: null, paragraphs: [...lead, "That's what your files say on this. The demo has no study material of its own on the topic, so check it against your textbook."], sources: files, refused: null };
    const titles = TOPICS.map((t) => t.title.toLowerCase()).join(", ");
    return { ...empty, topic_id: null, paragraphs: [`The demo can answer about: ${titles}. A real model will cover every subject.`], out_of_scope: true, refused: null };
  }
  const notes: Note[] = topic.uncertain ? [{ kind: topic.uncertain.kind, text: topic.uncertain.text }] : [];
  const sources: Source[] = [...files, ...(topic.uncertain ? [{ kind: "unverified" as const, label: `Check against ${topic.uncertain.check}` }] : [])];
  return { topic_id: topic.id, paragraphs: [...lead, ...topic.levels[level]], notes, sources, out_of_scope: false, refused: null };
}

/** "Explain simpler" goes one level down, "Go deeper" one up (the ends stay put). */
export const shift = (level: Level, by: -1 | 1): Level => LEVELS[Math.min(LEVELS.length - 1, Math.max(0, LEVELS.findIndex((l) => l.id === level) + by))].id;
