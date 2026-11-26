import assert from "node:assert/strict";
import { test } from "node:test";
import { dueCards, dueOn, makeStudy, missedDays, nextCard, rateCard, reschedulePlan, revisionPlan, scheduleCard, scoreQuiz, startCards, type CardsData } from "./study.ts";
import { TOPICS } from "./topics.ts";
import { listItems, updateItem } from "./workspace.ts";

test("spaced repetition: 'Knew it' climbs the boxes, 'Again' drops to box 1, same-day repeats don't promote", () => {
  let s = scheduleCard(undefined, "good", "2026-11-20");
  assert.deepEqual(s, { box: 1, due: "2026-11-21", last: "2026-11-20" });
  s = scheduleCard(s, "good", "2026-11-21");
  assert.deepEqual(s, { box: 2, due: "2026-11-24", last: "2026-11-21" });
  s = scheduleCard(s, "good", "2026-11-24");
  assert.equal(s.box, 3);
  assert.equal(s.due, "2026-12-01");
  s = scheduleCard(s, "again", "2026-12-01");
  assert.deepEqual(s, { box: 1, due: "2026-12-02", last: "2026-12-01" });
  assert.deepEqual(scheduleCard(s, "good", "2026-12-01"), s, "Knew it after Again in the same session keeps box 1");
  let top = { box: 5, due: "2027-01-01", last: "2026-12-01" };
  top = scheduleCard(top, "good", "2027-01-01");
  assert.deepEqual(top, { box: 5, due: "2027-01-31", last: "2027-01-01" }, "box 5 is the ceiling");
  assert.equal(scheduleCard(undefined, "again", "2026-11-30").due, "2026-12-01", "dates cross month ends");
});

test("due cards: only rated cards due by today, across sets, most overdue first", async () => {
  const NOW = Date.parse("2026-11-20T10:00:00+05:30");
  const a = await makeStudy("srs", "flashcards", { topic_id: "caries" }, NOW);
  const b = await makeStudy("srs", "flashcards", { topic_id: "pulpitis" }, NOW);
  const da = a.data as CardsData;
  const db = b.data as CardsData;
  await updateItem<CardsData>("srs", a.id, { data: { ...da, sched: { 0: { box: 1, due: "2026-11-20", last: "2026-11-19" }, 1: { box: 2, due: "2026-11-23", last: "2026-11-20" } } } });
  await updateItem<CardsData>("srs", b.id, { data: { ...db, sched: { 2: { box: 3, due: "2026-11-18", last: "2026-11-11" } } } });
  const items = await listItems("srs");
  const due = dueCards(items, "2026-11-20");
  assert.deepEqual(due.map((d) => [d.item_id, d.idx]), [[b.id, 2], [a.id, 0]]);
  assert.equal(due[1].front, da.cards[0].front);
  assert.equal(dueOn(items, "2026-11-23"), 1);
  assert.equal(dueCards(items, "2026-11-17").length, 0, "nothing is due before its date; unrated cards never are");
});

const quiz = TOPICS[0].quiz.slice(0, 3);

test("quiz score counts skipped questions as wrong", () => {
  const right = quiz.map((q) => q.answer);
  assert.deepEqual(scoreQuiz(quiz, right), { correct: 3, total: 3, wrong: [] });
  const picks = [right[0], (right[1] + 1) % quiz[1].options.length, null];
  assert.deepEqual(scoreQuiz(quiz, picks), { correct: 1, total: 3, wrong: [1, 2] });
});

test("flashcards: 'again' brings a card back 3 places later; 'good' retires it", () => {
  let s = startCards(5);
  assert.equal(nextCard(s), 0);
  s = rateCard(s, 0, "again");
  assert.deepEqual(s.order, [1, 2, 3, 0, 4]);
  s = rateCard(s, 1, "good");
  assert.deepEqual(s.order, [2, 3, 0, 4]);
  s = rateCard(rateCard(s, 2, "again"), 3, "again");
  assert.deepEqual(s.order, [0, 4, 2, 3], "near the end, 'again' goes to the end");
  for (const i of [0, 4, 2, 3]) s = rateCard(s, i, "good");
  assert.equal(nextCard(s), null);
});

test("a revision plan covers every day up to the exam, every topic, and ends with a full revision", () => {
  const topics = ["Pulpitis", "Caries", "Class II", "Local anaesthesia", "Perio staging"];
  const plan = revisionPlan(topics, "2026-11-15", "2026-11-27");
  assert.equal(plan.length, 12);
  assert.equal(plan[0].date, "2026-11-15");
  assert.equal(plan.at(-1)!.date, "2026-11-26");
  assert.ok(plan.every((d) => d.date < "2026-11-27" && !d.done));
  for (const t of topics) assert.ok(plan.some((d) => d.topics.includes(t)), t);
  assert.deepEqual(plan.at(-1)!.topics, ["Revise everything"]);
  assert.throws(() => revisionPlan(topics, "2026-11-15", "2026-11-15"), /Pick an exam date after today/);
});

test("making a study set saves it", async () => {
  const NOW = Date.parse("2026-11-15T11:00:00+05:30");
  const it = await makeStudy("s1", "quiz", { topic_id: "caries" }, NOW);
  assert.equal(it.kind, "quiz");
  assert.equal(it.title, "Quiz · Dental caries");
});

test("catch up: missed days' topics move onto the days left; ticked days, the last day and the exam date stay", () => {
  const topics = ["Pulpitis", "Caries", "Class II", "Local anaesthesia", "Perio staging"];
  const plan = { topics, exam_date: "2026-11-27", days: revisionPlan(topics, "2026-11-15", "2026-11-27") };
  plan.days[0].done = true; // 15th done; 16th and 17th missed; today is the 18th
  assert.equal(missedDays(plan, "2026-11-18"), 2);
  const next = reschedulePlan(plan, "2026-11-18");
  assert.equal(missedDays(next, "2026-11-18"), 0);
  assert.equal(next.moved, 2);
  assert.equal(next.days[0].date, "2026-11-15");
  assert.equal(next.days[1].date, "2026-11-18", "missed days leave the plan; their topics move");
  assert.ok(next.days[1].topics.includes("Caries"), "the first missed topic comes first");
  assert.deepEqual(next.days.at(-1), plan.days.at(-1));
  for (const t of ["Caries", "Class II"]) assert.ok(next.days.slice(1).some((d) => d.topics.includes(t)), t);
  const before = plan.days.filter((d) => d.date >= "2026-11-18" && d !== plan.days.at(-1)).flatMap((d) => d.topics);
  for (const t of before) assert.ok(next.days.some((d) => d.topics.includes(t)), `kept ${t}`);
  assert.deepEqual(reschedulePlan(next, "2026-11-18"), next, "nothing missed, nothing changes");

  // only the last day left: the missed topics join it
  const late = reschedulePlan(plan, "2026-11-26");
  assert.deepEqual(late.days.at(-1)!.topics.slice(0, 1), ["Revise everything"]);
  assert.ok(late.days.at(-1)!.topics.includes("Caries"));
});
