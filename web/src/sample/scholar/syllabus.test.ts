import assert from "node:assert/strict";
import { test } from "node:test";
import { makeStudy, type QuizData } from "./study.ts";
import { addOwnTopic, coverage, getSyllabus, removeOwnTopic, setOwnDone, setYear, SUBJECTS, TOPIC_SUBJECTS } from "./syllabus.ts";
import { TOPICS } from "./topics.ts";
import { listItems, updateItem } from "./workspace.ts";

test("every Scholar topic sits under at least one real subject", () => {
  for (const t of TOPICS) {
    const subs = TOPIC_SUBJECTS[t.id];
    assert.ok(subs?.length, t.id);
    for (const s of subs) assert.ok(SUBJECTS.some((x) => x.id === s), `${t.id} → ${s}`);
  }
});

test("coverage: Scholar topics count once practised, own topics once ticked", async () => {
  const u = "syl-1";
  setYear(u, 4);
  let s = addOwnTopic(u, "conservative", "  Rubber   dam isolation ");
  s = addOwnTopic(u, "conservative", "Endodontic access cavities");
  assert.equal(s.own[0].title, "Rubber dam isolation");
  assert.throws(() => addOwnTopic(u, "conservative", "rubber dam isolation"), /already on the list/);
  assert.throws(() => addOwnTopic(u, "conservative", "   "), /Type the topic/);
  assert.throws(() => addOwnTopic(u, "nope", "X"), /Pick a subject/);

  const it = await makeStudy(u, "quiz", { topic_id: "pulpitis" });
  const d = it.data as QuizData;
  await updateItem<QuizData>(u, it.id, { data: { ...d, picks: d.questions.map((q) => q.answer), done: true } });
  setOwnDone(u, s.own[0].id, true);

  const cons = coverage(await listItems(u), getSyllabus(u), 4).find((x) => x.id === "conservative")!;
  // pulpitis (practised), caries and class II (not yet), plus two own topics (one ticked)
  assert.equal(cons.total, 5);
  assert.equal(cons.covered, 2);
  assert.equal(cons.rows.find((r) => r.kind === "scholar" && r.topic_id === "pulpitis" && r.label === "Strong") !== undefined, true);

  removeOwnTopic(u, s.own[1].id);
  const after = coverage(await listItems(u), getSyllabus(u), 4).find((x) => x.id === "conservative")!;
  assert.equal(after.total, 4);
  const ortho = coverage([], getSyllabus(u), 4).find((x) => x.id === "orthodontics")!;
  assert.deepEqual([ortho.covered, ortho.total], [0, 0], "subjects without material still show, empty");
});
