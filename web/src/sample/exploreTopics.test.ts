import assert from "node:assert/strict";
import { test } from "node:test";
import { EXPLORE_TOPICS, matchTopic, topicPage } from "./exploreTopics.ts";

test("six common treatments and problems, each with a plain explainer and a specialty", () => {
  assert.equal(EXPLORE_TOPICS.length, 6);
  assert.deepEqual(
    EXPLORE_TOPICS.map((t) => t.slug),
    ["braces-aligners", "root-canal", "implants", "gum-problems", "kids-teeth", "sensitivity-toothache"],
  );
  for (const t of EXPLORE_TOPICS) {
    assert.ok(t.explainer.length >= 2, t.slug);
    assert.ok(t.specialty, t.slug);
  }
});

test("a search for a topic's name or a plain word finds the topic", () => {
  assert.equal(matchTopic("root canal")?.slug, "root-canal");
  assert.equal(matchTopic("Aligners")?.slug, "braces-aligners");
  assert.equal(matchTopic("my gums bleed")?.slug, "gum-problems");
  assert.equal(matchTopic("dr rohan"), null);
});

test("a topic page shows only posts about it, newest first, and three dentists who treat it", async () => {
  const p = (await topicPage("braces-aligners", null))!;
  assert.ok(p.posts.length >= 1);
  for (const post of p.posts) {
    const text = [post.title, post.caption, post.treatment?.name ?? "", ...post.tags].join(" ").toLowerCase();
    assert.ok(/align|ortho|braces/.test(text), post.title);
  }
  assert.ok(p.posts.every((x) => !x.sponsored_by), "no ads on a topic page");
  assert.ok(p.dentists.length > 0 && p.dentists.length <= 3);
  assert.ok(p.dentists.every((d) => d.specialty === "Orthodontist"));
  assert.equal(await topicPage("nope", null), null);
});

test("a root canal page finds the student's root canal notes post", async () => {
  const p = (await topicPage("root-canal", null))!;
  assert.ok(p.posts.some((x) => /root canal/i.test(x.title)));
});
