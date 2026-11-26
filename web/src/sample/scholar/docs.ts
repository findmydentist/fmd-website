/**
 * The student's own notes and papers (Scholar plan part 2.4, PDR §8.2): uploaded into a project and searched so answers
 * can cite "Your file · name, p. N". Sample data until the backend has it. Proposed API:
 *   POST /scholar/files (multipart, project_id) → Doc · GET /scholar/files?project_id · DELETE /scholar/files/{id}
 * The demo reads text files only; PDFs and images are stored and listed, and say they can't be read yet (a real
 * service extracts text and page numbers). File text is data: it's quoted, and never followed as an instruction.
 */
import { deleteFile, putFile } from "../files.ts";
import { read, write } from "../store.ts";
import type { FileHit } from "./ai.ts";
import { newId } from "./workspace.ts";

export type Doc = { id: string; project_id: string; name: string; type: string; size: number; pages: string[] | null; status: "ready" | "unreadable"; uploaded_at: string };

const TYPES = ["application/pdf", "text/plain", "text/markdown", "image/jpeg", "image/png"];
const MAX = 10 * 1024 * 1024;
export const UNREADABLE = "The demo can't read text from PDFs or images yet. Try a .txt file or the sample lecture notes.";

export function checkDoc(f: { name: string; type: string; size: number }): string | null {
  const type = f.type || (/\.md$/i.test(f.name) ? "text/markdown" : /\.txt$/i.test(f.name) ? "text/plain" : "");
  if (!TYPES.includes(type)) return "Upload a PDF, text file or image.";
  if (f.size > MAX) return "That file is over 10 MB.";
  return null;
}

/** Pages at form feeds (as text exports of PDFs have), otherwise every 2,500 characters. */
export function splitPages(text: string): string[] {
  if (text.includes("\f")) return text.split("\f").map((p) => p.trim());
  const pages: string[] = [];
  for (let i = 0; i < text.length; i += 2500) pages.push(text.slice(i, i + 2500));
  return pages.length ? pages : [""];
}

const key = (userId: string) => `fmd-demo:scholar-docs:${userId}`;
const load = (userId: string) => read<Doc[]>(key(userId)) ?? [];

export async function listDocs(userId: string, project_id?: string) {
  return load(userId).filter((d) => !project_id || d.project_id === project_id);
}

export async function addDoc(userId: string, project_id: string, file: File): Promise<Doc> {
  const problem = checkDoc(file);
  if (problem) throw new Error(problem);
  const id = newId("doc");
  const text = file.type.startsWith("text/") || /\.(txt|md)$/i.test(file.name);
  const doc: Doc = {
    id,
    project_id,
    name: file.name,
    type: file.type,
    size: file.size,
    pages: text ? splitPages(await file.text()) : null,
    status: text ? "ready" : "unreadable",
    uploaded_at: new Date().toISOString(),
  };
  await putFile(id, file);
  write(key(userId), [...load(userId), doc]);
  return doc;
}

const SAMPLE = [
  "Endodontics lecture 4: pulpal diagnosis. Aims: relate the patient's pain history to the likely state of the pulp, and choose tests that support the diagnosis.",
  "Reversible pulpitis gives sharp pain to cold or sweet stimuli that settles within a few seconds of removing the stimulus. Irreversible pulpitis gives lingering pain that lasts well after the stimulus, often more than 30 seconds, and may be spontaneous or wake the patient at night. Lingering pain reflects sensitised C-fibres in the inflamed pulp.",
  "Pulp sensibility tests (cold, electric) test the nerves, not the blood supply, so a traumatised tooth can test negative and still be vital. Always combine tests with history, percussion and a periapical radiograph.",
  "Local anaesthesia in the hot tooth: inflamed tissue is more acidic, so less anaesthetic is in the uncharged form that crosses the nerve membrane. Consider supplementary buccal infiltration or intraligamentary injection when an inferior alveolar nerve block is not enough.",
];
/** Seeded notes so the feature can be tried without a file to hand. */
export async function addSampleNotes(userId: string, project_id: string) {
  const file = new File([SAMPLE.join("\f")], "Endo lecture 4 (sample notes).txt", { type: "text/plain" });
  return addDoc(userId, project_id, file);
}

export async function deleteDoc(userId: string, id: string) {
  await deleteFile(id);
  write(key(userId), load(userId).filter((d) => d.id !== id));
}

const STOP = new Set(["what", "which", "with", "that", "this", "does", "from", "have", "about", "there", "their", "when", "where", "explain", "tell", "should", "would", "could", "into", "your", "them", "they", "then", "than", "also", "some", "more", "most", "very"]);
const words = (s: string) => [...new Set(s.toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? [])].filter((w) => !STOP.has(w));
const hitsIn = (text: string, q: string[]) => {
  const t = text.toLowerCase();
  return q.filter((w) => t.includes(w)).length;
};

/** Pages that share the most words with the question; each with its best sentence as a short quote. */
export function searchDocs(docs: Doc[], query: string, max = 3): FileHit[] {
  const q = words(query);
  if (!q.length) return [];
  const found: (FileHit & { score: number })[] = [];
  for (const d of docs) {
    if (!d.pages) continue;
    d.pages.forEach((page, i) => {
      const score = hitsIn(page, q);
      if (!score) return;
      const best = page
        .split(/(?<=[.!?])\s+/)
        .map((s) => ({ s, n: hitsIn(s, q) }))
        .sort((a, b) => b.n - a.n)[0].s.trim();
      found.push({ file_id: d.id, name: d.name.replace(/\.(txt|md)$/i, ""), page: i + 1, quote: best.length > 240 ? `${best.slice(0, 239)}…` : best, score });
    });
  }
  return found
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((h) => ({ file_id: h.file_id, name: h.name, page: h.page, quote: h.quote }));
}
