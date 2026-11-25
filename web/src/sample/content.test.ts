import assert from "node:assert/strict";
import { test } from "node:test";
import { write } from "./store.ts";
import { addComment, checkDraft, comments, creatorPosts, DEID_CHECKS, discoverGrid, feed, searchExplore, toggleCommentLike, importPreview, myPosts, newDraft, noteSearch, report, REVIEW_MS, saveDraft, toggleFollow, vote } from "./content.ts";
import { setConsent } from "./privacy.ts";

test("the feed: a reason on every card, one labelled sponsored post, never in Following", async () => {
  const f = await feed(null, "for_you");
  assert.ok(f.every((p) => p.reason));
  assert.equal(f.filter((p) => p.sponsored_by).length, 1);
  assert.match(f.find((p) => p.sponsored_by)!.reason, /paid placement/);
  await toggleFollow("u1", "priyanka-shah");
  assert.ok((await feed("u1", "following")).every((p) => !p.sponsored_by));
  assert.ok((await feed(null, "reels")).every((p) => p.kind === "video"));
});

test("a past search shapes the feed only with the personalisation consent", async () => {
  await noteSearch("u2", "braces for my son");
  assert.ok(!(await feed("u2", "for_you")).some((p) => /searched/.test(p.reason)), "no consent: the search isn't used");
  await setConsent("u2", "personalisation", true);
  await noteSearch("u2", "braces for my son");
  const f = await feed("u2", "for_you");
  assert.equal(f[0].topic, "Orthodontics");
  assert.match(f[0].reason, /searched for/);
  assert.ok(f.some((p) => p.topic !== "Orthodontics"), "general education is still mixed in");
});

test("polls show results only after voting, once", async () => {
  assert.equal((await feed("u3", "for_you")).find((p) => p.poll)!.votes, null);
  await vote("u3", "p-gums-poll", 1);
  assert.deepEqual((await feed("u3", "for_you")).find((p) => p.poll)!.votes, [41, 64, 18, 12]);
  await assert.rejects(vote("u3", "p-gums-poll", 2), /already/);
});

test("signed-out people can read but not act; comments and reports have rules", async () => {
  await assert.rejects(vote(null, "p-gums-poll", 0), /Log in/);
  await assert.rejects(addComment("u4", "Me", "p-kids", "  "), /Write something/);
  await addComment("u4", "Me", "p-kids", "Thanks, very helpful");
  assert.equal((await comments("u4", "p-kids")).filter((c) => c.mine).length, 1);
  await assert.rejects(report("u4", "p-kids", "", ""), /Choose/);
  await assert.rejects(report("u4", "p-kids", "other", ""), /Tell us/);
  await report("u4", "p-kids", "misinformation", "");
  await assert.rejects(report("u4", "p-kids", "spam", ""), /already/);
});

test("creating posts: patient cases need consent and every privacy check; imports only from supported platforms", () => {
  const d = { ...newDraft(), title: "Gap closed", body: "Bonding case", owns: true, is_case: true };
  assert.match(checkDraft(d)!, /documented consent/);
  assert.match(checkDraft({ ...d, consent: { kind: "clinic_record", ref: "CR-12" } })!, /privacy check/);
  assert.equal(checkDraft({ ...d, consent: { kind: "clinic_record", ref: "CR-12" }, deidentified: DEID_CHECKS }), null);
  assert.match(checkDraft({ ...newDraft(), title: "x", body: "y", owns: false })!, /own this content/);
  assert.equal((importPreview("https://youtu.be/abcdef123") as { platform: string }).platform, "YouTube");
  assert.match((importPreview("https://example.com/video.mp4") as { error: string }).error, /upload it instead/);
});

test("a submitted post is reviewed, then published", async () => {
  const now = Date.parse("2026-11-10T11:00:00+05:30");
  const d = await saveDraft("u5", { ...newDraft(), title: "Floss daily", body: "Once a day.", owns: true }, true, now);
  assert.equal(d.status, "in_review");
  assert.equal((await myPosts("u5", now + REVIEW_MS)).find((x) => x.id === d.id)!.status, "published");
  assert.ok((await myPosts("u5", now)).some((x) => x.status === "rejected" && x.reason));
});

test("every post has full-resolution media except polls", async () => {
  const all = await feed(null, "for_you");
  assert.ok(all.length >= 16);
  for (const p of all.filter((x) => x.kind !== "poll")) assert.ok(p.media.length >= 1, `${p.id} has no media`);
  for (const p of all.filter((x) => x.kind === "carousel")) assert.ok(p.media.length >= 2 && p.media.length <= 10, `${p.id} carousel size`);
  for (const p of all.filter((x) => x.kind === "slides")) assert.ok(p.slides && p.slides.length >= 2 && p.slides.length <= 6, `${p.id} slides`);
  const clips = await feed(null, "reels");
  assert.ok(clips.length >= 4 && clips.every((p) => p.kind === "video"));
});

test("case posts carry a treatment chip and a consent line", async () => {
  const cases = (await feed(null, "for_you")).filter((p) => p.is_case);
  assert.ok(cases.length >= 2);
  for (const p of cases) {
    assert.ok(p.treatment?.name, `${p.id} has no treatment`);
    assert.match(p.caption, /consent/i);
  }
});

test("only creators author posts", async () => {
  for (const p of await feed(null, "for_you")) assert.ok(["dentist", "clinic", "student", "fmd"].includes(p.author.kind), `${p.id} by ${p.author.kind}`);
  for (const p of await feed(null, "for_you")) assert.ok(p.author.handle, `${p.id} author has no handle`);
});

test("comments: replies nest under the top-level comment, and comments can be appreciated", async () => {
  await addComment("cm1", "Asha", "p-kids", "When should the first visit be?");
  const top = (await comments("cm1", "p-kids")).find((c) => c.mine)!;
  await addComment("cm1", "Asha", "p-kids", "Thanks!", top.id);
  const reply = (await comments("cm1", "p-kids")).find((c) => c.id === top.id)!.replies[0]!;
  assert.equal(reply.body, "Thanks!");
  await addComment("cm1", "Asha", "p-kids", "And a reply to the reply", reply.id);
  const thread = (await comments("cm1", "p-kids")).find((c) => c.id === top.id)!;
  assert.equal(thread.replies.length, 2, "a reply to a reply joins the top-level thread");
  assert.ok(!(await comments("cm1", "p-kids")).some((c) => c.body === "Thanks!"), "replies aren't listed at the top level");
  assert.equal(await toggleCommentLike("cm1", "c-1"), true);
  assert.equal((await comments("cm1", "p-floss")).find((c) => c.id === "c-1")!.liked, true);
  assert.equal(await toggleCommentLike("cm1", "c-1"), false);
  await assert.rejects(addComment("cm1", "Asha", "p-kids", "   "), /Write something/);
});

test("search finds people, posts and tags; a # searches tags only", async () => {
  const r = await searchExplore("ortho");
  assert.ok(r.creators.some((c) => c.id === "rohan-mehta"), "the orthodontist");
  assert.ok(r.creators.some((c) => c.id === "arjun-nair"), "the MDS orthodontics student");
  const tag = await searchExplore("#aligners");
  assert.equal(tag.creators.length, 0);
  assert.ok(tag.posts.length >= 1 && tag.posts.every((p) => p.tags.includes("aligners")));
  assert.deepEqual(tag.tags[0], { tag: "aligners", count: tag.posts.length });
  assert.deepEqual(await searchExplore("   "), { creators: [], posts: [], tags: [] });
});

test("the discovery grid mixes in a clip every fifth tile and can be narrowed to a topic", async () => {
  const g = await discoverGrid(null);
  assert.ok(g.length >= 12);
  for (let i = 4; i < g.length; i += 5) if (g.slice(i).some((p) => p.kind === "video")) assert.equal(g[i]!.kind, "video", `tile ${i}`);
  const kids = await discoverGrid(null, "Kids");
  assert.ok(kids.length >= 1 && kids.every((p) => p.topic === "Kids"));
  assert.ok(g.every((p) => p.kind !== "poll"), "polls aren't grid tiles");
});

test("a creator's profile tabs: posts without clips, clips only, and posts that tag them", async () => {
  const posts = await creatorPosts(null, "aditi-sharma", "posts");
  assert.ok(posts.length >= 2 && posts.every((p) => p.author.id === "aditi-sharma" && p.kind !== "video"));
  const clips = await creatorPosts(null, "aditi-sharma", "reels");
  assert.ok(clips.length >= 1 && clips.every((p) => p.author.id === "aditi-sharma" && p.kind === "video"));
  const tagged = await creatorPosts(null, "aditi-sharma", "tagged");
  assert.ok(tagged.length >= 2 && tagged.every((p) => p.tags.includes("dr.aditi") && p.author.id !== "aditi-sharma"));
});

test("drafts: carousels need 2+ photos, clips need a clip, cases still need consent", () => {
  const base = { ...newDraft(), title: "Smile", body: "One visit", owns: true };
  assert.match(checkDraft({ ...base, kind: "carousel", media: ["smile-1"] })!, /at least 2 photos/);
  assert.equal(checkDraft({ ...base, kind: "carousel", media: ["smile-1", "smile-2"] }), null);
  assert.match(checkDraft({ ...base, kind: "photo", media: [] })!, /Pick a photo/);
  assert.match(checkDraft({ ...base, kind: "video", media: ["smile-1"] })!, /Pick a clip/);
  assert.equal(checkDraft({ ...base, kind: "video", media: ["clip-toothbrush"] }), null);
  assert.match(checkDraft({ ...base, kind: "photo", media: ["smile-2"], is_case: true })!, /documented consent/);
});

test("drafts saved by an older version don't break the feed", async () => {
  write("fmd-demo:content:old-user", { liked: [], following: [], votes: {}, comments: [], reports: [], drafts: [{ id: "d-old", kind: "image", title: "Old", body: "x", media: { name: "a.jpg" }, status: "published", publish_at: "2026-01-01T00:00:00.000Z", submitted_at: "2026-01-01T00:00:00.000Z", tags: [] }] });
  const f = await feed("old-user", "for_you");
  assert.ok(f.length > 0);
  assert.ok(!f.some((p) => p.id === "d-old"));
});
