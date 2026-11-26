import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { PICTURES, picturesFor } from "./pictures.ts";
import { makeStudy, type QuizData } from "./study.ts";
import { topicById } from "./topics.ts";

test("every picture question is well formed, credited, and its image is in public/", () => {
  assert.ok(PICTURES.length >= 6);
  for (const { topic_id, q } of PICTURES) {
    assert.ok(topicById(topic_id), topic_id);
    assert.ok(q.answer >= 0 && q.answer < q.options.length, q.q);
    assert.equal(new Set(q.options).size, q.options.length, `duplicate options: ${q.q}`);
    const i = q.image!;
    assert.ok(i && i.alt.length > 20 && i.credit && /^(CC0|CC BY-SA [34]\.0)$/.test(i.licence), q.q);
    assert.match(i.source, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    assert.ok(fs.existsSync(`public${i.src}`), `missing ${i.src}`);
  }
});

test("a topic quiz adds its picture questions only when asked", async () => {
  const NOW = Date.parse("2026-11-20T10:00:00+05:30");
  const plain = (await makeStudy("pics", "quiz", { topic_id: "caries" }, NOW)).data as QuizData;
  const withPics = (await makeStudy("pics", "quiz", { topic_id: "caries", pictures: true }, NOW)).data as QuizData;
  assert.equal(withPics.questions.length, plain.questions.length + picturesFor("caries").length);
  assert.equal(withPics.picks.length, withPics.questions.length);
  assert.ok(withPics.questions.at(-1)!.image);
  assert.ok(plain.questions.every((q) => !q.image));
});
