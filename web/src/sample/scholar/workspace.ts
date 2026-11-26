/**
 * The Scholar workspace (Scholar plan parts 2.1, 5.1, PDR §8.5): saved conversations, generated work, projects and
 * revision history. Sample data until the backend has it; kept in this browser. Proposed API:
 *   GET /scholar/library?q&tag&type&project · GET/PATCH/DELETE /scholar/items/{id} · GET /scholar/items/{id}/versions
 *   POST /scholar/ask {conversation_id?, text, level, project_id?, file_ids?} → Item<AskData>
 *   GET/POST/PATCH/DELETE /scholar/projects
 * Rules: the student membership includes unlimited use (owner, 16 Nov 2026). Organisation is the student's own:
 * nothing is tagged or moved without them.
 */
import { read, write } from "../store.ts";
import { answerQuestion, type Answer, type FileHit } from "./ai.ts";
import type { Level } from "./topics.ts";

export type Kind = "ask" | "quiz" | "flashcards" | "summary" | "plan" | "viva" | "deck" | "research";
export const KIND_LABEL: Record<Kind, string> = { ask: "Ask", quiz: "Quiz", flashcards: "Flashcards", summary: "Summary", plan: "Plan", viva: "Viva", deck: "Deck", research: "Research" };
export type Item<D = unknown> = { id: string; kind: Kind; title: string; project_id: string | null; tags: string[]; created_at: string; updated_at: string; data: D; versions: { at: string; data: D }[] };
export type Project = { id: string; name: string; kind: "subject" | "seminar" | "research" | "exam"; exam_date: string | null; created_at: string };
export type AskData = { level: Level; turns: { q: string; a: Answer }[] };

type State = { items: Item[]; projects: Project[] };
const key = (userId: string) => `fmd-demo:scholar:${userId}`;
const load = (userId: string): State => read<State>(key(userId)) ?? { items: [], projects: [] };
const save = (userId: string, s: State) => write(key(userId), s);
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const MAX_VERSIONS = 20;
export const titleOf = (text: string) => {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 80 ? `${t.slice(0, 79)}…` : t;
};

export async function listItems(userId: string, f: { q?: string; tag?: string; kind?: Kind; project?: string } = {}): Promise<Item[]> {
  const q = f.q?.trim().toLowerCase();
  return load(userId)
    .items.filter((i) => (!f.kind || i.kind === f.kind) && (!f.tag || i.tags.includes(f.tag)) && (!f.project || i.project_id === f.project))
    .filter((i) => !q || i.title.toLowerCase().includes(q) || i.tags.some((t) => t.toLowerCase().includes(q)))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getItem<D = unknown>(userId: string, id: string) {
  return (load(userId).items.find((i) => i.id === id) as Item<D> | undefined) ?? null;
}

export async function createItem<D>(userId: string, kind: Kind, title: string, data: D, project_id: string | null = null, now = Date.now()): Promise<Item<D>> {
  const at = new Date(now).toISOString();
  const item: Item<D> = { id: newId(kind), kind, title: titleOf(title), project_id, tags: [], created_at: at, updated_at: at, data, versions: [] };
  const s = load(userId);
  save(userId, { ...s, items: [...s.items, item as Item] });
  return item;
}

/** With keepVersion, the previous data goes into the item's history first (deck and research edits). */
export async function updateItem<D>(userId: string, id: string, patch: Partial<Pick<Item<D>, "title" | "tags" | "project_id" | "data">>, keepVersion = false, now = Date.now()) {
  const s = load(userId);
  const old = s.items.find((i) => i.id === id);
  if (!old) throw new Error("That item no longer exists.");
  const at = new Date(now).toISOString();
  const versions = keepVersion ? [...old.versions, { at, data: old.data }].slice(-MAX_VERSIONS) : old.versions;
  const next = { ...old, ...patch, title: patch.title !== undefined ? titleOf(patch.title) : old.title, versions, updated_at: at } as Item;
  save(userId, { ...s, items: s.items.map((i) => (i.id === id ? next : i)) });
  return next as Item<D>;
}

export async function restoreVersion(userId: string, id: string, at: string) {
  const it = await getItem(userId, id);
  const v = it?.versions.find((x) => x.at === at);
  if (!it || !v) throw new Error("That version no longer exists.");
  return updateItem(userId, id, { data: v.data }, true);
}

export async function deleteItem(userId: string, id: string) {
  const s = load(userId);
  save(userId, { ...s, items: s.items.filter((i) => i.id !== id) });
}

export async function deleteAll(userId: string) {
  save(userId, { items: [], projects: [] });
}

export async function listProjects(userId: string) {
  return [...load(userId).projects].sort((a, b) => b.created_at.localeCompare(a.created_at));
}
export async function createProject(userId: string, name: string, kind: Project["kind"], exam_date: string | null = null): Promise<Project> {
  if (!name.trim()) throw new Error("Give the project a name.");
  const p: Project = { id: newId("proj"), name: name.trim(), kind, exam_date, created_at: new Date().toISOString() };
  const s = load(userId);
  save(userId, { ...s, projects: [...s.projects, p] });
  return p;
}
export async function updateProject(userId: string, id: string, patch: Partial<Pick<Project, "name" | "kind" | "exam_date">>) {
  const s = load(userId);
  save(userId, { ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
}
/** Without items, the project's work stays in the library with no project. */
export async function deleteProject(userId: string, id: string, withItems: boolean) {
  const s = load(userId);
  const items = withItems ? s.items.filter((i) => i.project_id !== id) : s.items.map((i) => (i.project_id === id ? { ...i, project_id: null } : i));
  save(userId, { items, projects: s.projects.filter((p) => p.id !== id) });
}

/** Asks a question (or a follow-up in the same conversation). */
export async function ask(
  userId: string,
  { conversationId, text, level, project_id = null, fileHits, searchedFiles, now = Date.now() }: { conversationId?: string; text: string; level: Level; project_id?: string | null; fileHits?: FileHit[]; searchedFiles?: boolean; now?: number },
): Promise<Item<AskData>> {
  if (!text.trim()) throw new Error("Type a question first.");
  const a = answerQuestion({ text, level, fileHits, searchedFiles });
  const turn = { q: text.trim(), a };
  const prev = conversationId ? await getItem<AskData>(userId, conversationId) : null;
  const item = prev
    ? await updateItem<AskData>(userId, prev.id, { data: { level, turns: [...prev.data.turns, turn] } }, false, now)
    : await createItem<AskData>(userId, "ask", text, { level, turns: [turn] }, project_id, now);
  return item;
}

/** The student's Scholar settings. */
export type Prefs = { level: Level };
export const getPrefs = (userId: string): Prefs => read<Prefs>(`fmd-demo:scholar-prefs:${userId}`) ?? { level: "ug" };
export const setPrefs = (userId: string, p: Prefs) => write(`fmd-demo:scholar-prefs:${userId}`, p);
