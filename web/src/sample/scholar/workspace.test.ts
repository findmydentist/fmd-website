import assert from "node:assert/strict";
import { test } from "node:test";
import { ask, createItem, createProject, deleteAll, deleteProject, getItem, listItems, listProjects, restoreVersion, updateItem } from "./workspace.ts";

const NOW = Date.parse("2026-11-15T11:00:00+05:30");

test("asking saves a conversation titled with the question", async () => {
  const it = await ask("w1", { text: "Why does irreversible pulpitis cause lingering pain?", level: "ug", now: NOW });
  assert.equal(it.kind, "ask");
  assert.equal(it.title, "Why does irreversible pulpitis cause lingering pain?");
  assert.equal(it.data.turns.length, 1);
  const again = await ask("w1", { conversationId: it.id, text: "Explain simpler", level: "beginner", now: NOW });
  assert.equal(again.id, it.id);
  assert.equal(again.data.turns.length, 2);
  assert.equal((await listItems("w1")).length, 1);
});

test("long questions are cut to 80 characters for the title", async () => {
  const it = await ask("w2", { text: `pulpitis ${"x".repeat(200)}`, level: "ug", now: NOW });
  assert.ok(it.title.length <= 80);
});

test("students on the pack can ask as much as they like", async () => {
  let it = await ask("w3", { text: "pulpitis", level: "ug", now: NOW });
  for (let i = 0; i < 249; i++) it = await ask("w3", { conversationId: it.id, text: "pulpitis lingering pain", level: "ug", now: NOW });
  assert.equal(it.data.turns.length, 250);
});


test("search finds items by title and tag", async () => {
  const it = await ask("w5", { text: "pulpitis pain", level: "ug", now: NOW });
  await updateItem("w5", it.id, { tags: ["endo", "finals"] });
  await createItem("w5", "summary", "Caries summary", {});
  assert.equal((await listItems("w5", { q: "PULP" })).length, 1);
  assert.equal((await listItems("w5", { tag: "finals" }))[0].id, it.id);
  assert.equal((await listItems("w5", { kind: "summary" })).length, 1);
});

test("versions are kept on request and can be restored", async () => {
  const it = await createItem("w6", "research", "Fluoride varnish", { v: 1 });
  await updateItem("w6", it.id, { data: { v: 2 } }, true);
  const after = (await getItem("w6", it.id))!;
  assert.deepEqual(after.data, { v: 2 });
  assert.equal(after.versions.length, 1);
  await restoreVersion("w6", it.id, after.versions[0].at);
  assert.deepEqual((await getItem("w6", it.id))!.data, { v: 1 });
});

test("deleting a project can keep its items; delete all empties everything", async () => {
  const p = await createProject("w7", "Endodontics", "exam", "2026-11-27");
  const it = await createItem("w7", "quiz", "Pulpitis quiz", {}, p.id);
  await deleteProject("w7", p.id, false);
  assert.equal((await getItem("w7", it.id))!.project_id, null);
  assert.equal((await listProjects("w7")).length, 0);
  const p2 = await createProject("w7", "Perio", "subject");
  await createItem("w7", "quiz", "Perio quiz", {}, p2.id);
  await deleteProject("w7", p2.id, true);
  assert.equal((await listItems("w7")).length, 1);
  await deleteAll("w7");
  assert.equal((await listItems("w7")).length, 0);
});
