import assert from "node:assert/strict";
import { test } from "node:test";
import { createDeck, deckMarkdown, deckPdf, editSlide, generateDeck, outline, regenerate, slideTarget, unverifiedCount, type DeckConfig } from "./decks.ts";

const NOW = Date.parse("2026-11-15T11:00:00+05:30");
const cfg: DeckConfig = { topic: "Irreversible pulpitis", format: "journal_club", audience: "ug", minutes: 15, slides: null, style: "plain", citations: true, notes: true, file_ids: [] };

test("a 15-minute journal club is 12 slides over 8 sections", () => {
  assert.equal(slideTarget(cfg), 12);
  const o = outline(cfg);
  assert.equal(o.length, 8);
  assert.equal(o[0].title, "Title");
  assert.equal(o.at(-1)!.title, "Questions");
  assert.equal(o.reduce((n, s) => n + s.slides, 0), 12);
  assert.ok(o.every((s) => s.slides >= 1));
});

test("a slide count overrides the duration", () => {
  assert.equal(slideTarget({ ...cfg, slides: 20 }), 20);
  assert.equal(outline({ ...cfg, slides: 20 }).reduce((n, s) => n + s.slides, 0), 20);
});

test("the outline comes first; generating builds the slides", async () => {
  const d = await createDeck("k1", cfg, null, NOW);
  assert.equal(d.data.slides.length, 0);
  const g = await generateDeck("k1", d.id, NOW);
  assert.equal(g.data.slides.length, 12);
});

test("unknown parts of a paper say so instead of being made up", async () => {
  const g = await generateDeck("k3", (await createDeck("k3", cfg, null, NOW)).id, NOW);
  const results = g.data.slides.filter((s) => g.data.sections.find((x) => x.id === s.section_id)!.title === "Results");
  assert.ok(results.length > 0);
  for (const s of results) assert.ok(s.bullets.some((b) => /Not stated in your sources/.test(b)));
});

test("regenerating one slide changes only that slide", async () => {
  const g = await generateDeck("k4", (await createDeck("k4", cfg, null, NOW)).id, NOW);
  const target = g.data.slides[2];
  const r = await regenerate("k4", g.id, "slide", target.id, false, NOW);
  r.data.slides.forEach((s, i) => {
    if (s.id !== target.id) assert.deepEqual(s, g.data.slides[i]);
  });
  assert.equal(r.versions.length, 1, "the previous deck is kept as a version");
});

test("regenerating the deck keeps edited slides unless asked to replace them", async () => {
  const g = await generateDeck("k5", (await createDeck("k5", cfg, null, NOW)).id, NOW);
  const s1 = g.data.slides[1];
  await editSlide("k5", g.id, s1.id, { title: "My own title" });
  const kept = await regenerate("k5", g.id, "deck", null, false, NOW);
  assert.equal(kept.data.slides.find((s) => s.id === s1.id)!.title, "My own title");
  const replaced = await regenerate("k5", g.id, "deck", null, true, NOW);
  assert.notEqual(replaced.data.slides.find((s) => s.id === s1.id)!.title, "My own title");
});

test("exports carry every slide, the unverified sources and the AI disclosure", async () => {
  const g = await generateDeck("k6", (await createDeck("k6", cfg, null, NOW)).id, NOW);
  const md = deckMarkdown(g);
  for (const s of g.data.slides) assert.ok(md.includes(s.title));
  assert.match(md, /Prepared with AI assistance \(FMD Scholar\)/);
  assert.ok(unverifiedCount(g.data) > 0);
  assert.match(md, /Unverified · check this source/);
  const pdf = await deckPdf(g).text();
  assert.match(pdf, /\/Count [2-9]/, "a long handout spans several pages");
});

test("with citations off, no slide lists sources", async () => {
  const g = await generateDeck("k7", (await createDeck("k7", { ...cfg, citations: false }, null, NOW)).id, NOW);
  assert.ok(g.data.slides.every((s) => s.sources.length === 0));
});

test("a topic the demo has no material on is refused, saying what it can do", async () => {
  const d = await createDeck("k8", { ...cfg, topic: "Quantum gravity" }, null, NOW);
  await assert.rejects(generateDeck("k8", d.id, NOW), /The demo can build presentations about/);
});
