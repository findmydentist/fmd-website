import assert from "node:assert/strict";
import { test } from "node:test";
import { clean } from "../../lib/analytics.ts";
import { createDeck } from "./decks.ts";
import { addDoc } from "./docs.ts";
import { exportAll, itemMarkdown } from "./export.ts";
import { ask, createProject } from "./workspace.ts";

const NOW = Date.parse("2026-11-15T11:00:00+05:30");

test("export everything: one Markdown file per item, plus the original uploads", async () => {
  const q = await ask("e1", { text: "Why does pulpitis pain linger?", level: "ug", now: NOW });
  await createDeck("e1", { topic: "Pulpitis", format: "seminar", audience: "ug", minutes: 10, slides: null, style: "plain", citations: true, notes: true, file_ids: [] }, null, NOW);
  const p = await createProject("e1", "Endo", "exam");
  await addDoc("e1", p.id, new File(["notes"], "my-notes.txt", { type: "text/plain" }));
  const files = await exportAll("e1");
  const names = files.map((f) => f.name).sort();
  assert.equal(files.length, 3);
  assert.ok(names.some((n) => /^ask-why-does-pulpitis-pain-linger.*\.md$/.test(n)), names.join());
  assert.ok(names.some((n) => /^deck-pulpitis.*\.md$/.test(n)), names.join());
  assert.ok(names.includes("my-notes.txt"));
  assert.match(itemMarkdown(q), /AI-generated study material/);
  assert.match(itemMarkdown(q), /Why does pulpitis pain linger\?/);
});

test("Scholar analytics events carry only their allowed properties", () => {
  assert.deepEqual(clean("scholar_feature_used", { feature: "deck", text: "my question" }), { feature: "deck" });
  assert.deepEqual(clean("scholar_generation_failed", { feature: "quiz", detail: "x" }), { feature: "quiz" });
  assert.deepEqual(clean("scholar_export", { format: "pdf", ok: true, title: "x" }), { format: "pdf", ok: true });
});
