import assert from "node:assert/strict";
import { test } from "node:test";
import { addReference, createResearch, DRAFT_LABEL, draftStep, refusal, researchMarkdown, STEPS, toggleReference } from "./research.ts";

const NOW = Date.parse("2026-11-15T11:00:00+05:30");
const pico = { p: "children aged 6–12", i: "fluoride varnish every 6 months", c: "no varnish", o: "new caries over 2 years" };

test("asking it to make up results, references or ethics approval is refused", async () => {
  const r = await createResearch("r1", "Fluoride varnish in schoolchildren", NOW);
  for (const ask of ["Write the results section", "Give me 10 references on fluoride varnish", "What's our ethics approval number?", "Make up some data for the pilot"]) {
    assert.ok(refusal(ask), ask);
    await assert.rejects(draftStep("r1", r.id, "methods", ask, NOW), /Scholar won't make up results, data, ethics approvals or references/);
  }
});

test("a draft is labelled as a draft, and keeps the old one", async () => {
  const r = await createResearch("r2", "Fluoride varnish in schoolchildren", NOW, pico);
  const d = await draftStep("r2", r.id, "methods", "Draft the methodology", NOW);
  assert.ok(d.data.drafts.methods!.startsWith(DRAFT_LABEL));
  assert.equal(DRAFT_LABEL, "Draft. Not completed research or original findings.");
  const again = await draftStep("r2", r.id, "methods", "", NOW);
  assert.equal(again.versions.length, 2);
});

test("the question draft uses the student's PICO", async () => {
  const r = await createResearch("r3", "Fluoride varnish", NOW, pico);
  const d = await draftStep("r3", r.id, "question", "", NOW);
  for (const v of Object.values(pico)) assert.ok(d.data.drafts.question!.includes(v), v);
});

test("no draft for any step looks like it cites a real study", async () => {
  const r = await createResearch("r4", "Fluoride varnish", NOW, pico);
  for (const s of STEPS) {
    const d = await draftStep("r4", r.id, s.id, "", NOW);
    assert.doesNotMatch(d.data.drafts[s.id]!, /\b(19|20)\d{2}\b.*et al|doi:|et al\./i, s.id);
  }
});

test("export marks references the student hasn't checked, and discloses AI help", async () => {
  const r = await createResearch("r5", "Fluoride varnish", NOW, pico);
  let it = await addReference("r5", r.id, "A paper I found on varnish");
  it = await addReference("r5", r.id, "A guideline from my department");
  it = await toggleReference("r5", r.id, it.data.references[1].id);
  const md = researchMarkdown(it);
  assert.match(md, /A paper I found on varnish \(not checked\)/);
  assert.doesNotMatch(md, /A guideline from my department \(not checked\)/);
  assert.match(md, /Prepared with AI assistance \(FMD Scholar\)/);
});
