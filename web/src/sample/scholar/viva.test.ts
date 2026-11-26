import assert from "node:assert/strict";
import { test } from "node:test";
import { answerViva, clock, endViva, followUpText, rateViva, skipViva, startViva, timings, type VivaConfig } from "./viva.ts";

const NOW = Date.parse("2026-11-15T11:00:00+05:30");
const cfg: VivaConfig = { topic_id: "local-anaesthesia", level: "ug", count: 3, style: "standard" };

test("a session asks, follows up, moves on, and ends in review", async () => {
  const it = await startViva("v1", cfg, NOW);
  let s = it.data;
  assert.equal(s.questions.length, 3);
  assert.deepEqual([s.index, s.phase], [0, "asking"]);
  s = answerViva(s, "It blocks sodium channels.");
  assert.deepEqual([s.index, s.phase], [0, "follow_up"]);
  s = answerViva(s, "Lower pKa, faster onset.");
  assert.deepEqual([s.index, s.phase], [1, "asking"]);
  assert.equal(s.answers[0].answer, "It blocks sodium channels.");
  assert.equal(s.answers[0].followAnswer, "Lower pKa, faster onset.");
  s = answerViva(answerViva(s, "a"), "b");
  s = answerViva(answerViva(s, "c"), "d");
  assert.equal(s.phase, "review");
  s = rateViva(s, 0, 3);
  assert.equal(s.answers[0].rating, 3);
});

test("skip records no answer and moves on", async () => {
  let s = (await startViva("v2", cfg, NOW)).data;
  s = skipViva(s);
  assert.deepEqual([s.index, s.phase, s.answers[0].answer], [1, "asking", null]);
});

test("ending early goes to review, with the rest unanswered", async () => {
  let s = (await startViva("v3", cfg, NOW)).data;
  s = skipViva(s);
  s = endViva(s);
  assert.equal(s.phase, "review");
  assert.deepEqual(s.answers.map((a) => a.answer), [null, null, null]);
});

test("a count above the topic's questions cycles through them", async () => {
  const s = (await startViva("v4", { ...cfg, count: 10 }, NOW)).data;
  assert.equal(s.questions.length, 10);
});

test("the examiner's style changes the follow-up", () => {
  const q = { q: "x", outline: [], followUp: "Why?" };
  assert.match(followUpText(q, "strict"), /^Be precise\. Why\?/);
  assert.match(followUpText(q, "gentle"), /^Good start\. Why\?/);
  assert.equal(followUpText(q, "standard"), "Why?");
});


test("spoken viva: answers keep how long they took; the review sums it up", async () => {
  const it = await startViva("viva-time", { topic_id: "pulpitis", level: "ug", count: 3, style: "standard", spoken: true });
  let s = it.data;
  assert.equal(s.config.spoken, true);
  assert.equal(timings(s), null, "nothing timed yet");
  s = answerViva(s, "Lingering pain after cold", 41.6);
  s = answerViva(s, "C-fibres", 12.2);
  s = skipViva(s);
  s = answerViva(s, "Untimed answer");
  assert.deepEqual([s.answers[0].secs, s.answers[0].followSecs], [42, 12]);
  assert.equal(s.answers[2].secs, null);
  assert.deepEqual(timings(s), { count: 2, average: 27, longest: 42 });
  assert.equal(answerViva(it.data, "x", -5).answers[0].secs, 0, "never negative");
  assert.deepEqual([clock(0), clock(42), clock(65), clock(750)], ["0:00", "0:42", "1:05", "12:30"]);
});
