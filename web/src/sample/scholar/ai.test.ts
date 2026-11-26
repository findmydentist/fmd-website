import assert from "node:assert/strict";
import { test } from "node:test";
import { answerQuestion } from "./ai.ts";
import { TOPICS } from "./topics.ts";

/** looks like a real citation: a year, "et al", a DOI or a journal */
const LOOKS_CITED = /\b(19|20)\d{2}\b|et al|doi|journal/i;

test("answers a pulpitis doubt at UG level, with the uncertain point flagged", () => {
  const a = answerQuestion({ text: "Why does irreversible pulpitis cause lingering pain?", level: "ug" });
  assert.equal(a.topic_id, "pulpitis");
  assert.ok(a.paragraphs.length >= 2);
  assert.equal(a.notes[0]?.kind, "uncertain");
  assert.ok(a.sources.some((s) => s.kind === "unverified"));
  assert.equal(a.out_of_scope, false);
});

test("the level changes the explanation, not the topic", () => {
  const ug = answerQuestion({ text: "irreversible pulpitis lingering pain", level: "ug" });
  const easy = answerQuestion({ text: "irreversible pulpitis lingering pain", level: "beginner" });
  assert.equal(easy.topic_id, "pulpitis");
  assert.notDeepEqual(easy.paragraphs, ug.paragraphs);
});

test("outside the demo's topics it says so instead of guessing", () => {
  const a = answerQuestion({ text: "What is quantum gravity?", level: "ug" });
  assert.equal(a.out_of_scope, true);
  assert.equal(a.topic_id, null);
  assert.match(a.paragraphs[0], /The demo can answer about/);
});

test("dosing for a real patient is refused: Scholar is for study", () => {
  const a = answerQuestion({ text: "My patient weighs 20 kg, how much lignocaine should I give?", level: "ug" });
  assert.ok(a.refused);
});

test("file hits become 'your file' sources and a quoted lead", () => {
  const a = answerQuestion({ text: "pulpitis lingering pain", level: "ug", fileHits: [{ file_id: "f1", name: "Endo lecture 4", page: 12, quote: "Pain lingers after the stimulus." }] });
  assert.deepEqual(a.sources[0], { kind: "file", file_id: "f1", name: "Endo lecture 4", page: 12, quote: "Pain lingers after the stimulus." });
  assert.match(a.paragraphs[0], /^From your notes: “Pain lingers after the stimulus\.”/);
});

test("no answer, in any topic or level, carries anything that looks like an invented reference", () => {
  for (const t of TOPICS)
    for (const level of ["beginner", "ug", "pg", "specialist"] as const) {
      const a = answerQuestion({ text: t.keywords.join(" "), level });
      assert.equal(a.topic_id, t.id, `${t.id} is found by its own keywords`);
      for (const s of a.sources) if (s.kind === "unverified") assert.doesNotMatch(s.label, LOOKS_CITED);
      for (const p of a.paragraphs) assert.doesNotMatch(p, /et al|doi/i);
    }
});

test("every topic has enough study material, and quiz answers point at a real option", () => {
  assert.equal(TOPICS.length, 5);
  for (const t of TOPICS) {
    assert.ok(t.quiz.length >= 5 && t.flashcards.length >= 6 && t.viva.length >= 5 && t.summary.length >= 5, t.id);
    for (const q of t.quiz) assert.ok(q.answer >= 0 && q.answer < q.options.length, `${t.id}: ${q.q}`);
  }
});

test("when the student's files were searched and say nothing, the answer says it's from general material", () => {
  const a = answerQuestion({ text: "pulpitis lingering pain", level: "ug", fileHits: [], searchedFiles: true });
  assert.equal(a.paragraphs[0], "Your files don't cover this, so this answer is from general study material.");
  assert.equal(a.topic_id, "pulpitis");
});
