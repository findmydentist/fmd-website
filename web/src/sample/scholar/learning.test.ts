import assert from "node:assert/strict";
import { test } from "node:test";
import { addToPlan, answerQotd, examCountdown, getTicks, istDay, labelFor, mistakes, monthStats, qotdAttempts, questionOfTheDay, setTick, suggestions, syncPlanDay, todayPlan, topicMastery, weekActivity } from "./learning.ts";
import { makeMistakeQuiz, makeStudy, MIXED, type PlanData, type QuizData } from "./study.ts";
import { TOPICS } from "./topics.ts";
import { rateViva, startViva, type VivaState } from "./viva.ts";
import { createProject, getItem, listItems, updateItem } from "./workspace.ts";

const NOW = Date.parse("2026-11-15T18:00:00+05:30");
const DAY = 86_400_000;

/** a finished quiz on `topic` with `right` of its questions answered correctly */
async function quiz(user: string, topic: string, right: number, at = NOW) {
  const it = await makeStudy(user, "quiz", { topic_id: topic }, at);
  const d = it.data as QuizData;
  const picks = d.questions.map((q, i) => (i < right ? q.answer : (q.answer + 1) % q.options.length));
  return updateItem<QuizData>(user, it.id, { data: { ...d, picks, done: true } }, false, at);
}

test("labels from a score", () => {
  assert.deepEqual([labelFor(84), labelFor(70), labelFor(55), labelFor(40)], ["Strong", "Good", "Building", "Revise"]);
});

test("strength by topic comes from finished quizzes and viva ratings only", async () => {
  await quiz("m1", "pulpitis", 4);
  await quiz("m1", "pulpitis", 5);
  await quiz("m1", "local-anaesthesia", 2);
  const v = await startViva("m1", { topic_id: "local-anaesthesia", level: "ug", count: 3, style: "strict" }, NOW);
  await updateItem<VivaState>("m1", v.id, { data: rateViva(rateViva(v.data, 0, 1), 1, 2) });
  await makeStudy("m1", "quiz", { topic_id: "caries" }, NOW); // not finished: no evidence
  const m = topicMastery(await listItems("m1"));
  assert.deepEqual(m.map((x) => x.topic_id), ["pulpitis", "local-anaesthesia"], "best first; caries has no finished work");
  assert.equal(m[0].score, 90);
  assert.equal(m[0].label, "Strong");
  assert.equal(m[1].score, 45, "quizzes 40% and viva ratings 33% and 67% average to 45");
  assert.equal(m[1].label, "Revise");
});

test("suggestions start with the weakest topic; with no work they suggest a first quiz", async () => {
  assert.match(suggestions([], NOW)[0].text, /Start with a 5-question quiz/);
  await quiz("m2", "pulpitis", 5);
  await quiz("m2", "local-anaesthesia", 2);
  await quiz("m2", "perio-classification", 3, NOW - 9 * DAY);
  const s = suggestions(await listItems("m2"), NOW);
  assert.ok(s.length >= 2 && s.length <= 3);
  assert.equal(s[0].topic_id, "local-anaesthesia");
  assert.match(s[0].action.href, /^\/scholar\/study\/quiz\?topic=local-anaesthesia/);
  assert.ok(s.some((x) => x.topic_id === "perio-classification"));
});

test("this week: seven days ending today, with what was done", async () => {
  await quiz("m3", "caries", 3, NOW);
  await quiz("m3", "caries", 3, NOW - 2 * DAY);
  const w = weekActivity(await listItems("m3"), NOW);
  assert.equal(w.days.length, 7);
  assert.equal(w.days[6].date, "2026-11-15");
  assert.deepEqual(w.days.map((d) => d.active), [false, false, false, false, true, false, true]);
  assert.equal(w.totals.studyDays, 2);
  assert.equal(w.totals.quizzes, 2);
});

test("question of the day is the same all day and changes the next day", () => {
  const a = questionOfTheDay("2026-11-15");
  assert.deepEqual(a, questionOfTheDay("2026-11-15"));
  assert.notDeepEqual(a.q, questionOfTheDay("2026-11-16").q);
  assert.ok(TOPICS.some((t) => t.id === a.topic_id && t.quiz.includes(a.q)));
});

test("today's plan, the exam countdown and adding a suggestion to the plan", async () => {
  const p = await createProject("m4", "Endodontics finals", "exam", "2026-11-27");
  const plan = await makeStudy("m4", "plan", { topics: ["Pulpitis and pulpal pain", "Dental caries"], exam_date: "2026-11-27" }, NOW - 4 * DAY);
  const d = plan.data as PlanData;
  await updateItem<PlanData>("m4", plan.id, { data: { ...d, days: d.days.map((x, i) => ({ ...x, done: i < 4 })) } });
  const items = await listItems("m4");
  const t = todayPlan(items, NOW)!;
  assert.equal(t.day.date, "2026-11-15");
  const c = examCountdown(items, [p], NOW)!;
  assert.deepEqual([c.name, c.daysLeft, c.plan?.done, c.plan?.total, c.plan?.onTrack], ["Endodontics finals", 12, 4, 16, true]);
  await addToPlan("m4", "Local anaesthesia in dentistry", NOW);
  const after = (await getItem<PlanData>("m4", plan.id))!.data;
  assert.ok(after.days.find((x) => x.date === "2026-11-16")!.topics.includes("Local anaesthesia in dentistry"));
});

test("today's ticks are kept per day", () => {
  setTick("m5", "2026-11-15", "summary", true);
  setTick("m5", "2026-11-15", "quiz", true);
  setTick("m5", "2026-11-15", "quiz", false);
  assert.deepEqual(getTicks("m5", "2026-11-15"), ["summary"]);
  assert.deepEqual(getTicks("m5", "2026-11-16"), []);
});

test("this month's stats", async () => {
  await quiz("m6", "caries", 4, NOW);
  await quiz("m6", "caries", 2, NOW - DAY);
  await quiz("m6", "caries", 5, Date.parse("2026-10-20T12:00:00+05:30")); // last month
  const s = monthStats(await listItems("m6"), NOW);
  assert.deepEqual([s.studyDays, s.avgQuiz, s.vivas], [2, 60, 0]);
});

test("only the weakest topic is called the lowest", async () => {
  await quiz("m7", "pulpitis", 1);
  await quiz("m7", "local-anaesthesia", 0);
  const s = suggestions(await listItems("m7"), NOW);
  assert.match(s[0].text, /your lowest/);
  assert.ok(s.slice(1).every((x) => !/your lowest/.test(x.text)), s.map((x) => x.text).join(" | "));
});

test("mistake notebook: latest wrong answers from quizzes and the question of the day; a later right answer clears one", async () => {
  const u = "mistakes-1";
  const caries = TOPICS.find((t) => t.id === "caries")!;
  await quiz(u, "caries", 3, NOW - DAY); // first 3 right, the rest wrong
  const wrongQs = caries.quiz.slice(3).map((q) => q.q);
  let m = mistakes(await listItems(u), []);
  assert.deepEqual(new Set(m.map((x) => x.q.q)), new Set(wrongQs));
  assert.ok(m.every((x) => x.topic_id === "caries" && x.times === 1));

  // the question of the day, answered wrong, joins the notebook
  const date = "2026-11-15";
  answerQotd(u, date, (questionOfTheDay(date).q.answer + 1) % questionOfTheDay(date).q.options.length, NOW);
  answerQotd(u, date, questionOfTheDay(date).q.answer, NOW); // a second answer the same day is ignored
  m = mistakes(await listItems(u), qotdAttempts(u));
  assert.ok(m.some((x) => x.q.q === questionOfTheDay(date).q.q));
  assert.equal(qotdAttempts(u).length, 1);

  // "Quiz me on my mistakes", all answered right: the notebook is empty and caries' strength goes up
  const before = topicMastery(await listItems(u)).find((x) => x.topic_id === "caries")!.score;
  const mq = await makeMistakeQuiz(u, m, NOW);
  const d = mq.data as QuizData;
  assert.equal(d.topic_id, MIXED);
  await updateItem<QuizData>(u, mq.id, { data: { ...d, picks: d.questions.map((q) => q.answer), done: true } }, false, NOW + 60_000);
  assert.deepEqual(mistakes(await listItems(u), qotdAttempts(u)), []);
  assert.ok(topicMastery(await listItems(u)).find((x) => x.topic_id === "caries")!.score > before);
  assert.ok(!topicMastery(await listItems(u)).some((x) => x.topic_id === MIXED), "the mixed quiz isn't a topic of its own");
});

test("ticking all four of today's tasks marks today done on the plan; unticking one undoes it", async () => {
  const u = "sync-1";
  const today = istDay(NOW);
  const exam = new Date(Date.parse(`${today}T00:00:00Z`) + 5 * DAY).toISOString().slice(0, 10);
  await makeStudy(u, "plan", { topics: ["Dental caries"], exam_date: exam }, NOW);
  const dayDone = async () => todayPlan(await listItems(u), NOW)!.day.done;
  assert.equal(await syncPlanDay(u, 3, NOW), false, "three of four: nothing changes");
  assert.equal(await dayDone(), false);
  assert.equal(await syncPlanDay(u, 4, NOW), true);
  assert.equal(await dayDone(), true);
  assert.equal(await syncPlanDay(u, 4, NOW), false, "already done");
  assert.equal(await syncPlanDay(u, 3, NOW), true);
  assert.equal(await dayDone(), false);
  assert.equal(await syncPlanDay("no-plan", 4, NOW), false);
});
