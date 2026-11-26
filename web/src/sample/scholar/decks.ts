/**
 * Presentations (Scholar plan parts 3.1, 3.2, PDR §8.3): an outline from topic, format, audience and length, then
 * slide-by-slide content with speaker notes and sources, editable and regenerable at slide, section or deck level.
 * Proposed API:
 *   POST /scholar/decks {config, project_id?} → outline · POST /scholar/decks/{id}/generate
 *   POST /scholar/decks/{id}/regenerate {scope, target_id?, replace_edited} · PATCH /scholar/decks/{id}/slides/{slide_id}
 *   GET /scholar/decks/{id}/export?format=pdf|md|pptx (pptx comes with the file-generation service)
 * Rules: what the sources don't say is written as "Not stated in your sources", never filled in. Every source is
 * the student's file (with page) or marked unverified. The student's edits survive regeneration unless they choose.
 */
import { demoPdf } from "../files.ts";
import { matchTopic, type FileHit, type Source } from "./ai.ts";
import { listDocs, searchDocs } from "./docs.ts";
import { LEVELS, TOPICS, type Level, type Topic } from "./topics.ts";
import { createItem, getItem, updateItem, type Item } from "./workspace.ts";

export type Format = "seminar" | "journal_club" | "case" | "classroom" | "conference";
export const FORMATS: { id: Format; label: string }[] = [
  { id: "seminar", label: "Seminar" },
  { id: "journal_club", label: "Journal club" },
  { id: "case", label: "Case presentation" },
  { id: "classroom", label: "Classroom" },
  { id: "conference", label: "Conference" },
];
export type DeckConfig = { topic: string; format: Format; audience: Level; minutes: number; slides: number | null; style: "plain" | "clinical" | "bold"; citations: boolean; notes: boolean; file_ids: string[] };
type SectionKind = "title" | "content" | "source" | "own" | "end";
export type Section = { id: string; title: string; slides: number; kind: SectionKind };
export type Slide = { id: string; section_id: string; title: string; bullets: string[]; notes: string; sources: Source[]; edited: boolean; variant: number };
export type DeckData = { config: DeckConfig; sections: Section[]; slides: Slide[] };

const T: Record<Format, [string, SectionKind][]> = {
  journal_club: [["Title", "title"], ["Background", "content"], ["The paper", "source"], ["Methods", "source"], ["Results", "source"], ["Critique", "content"], ["Take-home", "content"], ["Questions", "end"]],
  seminar: [["Title", "title"], ["Introduction", "content"], ["Core concepts", "content"], ["Clinical relevance", "content"], ["Recent views", "content"], ["Summary", "content"], ["Questions", "end"]],
  case: [["Title", "title"], ["Presentation", "source"], ["History & examination", "source"], ["Investigations", "source"], ["Diagnosis", "content"], ["Treatment plan", "content"], ["Outcome & follow-up", "source"], ["Learning points", "content"]],
  classroom: [["Title", "title"], ["Objectives", "content"], ["Teach (1)", "content"], ["Teach (2)", "content"], ["Teach (3)", "content"], ["Check understanding", "content"], ["Summary", "content"]],
  conference: [["Title", "title"], ["Background", "content"], ["Aim", "content"], ["Methods", "source"], ["Results", "source"], ["Conclusion", "content"], ["Acknowledgements", "own"]],
};

export const slideTarget = (c: DeckConfig) => c.slides ?? Math.min(40, Math.max(5, Math.round(c.minutes / 1.25)));

/** Every section gets a slide; the rest go to the middle sections in turn. A deck never has fewer slides than sections. */
export function outline(c: DeckConfig): Section[] {
  const sections: Section[] = T[c.format].map(([title, kind], i) => ({ id: `sec-${i}`, title, kind, slides: 1 }));
  const middle = sections.filter((s) => s.kind !== "title" && s.kind !== "end");
  for (let extra = slideTarget(c) - sections.length, i = 0; extra > 0; extra--, i++) middle[i % middle.length].slides++;
  return sections;
}

const NOT_STATED = "Not stated in your sources: add this from the paper or case you're presenting.";
const sentences = (t: Topic, level: Level) => [...t.summary, ...t.levels[level].flatMap((p) => p.split(/(?<=[.!?])\s+/))];

function makeSlide(c: DeckConfig, sec: Section, k: number, n: number, variant: number, topic: Topic | null, hits: FileHit[]): Slide {
  const title = sec.slides > 1 ? `${sec.title} (${k + 1})` : sec.title;
  let bullets: string[];
  let sources: Source[] = [];
  if (sec.kind === "title") bullets = [c.topic, `${FORMATS.find((f) => f.id === c.format)!.label} · ${c.minutes} minutes`, `For a ${LEVELS.find((l) => l.id === c.audience)!.label.toLowerCase()} audience`];
  else if (sec.kind === "end") bullets = ["Questions and discussion"];
  else if (sec.kind === "own") bullets = ["Add your own acknowledgements: supervisors, department, funding."];
  else if (sec.kind === "source" && hits.length) {
    const h = [0, 1].map((j) => hits[(n + variant + j) % hits.length]);
    bullets = [...new Set(h.map((x) => x.quote))];
    sources = [...new Map(h.map((x) => [`${x.file_id}-${x.page}`, { kind: "file" as const, file_id: x.file_id, name: x.name, page: x.page, quote: x.quote }])).values()];
  } else if (sec.kind === "source" || !topic) bullets = [NOT_STATED];
  else {
    const pool = sentences(topic, c.audience);
    bullets = [0, 1, 2].map((j) => pool[(n * 3 + variant * 2 + j) % pool.length]);
    sources = [{ kind: "unverified", label: `Check against ${topic.uncertain?.check ?? "your textbook"}` }];
  }
  return { id: `${sec.id}-${k}`, section_id: sec.id, title, bullets, notes: c.notes ? `Talk through: ${bullets[0]}` : "", sources: c.citations ? sources : [], edited: false, variant };
}

async function material(userId: string, c: DeckConfig) {
  const docs = (await listDocs(userId)).filter((d) => c.file_ids.includes(d.id));
  return { topic: matchTopic(c.topic), hits: docs.length ? searchDocs(docs, c.topic, 6) : [] };
}

export async function createDeck(userId: string, c: DeckConfig, project_id: string | null = null, now = Date.now()) {
  if (!c.topic.trim()) throw new Error("Give the presentation a topic.");
  return createItem<DeckData>(userId, "deck", c.topic, { config: c, sections: outline(c), slides: [] }, project_id, now);
}

async function load(userId: string, id: string) {
  const it = await getItem<DeckData>(userId, id);
  if (!it) throw new Error("That presentation no longer exists.");
  return it;
}

/** Builds every slide from the (possibly edited) outline. */
export async function generateDeck(userId: string, id: string, now = Date.now()) {
  const it = await load(userId, id);
  const c = it.data.config;
  const { topic, hits } = await material(userId, c);
  if (!topic && !hits.length) throw new Error(`The demo can build presentations about: ${TOPICS.map((t) => t.title.toLowerCase()).join(", ")}, or from files you choose.`);
  let n = 0;
  const slides = it.data.sections.flatMap((sec) => [...Array(sec.slides).keys()].map((k) => makeSlide(c, sec, k, n++, 0, topic, hits)));
  const next = await updateItem<DeckData>(userId, id, { data: { ...it.data, slides } }, it.data.slides.length > 0, now);
  return next;
}

/** Regenerates one slide, a section or the whole deck. The old deck is kept as a version. */
export async function regenerate(userId: string, id: string, scope: "slide" | "section" | "deck", target_id: string | null, replaceEdited = false, now = Date.now()) {
  const it = await load(userId, id);
  const c = it.data.config;
  const { topic, hits } = await material(userId, c);
  const slides = it.data.slides.map((s, n) => {
    const hit = scope === "deck" || (scope === "section" ? s.section_id === target_id : s.id === target_id);
    if (!hit || (s.edited && !replaceEdited && scope !== "slide")) return s;
    const sec = it.data.sections.find((x) => x.id === s.section_id)!;
    return makeSlide(c, sec, Number(s.id.split("-").at(-1)), n, s.variant + 1, topic, hits);
  });
  const next = await updateItem<DeckData>(userId, id, { data: { ...it.data, slides } }, true, now);
  return next;
}

export async function editSlide(userId: string, id: string, slide_id: string, patch: Partial<Pick<Slide, "title" | "bullets" | "notes">>) {
  const it = await load(userId, id);
  return updateItem<DeckData>(userId, id, { data: { ...it.data, slides: it.data.slides.map((s) => (s.id === slide_id ? { ...s, ...patch, edited: true } : s)) } });
}

/** Outline review, before generating: reorder, rename, add, remove sections. */
export async function setSections(userId: string, id: string, sections: Section[]) {
  const it = await load(userId, id);
  return updateItem<DeckData>(userId, id, { data: { ...it.data, sections } });
}

export const unverifiedCount = (d: DeckData) => new Set(d.slides.flatMap((s) => s.sources.filter((x) => x.kind === "unverified").map((x) => (x.kind === "unverified" ? x.label : "")))).size;

export const AI_DISCLOSURE = "Prepared with AI assistance (FMD Scholar). Disclose this if your institution requires it.";

function exportLines(it: Item<DeckData>) {
  const lines: string[] = [];
  const unverified = new Set<string>();
  for (const s of it.data.slides) {
    lines.push("", `## ${s.title}`, ...s.bullets.map((b) => `- ${b}`));
    if (s.notes) lines.push(`Speaker notes: ${s.notes}`);
    for (const src of s.sources) {
      if (src.kind === "file") lines.push(`Source: Your file · ${src.name}, p. ${src.page}`);
      else unverified.add(src.label);
    }
  }
  if (unverified.size) lines.push("", "## Sources to check", ...[...unverified].map((u) => `- Unverified · check this source: ${u}`));
  lines.push("", AI_DISCLOSURE);
  return lines;
}
export const deckMarkdown = (it: Item<DeckData>) => [`# ${it.title}`, ...exportLines(it)].join("\n");
export const deckPdf = (it: Item<DeckData>) => demoPdf(it.title, exportLines(it).map((l) => l.replace(/^## /, "").replace(/^- /, "  - ")));
