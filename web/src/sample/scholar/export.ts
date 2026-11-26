/**
 * Export everything a student made in Scholar (Scholar plan part 5.2, PDR §8.5): one readable Markdown file per item,
 * plus their original uploads. Proposed API: POST /scholar/export → a zip, emailed or downloaded when ready.
 * The demo hands the files over one by one (no zip library).
 */
import { getFile } from "../files.ts";
import type { Answer } from "./ai.ts";
import { deckMarkdown, type DeckData } from "./decks.ts";
import { listDocs } from "./docs.ts";
import { researchMarkdown, type ResearchData } from "./research.ts";
import type { CardsData, PlanData, QuizData, SummaryData } from "./study.ts";
import type { VivaState } from "./viva.ts";
import { KIND_LABEL, listItems, type AskData, type Item } from "./workspace.ts";

const AI_NOTE = "AI-generated study material. Check it against your textbooks, guidelines or faculty.";
const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "item";

const sourcesMd = (a: Answer) =>
  a.sources.map((s, i) => `${i + 1}. ${s.kind === "file" ? `Your file · ${s.name}, p. ${s.page}` : `Unverified · check this source (${s.label})`}`);

/** Any saved item as readable Markdown. */
export function itemMarkdown(it: Item): string {
  if (it.kind === "deck") return deckMarkdown(it as Item<DeckData>);
  if (it.kind === "research") return researchMarkdown(it as Item<ResearchData>);
  const body: string[] = [];
  if (it.kind === "ask")
    for (const t of (it.data as AskData).turns) body.push(`## ${t.q}`, "", ...t.a.paragraphs, ...t.a.notes.map((n) => `> ${n.kind === "uncertain" ? "Uncertain" : "Evidence differs"}: ${n.text}`), ...(t.a.sources.length ? ["", "Sources:", ...sourcesMd(t.a)] : []), "");
  if (it.kind === "quiz")
    (it.data as QuizData).questions.forEach((q, i) => body.push(`${i + 1}. ${q.q}`, ...q.options.map((o, j) => `   ${j === q.answer ? "(answer) " : ""}${o}`), `   ${q.why}`, ""));
  if (it.kind === "flashcards") for (const c of (it.data as CardsData).cards) body.push(`- **${c.front}**: ${c.back}`);
  if (it.kind === "summary") for (const p of (it.data as SummaryData).points) body.push(`- ${p}`);
  if (it.kind === "plan") for (const d of (it.data as PlanData).days) body.push(`- [${d.done ? "x" : " "}] ${d.date}: ${d.topics.join(", ")}`);
  if (it.kind === "viva")
    (it.data as VivaState).questions.forEach((q, i) => {
      const a = (it.data as VivaState).answers[i];
      body.push(`## ${i + 1}. ${q.q}`, `Your answer: ${a.answer ?? "(skipped)"}`, ...(a.followAnswer ? [`Follow-up answer: ${a.followAnswer}`] : []), "Model outline:", ...q.outline.map((o) => `- ${o}`), "");
    });
  return [`# ${it.title}`, `${KIND_LABEL[it.kind]} · ${it.updated_at.slice(0, 10)}`, "", ...body, "", AI_NOTE].join("\n");
}

export async function exportAll(userId: string): Promise<{ name: string; blob: Blob }[]> {
  const items = (await listItems(userId)).map((it) => ({ name: `${it.kind}-${slug(it.title)}-${it.id.slice(-5)}.md`, blob: new Blob([itemMarkdown(it)], { type: "text/markdown" }) }));
  const files: { name: string; blob: Blob }[] = [];
  for (const d of await listDocs(userId)) {
    const blob = await getFile(d.id);
    if (blob) files.push({ name: d.name, blob });
  }
  return [...items, ...files];
}
