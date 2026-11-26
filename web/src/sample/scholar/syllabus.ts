/**
 * Syllabus coverage: the BDS subjects by year, Scholar's own topics under the subject they belong to, and the student's
 * own syllabus topics, which they add and tick off themselves. Scholar doesn't ship a topic list per subject: it would be
 * invented, and every university's differs. Subjects follow the DCI BDS Course Regulations; the page says to check your
 * own university's syllabus.
 * Proposed API: GET/PUT /scholar/syllabus → { year, own }.
 */
import { read, write } from "../store.ts";
import { topicMastery, type Label } from "./learning.ts";
import { TOPICS } from "./topics.ts";
import type { Item } from "./workspace.ts";

export type Year = 1 | 2 | 3 | 4;
export const YEARS: { id: Year; label: string }[] = [
  { id: 1, label: "First BDS" },
  { id: 2, label: "Second BDS" },
  { id: 3, label: "Third BDS" },
  { id: 4, label: "Final BDS" },
];

export type Subject = { id: string; name: string; year: Year };
export const SUBJECTS: Subject[] = [
  { id: "anatomy", name: "General human anatomy, embryology and histology", year: 1 },
  { id: "physiology", name: "General human physiology and biochemistry", year: 1 },
  { id: "dental-anatomy", name: "Dental anatomy, embryology and oral histology", year: 1 },
  { id: "pathology", name: "General pathology and microbiology", year: 2 },
  { id: "pharmacology", name: "General and dental pharmacology and therapeutics", year: 2 },
  { id: "materials", name: "Dental materials", year: 2 },
  { id: "preclinical-conservative", name: "Pre-clinical conservative dentistry", year: 2 },
  { id: "preclinical-prostho", name: "Pre-clinical prosthodontics and crown and bridge", year: 2 },
  { id: "medicine", name: "General medicine", year: 3 },
  { id: "surgery", name: "General surgery", year: 3 },
  { id: "oral-pathology", name: "Oral pathology and oral microbiology", year: 3 },
  { id: "oral-medicine", name: "Oral medicine and radiology", year: 4 },
  { id: "paedodontics", name: "Paediatric and preventive dentistry", year: 4 },
  { id: "orthodontics", name: "Orthodontics and dentofacial orthopaedics", year: 4 },
  { id: "periodontology", name: "Periodontology", year: 4 },
  { id: "prosthodontics", name: "Prosthodontics and crown and bridge", year: 4 },
  { id: "conservative", name: "Conservative dentistry and endodontics", year: 4 },
  { id: "oral-surgery", name: "Oral and maxillofacial surgery", year: 4 },
  { id: "public-health", name: "Public health dentistry", year: 4 },
];

/** Where each of Scholar's topics is taught (a topic can belong to more than one subject). */
export const TOPIC_SUBJECTS: Record<string, string[]> = {
  pulpitis: ["conservative"],
  caries: ["conservative", "paedodontics", "public-health"],
  "class-ii": ["preclinical-conservative", "conservative"],
  "local-anaesthesia": ["oral-surgery", "pharmacology"],
  "perio-classification": ["periodontology"],
};

export type OwnTopic = { id: string; subject_id: string; title: string; done: boolean };
export type SyllabusState = { year: Year | null; own: OwnTopic[] };
const key = (userId: string) => `fmd-demo:scholar-syllabus:${userId}`;
export const getSyllabus = (userId: string): SyllabusState => read<SyllabusState>(key(userId)) ?? { year: null, own: [] };
const save = (userId: string, s: SyllabusState) => (write(key(userId), s), s);

export const setYear = (userId: string, year: Year) => save(userId, { ...getSyllabus(userId), year });
export function addOwnTopic(userId: string, subject_id: string, title: string): SyllabusState {
  const t = title.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!t) throw new Error("Type the topic's name.");
  if (!SUBJECTS.some((x) => x.id === subject_id)) throw new Error("Pick a subject.");
  const s = getSyllabus(userId);
  if (s.own.some((o) => o.subject_id === subject_id && o.title.toLowerCase() === t.toLowerCase())) throw new Error("That topic is already on the list.");
  return save(userId, { ...s, own: [...s.own, { id: `own-${Date.now().toString(36)}-${s.own.length}`, subject_id, title: t, done: false }] });
}
export const setOwnDone = (userId: string, id: string, done: boolean) => {
  const s = getSyllabus(userId);
  return save(userId, { ...s, own: s.own.map((o) => (o.id === id ? { ...o, done } : o)) });
};
export const removeOwnTopic = (userId: string, id: string) => {
  const s = getSyllabus(userId);
  return save(userId, { ...s, own: s.own.filter((o) => o.id !== id) });
};

export type CoverageRow = { kind: "scholar"; topic_id: string; title: string; label: Label | null } | { kind: "own"; id: string; title: string; done: boolean };
export type SubjectCoverage = Subject & { rows: CoverageRow[]; covered: number; total: number };

/**
 * Per subject in `year`: Scholar's topics (covered once practised: a finished quiz or a rated viva) and the student's own
 * topics (covered when ticked). Subjects with nothing in them still appear, with zero topics.
 */
export function coverage(items: Item[], s: SyllabusState, year: Year): SubjectCoverage[] {
  const mastery = new Map(topicMastery(items).map((m) => [m.topic_id, m.label]));
  return SUBJECTS.filter((x) => x.year === year).map((sub) => {
    const scholar: CoverageRow[] = TOPICS.filter((t) => TOPIC_SUBJECTS[t.id]?.includes(sub.id)).map((t) => ({ kind: "scholar", topic_id: t.id, title: t.title, label: mastery.get(t.id) ?? null }));
    const own: CoverageRow[] = s.own.filter((o) => o.subject_id === sub.id).map((o) => ({ kind: "own", id: o.id, title: o.title, done: o.done }));
    const rows = [...scholar, ...own];
    const covered = rows.filter((r) => (r.kind === "scholar" ? r.label !== null : r.done)).length;
    return { ...sub, rows, covered, total: rows.length };
  });
}
