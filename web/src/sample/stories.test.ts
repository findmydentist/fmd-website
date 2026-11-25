import assert from "node:assert/strict";
import { test } from "node:test";
import { addStory, markStorySeen, storyById, storyRail } from "./stories.ts";

const DAY = 86_400_000;

test("moments older than a day leave the rail but stay in highlights", async () => {
  const now = Date.now();
  const rail = await storyRail(null, now);
  assert.ok(rail.length >= 5);
  for (const r of rail) for (const s of r.items) assert.ok(now - Date.parse(s.at) < DAY, `${s.id} is older than a day`);
  assert.ok(!rail.some((r) => r.items.some((s) => s.id === "s-aditi-2")), "a 30-hour-old moment is off the rail");
  assert.ok(storyById("s-aditi-2"), "but still findable for a highlight");
});

test("a ring is seen only when every moment in it is seen, and unseen rings come first", async () => {
  const v = "st1";
  const before = await storyRail(v);
  const ring = before.find((r) => r.items.length >= 2)!;
  assert.ok(ring, "some creator has two moments today");
  await markStorySeen(v, ring.items[0]!.id);
  assert.equal((await storyRail(v)).find((r) => r.creator.id === ring.creator.id)!.seen, false);
  for (const s of ring.items) await markStorySeen(v, s.id);
  const after = await storyRail(v);
  assert.equal(after.find((r) => r.creator.id === ring.creator.id)!.seen, true);
  const firstSeen = after.findIndex((r) => r.seen);
  assert.ok(after.slice(firstSeen).every((r) => r.seen), "all seen rings sit after the unseen ones");
});

test("signed out: the rail works and nothing is seen", async () => {
  const rail = await storyRail(null);
  assert.ok(rail.every((r) => !r.seen));
  await assert.rejects(markStorySeen("", "s-rohan-1"), /Log in/);
});

test("adding a moment puts it on the creator's ring", async () => {
  const s = await addStory("st2", "rohan-mehta", "moment-smile-3", "Retainers in!");
  const ring = (await storyRail("st2")).find((r) => r.creator.id === "rohan-mehta")!;
  assert.equal(ring.items[ring.items.length - 1]!.id, s.id);
  await assert.rejects(addStory("st2", "rohan-mehta", "nope-key"), /nope-key/);
});
